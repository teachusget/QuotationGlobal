<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdviceMessage;
use App\Models\AdviceRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdviceRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = AdviceRequest::with('buyer:id,name,email')->latest();
        if ($request->user()->account_type === 'buyer') $query->where('buyer_id', $request->user()->id);
        else abort_if(in_array($request->user()->account_type, ['vendor'], true), 403);
        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->account_type === 'buyer', 403, 'Only buyers can request free advice.');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'], 'email' => ['required', 'email', 'max:190'],
            'phone' => ['required', 'string', 'max:40'], 'employees' => ['required', 'integer', 'min:1', 'max:10000000'],
            'preferred_meeting_at' => ['nullable', 'date', 'after:now'], 'requirements' => ['nullable', 'string', 'max:3000'],
            'country' => ['required', 'string', 'max:100'], 'city' => ['required', 'string', 'max:100'],
            'attachment' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,webp'],
        ]);
        $existing = AdviceRequest::where('buyer_id', $request->user()->id)->whereIn('status', ['pending', 'scheduled'])->latest()->first();
        if ($existing) {
            return response()->json(['message' => 'Your advice request has already been submitted. We will contact you shortly.', 'data' => $existing], 200);
        }
        $attachment = $request->file('attachment'); unset($data['attachment']);
        if ($attachment) $data = [...$data, 'attachment_name' => $attachment->getClientOriginalName(), 'attachment_path' => $attachment->store('advice-attachments'), 'attachment_mime' => $attachment->getMimeType(), 'attachment_size' => $attachment->getSize()];
        $row = AdviceRequest::create([...$data, 'buyer_id' => $request->user()->id]);
        $this->sendEmail($row, 'New free advice request', "{$row->name} has requested a free advice meeting. Please sign in to schedule a time.", config('mail.from.address'), config('mail.from.name'));
        return response()->json(['message' => 'Your free advice request was sent to the admin.', 'data' => $row], 201);
    }

    public function downloadAttachment(Request $request, AdviceRequest $adviceRequest)
    {
        $this->authorizeParticipant($request, $adviceRequest);
        abort_unless($adviceRequest->attachment_path && Storage::disk('local')->exists($adviceRequest->attachment_path), 404);
        return Storage::disk('local')->download($adviceRequest->attachment_path, $adviceRequest->attachment_name);
    }

    public function update(Request $request, AdviceRequest $adviceRequest)
    {
        abort_unless($request->user()->account_type !== 'buyer' && $request->user()->account_type !== 'vendor', 403);
        $data = $request->validate(['status' => ['required', Rule::in(['scheduled', 'cancelled'])], 'meeting_at' => ['required_if:status,scheduled', 'nullable', 'date', 'after:now']]);
        if ($data['status'] === 'scheduled') {
            $link = $adviceRequest->meeting_link ?: 'https://meet.jit.si/QuotationPK-Advice-'.$adviceRequest->id.'-'.Str::lower(Str::random(20));
            DB::transaction(function () use ($adviceRequest, $data, $link) {
                $adviceRequest->update(['status' => 'scheduled', 'meeting_at' => $data['meeting_at'], 'meeting_link' => $link, 'chat_enabled' => true]);
                AdviceMessage::create(['advice_request_id' => $adviceRequest->id, 'user_id' => null, 'message' => 'Your free advice meeting is scheduled for '.$adviceRequest->meeting_at->format('d M Y, h:i A').' (PKT). Join: '.$link, 'is_system' => true, 'admin_read_at' => now()]);
            });
            $adviceRequest->load('buyer:id,name,email');
            $this->sendEmail($adviceRequest, 'Your free advice meeting is scheduled', "Your meeting is scheduled for {$adviceRequest->meeting_at->format('d M Y, h:i A')} (PKT). Join: {$link}", $adviceRequest->buyer->email, $adviceRequest->buyer->name);
            $this->sendEmail($adviceRequest, 'Free advice meeting booked', "Meeting booked with {$adviceRequest->name} for {$adviceRequest->meeting_at->format('d M Y, h:i A')} (PKT). Join: {$link}", config('mail.from.address'), config('mail.from.name'));
        } else $adviceRequest->update(['status' => 'cancelled', 'chat_enabled' => false]);
        return response()->json(['message' => 'Advice request updated.', 'data' => $adviceRequest->fresh('buyer:id,name,email')]);
    }

    public function messages(Request $request, AdviceRequest $adviceRequest)
    {
        $this->authorizeParticipant($request, $adviceRequest);
        abort_unless($adviceRequest->chat_enabled, 403, 'Chat becomes available after the meeting is booked.');
        $column = $request->user()->account_type === 'buyer' ? 'buyer_read_at' : 'admin_read_at';
        $adviceRequest->messages()->whereNull($column)->update([$column => now()]);
        return response()->json(['data' => $adviceRequest->messages()->with('user:id,name,account_type')->oldest()->get()]);
    }

    public function sendMessage(Request $request, AdviceRequest $adviceRequest)
    {
        $this->authorizeParticipant($request, $adviceRequest);
        abort_unless($adviceRequest->chat_enabled, 403, 'Chat becomes available after the meeting is booked.');
        $data = $request->validate(['message' => ['required', 'string', 'max:2000']]);
        $message = $adviceRequest->messages()->create(['user_id' => $request->user()->id, 'message' => trim($data['message']), 'buyer_read_at' => $request->user()->account_type === 'buyer' ? now() : null, 'admin_read_at' => $request->user()->account_type === 'buyer' ? null : now()]);
        return response()->json(['data' => $message->load('user:id,name,account_type')], 201);
    }

    private function authorizeParticipant(Request $request, AdviceRequest $row): void
    {
        abort_if($request->user()->account_type === 'vendor', 403);
        abort_unless($request->user()->account_type !== 'buyer' || $row->buyer_id === $request->user()->id, 403);
    }

    private function sendEmail(AdviceRequest $row, string $subject, string $body, ?string $email, ?string $name): void
    {
        if (! $email) return;
        try { Mail::raw("Hello {$name},\n\n{$body}\n\nQuotation PK", fn ($mail) => $mail->to($email, $name)->subject($subject)); }
        catch (\Throwable $e) { Log::error('Advice email failed.', ['advice_request_id' => $row->id, 'error' => $e->getMessage()]); }
    }
}
