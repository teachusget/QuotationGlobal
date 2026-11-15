<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceConversation;
use App\Models\MarketplaceMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class MarketplaceChatController extends Controller
{
    public function conversations(Request $request)
    {
        $user = $request->user();
        $rows = MarketplaceConversation::query()
            ->where(fn ($query) => $query->where('buyer_id', $user->id)->orWhere('vendor_id', $user->id))
            ->with(['buyer:id,name,phone,account_type', 'vendor:id,name,company_name,phone,account_type', 'service:id,name'])
            ->withCount(['messages as unread_count' => fn ($query) => $query->whereNull('read_at')->where('user_id', '!=', $user->id)])
            ->orderByDesc('last_message_at')->orderByDesc('id')->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'recipient_id' => ['nullable', 'integer', 'exists:users,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'support' => ['nullable', 'boolean'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);
        $user = $request->user();
        if (!empty($data['support'])) {
            $data['recipient_id'] = User::query()->whereIn('account_type', ['staff', 'admin'])->where('is_blocked', false)->orderBy('id')->value('id');
            abort_unless($data['recipient_id'], 503, 'Marketplace support is temporarily unavailable.');
        }
        abort_unless($data['recipient_id'], 422, 'Choose a chat recipient.');
        $recipient = User::findOrFail($data['recipient_id']);
        abort_if($recipient->id === $user->id, 422, 'You cannot start a chat with yourself.');
        abort_if($recipient->is_blocked, 422, 'This account is not available for chat.');

        [$buyerId, $vendorId] = $user->account_type === 'buyer'
            ? [$user->id, $recipient->id]
            : [$recipient->id, $user->id];
        $conversation = MarketplaceConversation::firstOrCreate(
            ['buyer_id' => $buyerId, 'vendor_id' => $vendorId, 'service_id' => $data['service_id'] ?? null],
            ['last_message_at' => now()]
        );

        if (!empty(trim($data['message'] ?? ''))) $this->createMessage($conversation, $user, trim($data['message']));
        return response()->json(['data' => $conversation->load(['buyer:id,name,phone,account_type', 'vendor:id,name,company_name,phone,account_type', 'service:id,name'])], 201);
    }

    public function messages(Request $request, MarketplaceConversation $conversation)
    {
        $this->authorizeConversation($request, $conversation);
        $unreadIds = $conversation->messages()->where('user_id', '!=', $request->user()->id)->whereNull('read_at')->pluck('id')->all();
        $conversation->messages()->where('user_id', '!=', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);
        $rows = $conversation->messages()->with('user:id,name,account_type')->oldest()->get();
        $rows->each(function ($row) use ($unreadIds) {
            $row->is_unread = in_array($row->id, $unreadIds, true);
            if ($row->is_unread) $row->read_at = null;
            $row->attachment_url = $row->attachment_path ? URL::temporarySignedRoute('marketplace-chat.attachment', now()->addMinutes(10), ['message' => $row->id, 'inline' => 1]) : null;
        });
        return response()->json(['data' => $rows]);
    }

    public function sendMessage(Request $request, MarketplaceConversation $conversation)
    {
        $this->authorizeConversation($request, $conversation);
        $data = $request->validate(['message' => ['nullable', 'string', 'max:2000'], 'attachment' => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,mp3,wav,mp4,mov,webm']]);
        abort_unless(trim($data['message'] ?? '') !== '' || $request->hasFile('attachment'), 422, 'Write a message or attach a file.');
        $message = $this->createMessage($conversation, $request->user(), trim($data['message'] ?? ''), false, $request->file('attachment'));
        $autoReply = $request->hasFile('attachment') ? null : $this->autoReply($conversation, $data['message'] ?? '');
        if ($autoReply) $this->createMessage($conversation, null, $autoReply, true);
        return response()->json(['data' => $message->load('user:id,name,account_type'), 'auto_reply' => $autoReply], 201);
    }

    public function attachment(Request $request, MarketplaceMessage $message)
    {
        if ($request->user()) $this->authorizeConversation($request, $message->conversation);
        else abort_unless(URL::hasValidSignature($request), 401, 'Attachment link expired.');
        abort_unless($message->attachment_path, 404);
        $path = Storage::disk('public')->path($message->attachment_path);
        abort_unless(is_file($path), 404);
        if ($request->boolean('inline') || str_starts_with((string) $message->attachment_mime, 'image/')) return response()->file($path, ['Content-Type' => $message->attachment_mime ?: 'application/octet-stream', 'Content-Disposition' => 'inline', 'Cache-Control' => 'private, max-age=300']);
        return Storage::disk('public')->download($message->attachment_path, $message->attachment_name ?: 'chat-attachment');
    }

    private function createMessage(MarketplaceConversation $conversation, ?User $user, string $message, bool $isAuto = false, $attachment = null): MarketplaceMessage
    {
        $path = $attachment?->store('marketplace/chat', 'public');
        $row = $conversation->messages()->create(['user_id' => $user?->id, 'message' => $message, 'is_auto' => $isAuto, 'read_at' => $isAuto ? now() : null, 'attachment_path' => $path, 'attachment_name' => $attachment?->getClientOriginalName(), 'attachment_mime' => $attachment?->getMimeType(), 'attachment_size' => $attachment?->getSize()]);
        $conversation->update(['last_message_at' => now()]);
        return $row;
    }

    private function authorizeConversation(Request $request, MarketplaceConversation $conversation): void
    {
        abort_unless(in_array($request->user()->id, [$conversation->buyer_id, $conversation->vendor_id], true), 403);
    }

    private function autoReply(MarketplaceConversation $conversation, string $message): ?string
    {
        $text = strtolower($message);
        if (str_contains($text, 'price') || str_contains($text, 'quote') || str_contains($text, 'quotation')) return 'Thanks for your question. You can also use “Get Quote” on this service page for a formal quotation.';
        if (str_contains($text, 'hello') || str_contains($text, 'hi') || str_contains($text, 'salam')) return 'Hello! Thanks for reaching out. Please share the details you need and the other participant will reply here.';
        if (str_contains($text, 'help') || str_contains($text, 'support')) return 'You can discuss requirements, pricing, delivery and support here. For a formal request, use the Quote or Demo button on the service page.';
        return null;
    }
}
