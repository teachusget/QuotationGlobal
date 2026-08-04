<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DemoRequest;
use App\Models\DemoMessage;
use App\Models\Service;
use App\Models\Vendor;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DemoRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = DemoRequest::with(['service:id,name,billing_cycle', 'vendor:id,user_id,company_name,name', 'user:id,name,email'])->where('request_type', 'demo')->latest();

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            $query->where('vendor_id', $vendor->id);
        } elseif ($request->user()->account_type === 'buyer') {
            $query->where('user_id', $request->user()->id);
        }

        $requests = $query->get();
        $readColumn = $request->user()->account_type === 'vendor'
            ? 'vendor_read_at'
            : ($request->user()->account_type === 'buyer' ? 'buyer_read_at' : 'admin_read_at');
        $requests->each(function ($demoRequest) use ($readColumn) {
            $demoRequest->unread_count = $demoRequest->messages()->whereNull($readColumn)->count();
            $demoRequest->status_unread = in_array($demoRequest->status, ['accepted', 'rejected'], true)
                && is_null($demoRequest->buyer_notification_read_at);
        });

        return response()->json(['data' => $requests]);
    }

    public function quoteIndex(Request $request)
    {
        $query = DemoRequest::with([
            'service:id,vendor_id,name,billing_cycle,pricing_mode,price_from,monthly_price,discount_percent',
            'vendor:id,user_id,company_name,name,email,phone',
            'user:id,name,email',
            'purchaseOrder',
        ])->where('request_type', 'quote')->latest();

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            $query->where('vendor_id', $vendor->id);
        } elseif ($request->user()->account_type === 'buyer') {
            $query->where('user_id', $request->user()->id);
        }

        $requests = $query->get();
        $requests->each(fn ($item) => $item->status_unread = in_array($item->status, ['quoted', 'quote_accepted', 'quote_declined'], true) && is_null($item->buyer_notification_read_at));
        return response()->json(['data' => $requests]);
    }

    public function sendQuote(Request $request, DemoRequest $demoRequest)
    {
        abort_unless($request->user()->account_type === 'vendor', 403, 'Only the assigned vendor can send a quote.');
        $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
        abort_unless($demoRequest->request_type === 'quote' && $demoRequest->vendor_id === $vendor->id, 403);
        $data = $request->validate([
            'quoted_price' => ['required', 'numeric', 'min:0.01', 'max:999999999999.99'],
            'quote_message' => ['required', 'string', 'min:10', 'max:2000'],
            'quote_terms' => ['nullable', 'string', 'max:3000'],
            'quote_data' => ['nullable', 'array'],
            'quote_data.quotation_no' => ['nullable', 'string', 'max:50'],
            'quote_data.quotation_date' => ['nullable', 'date'],
            'quote_data.business_name' => ['nullable', 'string', 'max:150'],
            'quote_data.client_name' => ['nullable', 'string', 'max:150'],
            'quote_data.currency' => ['nullable', Rule::in(['PKR'])],
            'quote_data.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'quote_data.subtotal' => ['nullable', 'numeric', 'min:0'],
            'quote_data.tax_total' => ['nullable', 'numeric', 'min:0'],
            'quote_data.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'quote_data.items' => ['nullable', 'array', 'max:100'],
            'quote_data.items.*.name' => ['required_with:quote_data.items', 'string', 'max:200'],
            'quote_data.items.*.description' => ['nullable', 'string', 'max:1000'],
            'quote_data.items.*.quantity' => ['required_with:quote_data.items', 'numeric', 'min:0.01'],
            'quote_data.items.*.rate' => ['required_with:quote_data.items', 'numeric', 'min:0'],
            'quote_data.items.*.tax' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'quote_data.items.*.amount' => ['required_with:quote_data.items', 'numeric', 'min:0'],
            'quote_data.items.*.total' => ['required_with:quote_data.items', 'numeric', 'min:0'],
            'quote_valid_until' => ['required', 'date', 'after_or_equal:today'],
        ]);
        $demoRequest->update([
            ...$data,
            'status' => 'quoted',
            'quoted_at' => now(),
            'buyer_quote_response_at' => null,
            'buyer_notification_read_at' => null,
        ]);

        return response()->json(['message' => 'Quote sent to the customer.', 'data' => $demoRequest->fresh()]);
    }

    public function respondToQuote(Request $request, DemoRequest $demoRequest)
    {
        abort_unless($request->user()->account_type === 'buyer' && $demoRequest->request_type === 'quote' && $demoRequest->user_id === $request->user()->id, 403);
        abort_unless($demoRequest->status === 'quoted', 422, 'This quote is no longer awaiting a response.');
        abort_if($demoRequest->quote_valid_until?->isPast(), 422, 'This quote has expired.');
        $data = $request->validate(['decision' => ['required', Rule::in(['accept', 'decline'])]]);
        DB::transaction(function () use ($demoRequest, $data) {
            $accepted = $data['decision'] === 'accept';
            $demoRequest->update(['status' => $accepted ? 'quote_accepted' : 'quote_declined', 'buyer_quote_response_at' => now(), 'buyer_notification_read_at' => now()]);
            if ($accepted) {
                DemoRequest::where('request_type', 'quote')->where('user_id', $demoRequest->user_id)->whereKeyNot($demoRequest->id)->whereIn('status', ['pending', 'quoted'])->update(['status' => 'quote_declined', 'buyer_quote_response_at' => now(), 'buyer_notification_read_at' => now()]);
            }
        });

        return response()->json(['message' => $data['decision'] === 'accept' ? 'Quote accepted. All other open quotes were declined.' : 'Quote declined.', 'data' => $demoRequest->fresh('purchaseOrder')]);
    }

    public function generatePurchaseOrder(Request $request, DemoRequest $demoRequest)
    {
        abort_unless($request->user()->account_type === 'buyer' && $demoRequest->request_type === 'quote' && $demoRequest->user_id === $request->user()->id, 403);
        abort_unless($demoRequest->status === 'quote_accepted', 422, 'Accept this quote before generating a purchase order.');
        $demoRequest->load(['service:id,name,billing_cycle', 'vendor:id,company_name,name,email,phone,address,city,country', 'user:id,name,email']);
        $quoteData = $demoRequest->quote_data ?? [];
        $po = PurchaseOrder::firstOrCreate(['demo_request_id' => $demoRequest->id], [
            'po_number' => 'PO-'.now()->format('Ymd').'-'.str_pad((string) $demoRequest->id, 5, '0', STR_PAD_LEFT),
            'user_id' => $demoRequest->user_id, 'vendor_id' => $demoRequest->vendor_id, 'total_amount' => $demoRequest->quoted_price,
            'currency' => $quoteData['currency'] ?? 'PKR', 'status' => 'draft', 'issued_at' => now(),
            'order_data' => [
                'quote_number' => $quoteData['quotation_no'] ?? 'Q-'.str_pad((string) $demoRequest->id, 5, '0', STR_PAD_LEFT),
                'service_name' => $demoRequest->service->name,
                'buyer' => ['name' => $demoRequest->user->name, 'email' => $demoRequest->user->email],
                'vendor' => ['name' => $demoRequest->vendor->company_name ?: $demoRequest->vendor->name, 'email' => $demoRequest->vendor->email, 'phone' => $demoRequest->vendor->phone, 'address' => trim(implode(', ', array_filter([$demoRequest->vendor->address, $demoRequest->vendor->city, $demoRequest->vendor->country])))],
                'items' => $quoteData['items'] ?? [], 'subtotal' => $quoteData['subtotal'] ?? $demoRequest->quoted_price,
                'tax_total' => $quoteData['tax_total'] ?? 0, 'discount_amount' => $quoteData['discount_amount'] ?? 0,
                'notes' => $demoRequest->quote_message, 'terms' => $demoRequest->quote_terms,
            ],
        ]);
        return response()->json(['message' => 'Purchase order draft generated. Review it before sending.', 'data' => $po], 201);
    }

    public function sendPurchaseOrder(Request $request, DemoRequest $demoRequest)
    {
        abort_unless($request->user()->account_type === 'buyer' && $demoRequest->user_id === $request->user()->id, 403);
        abort_unless($demoRequest->status === 'quote_accepted', 422, 'This quote is not accepted.');
        $po = $demoRequest->purchaseOrder()->firstOrFail();
        if ($po->status !== 'sent') $po->update(['status' => 'sent', 'sent_at' => now()]);
        return response()->json(['message' => 'Purchase order sent to the Solution Provider.', 'data' => $po->fresh()]);
    }

    public function purchaseOrdersIndex(Request $request)
    {
        $query = PurchaseOrder::with(['quoteRequest.service:id,name', 'quoteRequest.user:id,name,email', 'vendor:id,company_name,name,email'])->latest('sent_at');
        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            $query->where('vendor_id', $vendor->id)->where('status', 'sent');
        } elseif ($request->user()->account_type === 'buyer') {
            $query->where('user_id', $request->user()->id);
        }
        return response()->json(['data' => $query->get()]);
    }

    public function assignPurchaseOrderVendor(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate(['vendor_id' => ['required', Rule::exists('vendors', 'id')->where('status', 'approved')]]);
        $vendor = Vendor::findOrFail($data['vendor_id']);
        $snapshot = $purchaseOrder->order_data;
        $snapshot['vendor'] = ['name' => $vendor->company_name ?: $vendor->name, 'email' => $vendor->email, 'phone' => $vendor->phone, 'address' => trim(implode(', ', array_filter([$vendor->address, $vendor->city, $vendor->country])))];
        $purchaseOrder->update(['vendor_id' => $vendor->id, 'order_data' => $snapshot]);
        return response()->json(['message' => 'Purchase order assigned to '.$snapshot['vendor']['name'].'.', 'data' => $purchaseOrder->fresh(['quoteRequest.service:id,name', 'quoteRequest.user:id,name,email', 'vendor:id,company_name,name,email'])]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'request_type' => ['required', Rule::in(['demo', 'quote'])],
            'demo_at' => ['nullable', 'date', 'after:now', 'required_if:request_type,demo'],
            'quote_purpose' => ['nullable', 'required_if:request_type,quote', 'string', 'min:10', 'max:1500'],
            'expected_users' => ['nullable', 'required_if:request_type,quote', 'integer', 'min:1', 'max:1000000'],
        ]);
        $service = Service::findOrFail($data['service_id']);
        $requestRow = DemoRequest::updateOrCreate([
            'service_id' => $service->id,
            'user_id' => $request->user()->id,
            'request_type' => $data['request_type'],
        ], ['vendor_id' => $service->vendor_id, 'demo_at' => $data['demo_at'] ?? null, 'quote_purpose' => $data['quote_purpose'] ?? null, 'expected_users' => $data['expected_users'] ?? null, 'status' => 'pending']);

        return response()->json(['message' => $data['request_type'] === 'demo' ? 'Demo request sent to the Solution Provider.' : 'Quote request sent successfully.', 'data' => $requestRow], $requestRow->wasRecentlyCreated ? 201 : 200);
    }

    public function update(Request $request, DemoRequest $demoRequest)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['accepted', 'rejected'])],
            'rejection_reason' => ['nullable', 'required_if:status,rejected', 'string', 'min:5', 'max:1000'],
        ]);

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($demoRequest->vendor_id === $vendor->id, 403, 'You can only update requests for your own products.');
        }

        if ($data['status'] === 'accepted' && $demoRequest->status !== 'accepted') {
            $meetingLink = 'https://meet.jit.si/QuotationPK-Demo-'.$demoRequest->id.'-'.Str::lower(Str::random(32));
            $demoRequest->update(['status' => 'accepted', 'meeting_link' => $meetingLink, 'rejection_reason' => null, 'buyer_notification_read_at' => null]);
            DemoMessage::create([
                'demo_request_id' => $demoRequest->id,
                'message' => 'Your demo request has been accepted. Meeting time: '.$demoRequest->demo_at->format('d M Y, h:i A').'. Join online meeting: '.$meetingLink,
                'is_system' => true,
                'vendor_read_at' => now(),
            ]);
            $demoRequest->load(['service', 'vendor', 'user']);
            try {
                Mail::send('emails.demo-accepted', ['demoRequest' => $demoRequest], function ($message) use ($demoRequest) {
                    $message->to($demoRequest->user->email, $demoRequest->user->name)
                        ->subject('Your demo meeting has been accepted');
                });
            } catch (\Throwable $exception) {
                Log::error('Demo acceptance email failed.', ['demo_request_id' => $demoRequest->id, 'error' => $exception->getMessage()]);
            }
        } else {
            $demoRequest->update([
                'status' => $data['status'],
                'rejection_reason' => $data['status'] === 'rejected' ? trim($data['rejection_reason']) : null,
                'buyer_notification_read_at' => null,
            ]);
        }

        return response()->json(['message' => 'Demo request '.$data['status'].'.', 'data' => $demoRequest->fresh()]);
    }

    public function markBuyerNotificationsRead(Request $request)
    {
        abort_unless($request->user()->account_type === 'buyer', 403);
        DemoRequest::where('user_id', $request->user()->id)
            ->whereIn('status', ['accepted', 'rejected', 'quoted'])
            ->whereNull('buyer_notification_read_at')
            ->update(['buyer_notification_read_at' => now()]);

        return response()->json(['message' => 'Notifications marked as read.']);
    }

    public function messages(Request $request, DemoRequest $demoRequest)
    {
        $this->authorizeParticipant($request, $demoRequest);
        abort_unless($demoRequest->status === 'accepted', 403, 'Chat becomes available after the demo request is accepted.');

        $readColumn = $request->user()->account_type === 'vendor'
            ? 'vendor_read_at'
            : ($request->user()->account_type === 'buyer' ? 'buyer_read_at' : 'admin_read_at');
        $demoRequest->messages()->whereNull($readColumn)->update([$readColumn => now()]);

        return response()->json(['data' => $demoRequest->messages()->with('user:id,name,account_type')->oldest()->get()]);
    }

    public function sendMessage(Request $request, DemoRequest $demoRequest)
    {
        $this->authorizeParticipant($request, $demoRequest);
        abort_unless($demoRequest->status === 'accepted', 403, 'Chat becomes available after the demo request is accepted.');
        abort_if(
            in_array($request->user()->account_type, ['vendor', 'buyer'], true)
                && ($request->user()->account_type === 'vendor' ? $demoRequest->vendor_chat_blocked : $demoRequest->buyer_chat_blocked),
            403,
            'Your messaging access for this conversation has been stopped by an administrator.'
        );
        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:2000', 'required_without:attachment_data'],
            'attachment_type' => ['nullable', Rule::in(['image', 'audio']), 'required_with:attachment_data'],
            'attachment_name' => ['nullable', 'string', 'max:255'],
            'attachment_data' => [
                'nullable',
                'string',
                'max:6000000',
                'required_with:attachment_type',
                function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                    $pattern = $request->input('attachment_type') === 'image'
                        ? '#^data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$#'
                        : '#^data:audio/(?:webm|ogg|mpeg|mp4|wav|x-wav);(?:codecs=[^;,]+;)?base64,[A-Za-z0-9+/=\r\n]+$#';
                    if (! preg_match($pattern, $value)) {
                        $fail('The attachment format is invalid.');
                    }
                },
            ],
        ]);
        $message = $demoRequest->messages()->create([
            'user_id' => $request->user()->id,
            'message' => trim($data['message'] ?? ''),
            'attachment_type' => $data['attachment_type'] ?? null,
            'attachment_name' => $data['attachment_name'] ?? null,
            'attachment_data' => $data['attachment_data'] ?? null,
            ...($request->user()->account_type === 'vendor'
                ? ['vendor_read_at' => now()]
                : ($request->user()->account_type === 'buyer' ? ['buyer_read_at' => now()] : ['admin_read_at' => now()])),
        ]);

        return response()->json(['data' => $message->load('user:id,name,account_type')], 201);
    }

    public function moderate(Request $request, DemoRequest $demoRequest)
    {
        $data = $request->validate([
            'participant' => ['required', Rule::in(['buyer', 'vendor'])],
            'blocked' => ['required', 'boolean'],
        ]);
        $column = $data['participant'].'_chat_blocked';
        $demoRequest->update([$column => $data['blocked']]);

        return response()->json([
            'message' => ucfirst($data['participant']).' messaging has been '.($data['blocked'] ? 'stopped.' : 'restored.'),
            'data' => $demoRequest->fresh(),
        ]);
    }

    private function authorizeParticipant(Request $request, DemoRequest $demoRequest): void
    {
        if (! in_array($request->user()->account_type, ['vendor', 'buyer'], true)) {
            return;
        }

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($demoRequest->vendor_id === $vendor->id, 403);
            return;
        }

        abort_unless($demoRequest->user_id === $request->user()->id, 403);
    }
}
