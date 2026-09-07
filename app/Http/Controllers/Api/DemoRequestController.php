<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DemoRequest;
use App\Models\DemoMessage;
use App\Models\Service;
use App\Models\Vendor;
use App\Models\PurchaseOrder;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
        } else {
            $this->scopeAssignedVendors($request, $query);
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
            'vendor:id,user_id,company_name,name,email,phone,address,city,country',
            'user:id,name,email',
            'purchaseOrder',
            'quoteSender:id,name,email,account_type',
        ])->where('request_type', 'quote')->latest();

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            $query->where('vendor_id', $vendor->id);
        } elseif ($request->user()->account_type === 'buyer') {
            $query->where('user_id', $request->user()->id);
        } else {
            $this->scopeAssignedVendors($request, $query);
        }

        if ($request->boolean('quotation_only')) {
            return $this->paginatedQuotations($request, $query);
        }

        $requests = $query->get();
        $requests->each(fn ($item) => $item->status_unread = in_array($item->status, ['quoted', 'quote_accepted', 'quote_declined'], true) && is_null($item->buyer_notification_read_at));
        return response()->json(['data' => $requests]);
    }

    private function paginatedQuotations(Request $request, $query)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['quoted', 'quote_accepted', 'quote_declined', 'expired'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'amount_high', 'amount_low', 'expiry'])],
            'per_page' => ['nullable', 'integer', Rule::in([25, 50, 100])],
        ]);
        $query->whereNotNull('quoted_at')
            ->when($filters['search'] ?? null, function ($builder, $search) {
                $builder->where(function ($searchQuery) use ($search) {
                    $searchQuery->where('id', $search)
                        ->orWhereHas('service', fn ($service) => $service->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('user', fn ($buyer) => $buyer->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('vendor', fn ($vendor) => $vendor->where('company_name', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
                });
            })
            ->when($filters['date_from'] ?? null, fn ($builder, $date) => $builder->whereDate('quoted_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($builder, $date) => $builder->whereDate('quoted_at', '<=', $date));

        $scoped = clone $query;
        $counts = [
            'total' => (clone $scoped)->count(),
            'awaiting' => (clone $scoped)->where('status', 'quoted')->whereDate('quote_valid_until', '>=', today())->count(),
            'accepted' => (clone $scoped)->where('status', 'quote_accepted')->count(),
            'declined' => (clone $scoped)->where('status', 'quote_declined')->count(),
            'expired' => (clone $scoped)->where('status', 'quoted')->whereDate('quote_valid_until', '<', today())->count(),
        ];
        $query->when(($filters['status'] ?? null) === 'expired', fn ($builder) => $builder->where('status', 'quoted')->whereDate('quote_valid_until', '<', today()))
            ->when(($filters['status'] ?? null) && $filters['status'] !== 'expired', fn ($builder) => $builder->where('status', $filters['status']));
        match ($filters['sort'] ?? 'newest') {
            'oldest' => $query->reorder('quoted_at'),
            'amount_high' => $query->reorder('quoted_price', 'desc'),
            'amount_low' => $query->reorder('quoted_price'),
            'expiry' => $query->reorder('quote_valid_until'),
            default => $query->reorder('quoted_at', 'desc'),
        };
        $paginator = $query->paginate($filters['per_page'] ?? 25)->withQueryString();
        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(), 'total' => $paginator->total(),
                'from' => $paginator->firstItem(), 'to' => $paginator->lastItem(), 'counts' => $counts,
            ],
        ]);
    }

    public function sendQuote(Request $request, DemoRequest $demoRequest)
    {
        abort_unless($request->user()->account_type === 'vendor', 403, 'Only the assigned vendor can send a quote.');
        $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
        abort_unless($demoRequest->request_type === 'quote' && $demoRequest->vendor_id === $vendor->id, 403);
        if (! trim((string) $vendor->address) || ! trim((string) $vendor->city) || ! trim((string) $vendor->country)) {
            throw ValidationException::withMessages([
                'vendor_address' => ['Complete your business address, city and country in My Service Profile before sending a quotation.'],
            ]);
        }
        $data = $request->validate([
            'quoted_price' => ['required', 'numeric', 'min:0.01', 'max:999999999999.99'],
            'quote_message' => ['required', 'string', 'min:10', 'max:2000'],
            'quote_terms' => ['nullable', 'string', 'max:3000'],
            'quote_data' => ['nullable', 'array'],
            'quote_data.quotation_no' => ['nullable', 'string', 'max:50'],
            'quote_data.quotation_date' => ['nullable', 'date'],
            'quote_data.business_name' => ['nullable', 'string', 'max:150'],
            'quote_data.client_name' => ['nullable', 'string', 'max:150'],
            'quote_data.vendor_details' => ['nullable', 'array'],
            'quote_data.client_details' => ['nullable', 'array'],
            'quote_data.shipping_details' => ['nullable', 'array'],
            'quote_data.transport_details' => ['nullable', 'array'],
            'quote_data.logo_data' => ['nullable', 'string', 'max:1500000', 'regex:/^data:image\/(png|jpeg|webp);base64,/i'],
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
            'vendor_attachment' => ['nullable', 'file', 'max:1024', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,webp'],
        ]);
        $attachment = $data['vendor_attachment'] ?? null;
        unset($data['vendor_attachment']);
        $quoteData = $data['quote_data'] ?? [];
        $quoteData['vendor'] = [
            'name' => $vendor->company_name ?: $vendor->name,
            'email' => $vendor->email,
            'phone' => $vendor->phone,
            'address' => $vendor->address,
            'city' => $vendor->city,
            'country' => $vendor->country,
        ];
        $data['quote_data'] = $quoteData;
        $versions = $demoRequest->quote_versions ?? [];
        if ($demoRequest->quoted_at) {
            $versions[] = [
                'revision' => max(1, (int) $demoRequest->quote_revision),
                'quoted_price' => $demoRequest->quoted_price,
                'quote_message' => $demoRequest->quote_message,
                'quote_terms' => $demoRequest->quote_terms,
                'quote_data' => $demoRequest->quote_data,
                'quote_valid_until' => optional($demoRequest->quote_valid_until)->toDateString(),
                'quoted_at' => optional($demoRequest->quoted_at)->toISOString(),
                'attachment_name' => $demoRequest->vendor_quote_attachment_name,
                'attachment_path' => $demoRequest->vendor_quote_attachment_path,
            ];
        }
        $attachmentData = [];
        if ($attachment) {
            $attachmentData = [
                'vendor_quote_attachment_name' => $attachment->getClientOriginalName(),
                'vendor_quote_attachment_path' => $attachment->store('vendor-quote-attachments'),
                'vendor_quote_attachment_mime' => $attachment->getMimeType(),
                'vendor_quote_attachment_size' => $attachment->getSize(),
            ];
        }
        $before = $demoRequest->only(['status', 'quoted_price', 'quote_valid_until', 'quote_revision', 'quoted_at']);
        $demoRequest->update([
            ...$data,
            ...$attachmentData,
            'status' => 'quoted',
            'quoted_at' => now(),
            'quote_sent_by' => $request->user()->id,
            'quote_revision' => max(1, (int) $demoRequest->quote_revision + 1),
            'quote_versions' => $versions,
            'buyer_quote_response_at' => null,
            'buyer_notification_read_at' => null,
        ]);

        $demoRequest->loadMissing(['service:id,name', 'vendor:id,company_name,name,email', 'user:id,name,email']);
        Audit::record($request, 'quote.sent', $demoRequest, $before, $demoRequest->only(['status', 'quoted_price', 'quote_valid_until', 'quote_revision', 'quoted_at', 'quote_sent_by']));
        $this->sendQuoteEmails($demoRequest, 'quote_sent');

        return response()->json(['message' => 'Quote sent to the customer.', 'data' => $demoRequest->fresh()]);
    }

    public function respondToQuote(Request $request, DemoRequest $demoRequest)
    {
        abort_unless($request->user()->account_type === 'buyer' && $demoRequest->request_type === 'quote' && $demoRequest->user_id === $request->user()->id, 403);
        abort_unless($demoRequest->status === 'quoted', 422, 'This quote is no longer awaiting a response.');
        abort_if($demoRequest->quote_valid_until?->isPast(), 422, 'This quote has expired.');
        $data = $request->validate(['decision' => ['required', Rule::in(['accept', 'decline'])]]);
        $before = $demoRequest->only(['status', 'buyer_quote_response_at']);
        DB::transaction(function () use ($demoRequest, $data) {
            $accepted = $data['decision'] === 'accept';
            $demoRequest->update(['status' => $accepted ? 'quote_accepted' : 'quote_declined', 'buyer_quote_response_at' => now(), 'buyer_notification_read_at' => now()]);
            if ($accepted) {
                DemoRequest::where('request_type', 'quote')->where('user_id', $demoRequest->user_id)->whereKeyNot($demoRequest->id)->whereIn('status', ['pending', 'quoted'])->update(['status' => 'quote_declined', 'buyer_quote_response_at' => now(), 'buyer_notification_read_at' => now()]);
            }
        });
        Audit::record($request, $data['decision'] === 'accept' ? 'quote.accepted' : 'quote.declined', $demoRequest, $before, $demoRequest->fresh()->only(['status', 'buyer_quote_response_at']));

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
        if ($po->wasRecentlyCreated) {
            Audit::record($request, 'purchase_order.created', $po, null, $po->only(['id', 'po_number', 'demo_request_id', 'user_id', 'vendor_id', 'total_amount', 'currency', 'status', 'issued_at']));
        }
        return response()->json(['message' => 'Purchase order draft generated. Review it before sending.', 'data' => $po], 201);
    }

    public function sendPurchaseOrder(Request $request, DemoRequest $demoRequest)
    {
        abort_unless($request->user()->account_type === 'buyer' && $demoRequest->user_id === $request->user()->id, 403);
        abort_unless($demoRequest->status === 'quote_accepted', 422, 'This quote is not accepted.');
        $po = $demoRequest->purchaseOrder()->firstOrFail();
        $before = $po->only(['status', 'sent_at']);
        if ($po->status !== 'sent') $po->update(['status' => 'sent', 'sent_at' => now()]);
        Audit::record($request, 'purchase_order.sent', $po, $before, $po->fresh()->only(['status', 'sent_at']));
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
        $before = ['vendor_id' => $purchaseOrder->vendor_id];
        $snapshot = $purchaseOrder->order_data;
        $snapshot['vendor'] = ['name' => $vendor->company_name ?: $vendor->name, 'email' => $vendor->email, 'phone' => $vendor->phone, 'address' => trim(implode(', ', array_filter([$vendor->address, $vendor->city, $vendor->country])))];
        $purchaseOrder->update(['vendor_id' => $vendor->id, 'order_data' => $snapshot]);
        Audit::record($request, 'purchase_order.vendor_assigned', $purchaseOrder, $before, ['vendor_id' => $vendor->id]);
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
            'currently_using' => ['nullable', 'required_if:request_type,quote', Rule::in(['manual', 'spreadsheet', 'customized_in_house', 'brand'])],
            'current_brand_name' => ['nullable', 'required_if:currently_using,brand', 'string', 'max:150'],
            'attachment' => ['nullable', 'file', 'max:2048', 'mimes:jpg,jpeg,png,webp,pdf,doc,docx,xls,xlsx,csv,txt,rtf,odt,ods'],
        ]);
        $service = Service::findOrFail($data['service_id']);
        $existingBefore = DemoRequest::where('service_id', $service->id)->where('user_id', $request->user()->id)->where('request_type', $data['request_type'])->first()?->only(['id', 'vendor_id', 'demo_at', 'quote_purpose', 'expected_users', 'currently_using', 'current_brand_name', 'status']);
        $requestRow = DemoRequest::updateOrCreate([
            'service_id' => $service->id,
            'user_id' => $request->user()->id,
            'request_type' => $data['request_type'],
        ], ['vendor_id' => $service->vendor_id, 'demo_at' => $data['demo_at'] ?? null, 'quote_purpose' => $data['quote_purpose'] ?? null, 'expected_users' => $data['expected_users'] ?? null, 'currently_using' => $data['currently_using'] ?? null, 'current_brand_name' => ($data['currently_using'] ?? null) === 'brand' ? trim($data['current_brand_name']) : null, 'status' => 'pending']);

        if ($request->hasFile('attachment') && $data['request_type'] === 'quote') {
            if ($requestRow->buyer_attachment_path) Storage::disk('local')->delete($requestRow->buyer_attachment_path);
            $file = $request->file('attachment');
            $requestRow->update(['buyer_attachment_name' => $file->getClientOriginalName(), 'buyer_attachment_path' => $file->store('quote-request-attachments'), 'buyer_attachment_mime' => $file->getMimeType(), 'buyer_attachment_size' => $file->getSize()]);
        }

        if ($data['request_type'] === 'quote') {
            $requestRow->loadMissing(['service:id,name', 'vendor:id,company_name,name,email', 'user:id,name,email']);
            $this->sendQuoteEmails($requestRow, 'quote_requested');
        }
        Audit::record($request, $requestRow->wasRecentlyCreated ? $data['request_type'].'.requested' : $data['request_type'].'.request_updated', $requestRow, $existingBefore, $requestRow->only(['id', 'service_id', 'user_id', 'vendor_id', 'request_type', 'demo_at', 'quote_purpose', 'expected_users', 'currently_using', 'current_brand_name', 'status']));

        return response()->json(['message' => $data['request_type'] === 'demo' ? 'Demo request sent to the Solution Provider.' : 'Quote request sent successfully.', 'data' => $requestRow], $requestRow->wasRecentlyCreated ? 201 : 200);
    }

    private function sendQuoteEmails(DemoRequest $quote, string $event): void
    {
        $serviceName = $quote->service?->name ?? 'the requested service';
        $vendorName = $quote->vendor?->company_name ?: ($quote->vendor?->name ?? 'Solution Provider');
        $buyerName = $quote->user?->name ?? 'Customer';

        $messages = $event === 'quote_requested'
            ? [
                [$quote->vendor?->email, $vendorName, 'New quote request received', "Hello {$vendorName},\n\n{$buyerName} has requested a quote for {$serviceName}. Please sign in to review and respond."],
                [$quote->user?->email, $buyerName, 'Your quote request was sent', "Hello {$buyerName},\n\nYour quote request for {$serviceName} was sent to {$vendorName}. You will be notified when the vendor responds."],
            ]
            : [
                [$quote->user?->email, $buyerName, 'Your quotation has arrived', "Hello {$buyerName},\n\n{$vendorName} has sent you a quotation for {$serviceName} for PKR ".number_format((float) $quote->quoted_price, 2).'. Please sign in to review it.'],
                [$quote->vendor?->email, $vendorName, 'Quotation sent successfully', "Hello {$vendorName},\n\nYour quotation for {$serviceName} was sent successfully to {$buyerName}."],
            ];

        foreach ($messages as [$email, $name, $subject, $body]) {
            if (! $email) continue;

            try {
                Mail::raw($body, fn ($mail) => $mail->to($email, $name)->subject($subject));
            } catch (\Throwable $exception) {
                Log::error('Quote email failed.', [
                    'quote_request_id' => $quote->id,
                    'event' => $event,
                    'recipient' => $email,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }

    public function downloadBuyerAttachment(Request $request, DemoRequest $demoRequest)
    {
        $this->authorizeParticipant($request, $demoRequest);
        abort_unless($demoRequest->request_type === 'quote' && $demoRequest->buyer_attachment_path, 404);
        abort_unless(Storage::disk('local')->exists($demoRequest->buyer_attachment_path), 404);
        return Storage::disk('local')->download($demoRequest->buyer_attachment_path, $demoRequest->buyer_attachment_name);
    }

    public function downloadVendorQuoteAttachment(Request $request, DemoRequest $demoRequest)
    {
        $this->authorizeParticipant($request, $demoRequest);
        abort_unless($demoRequest->request_type === 'quote' && $demoRequest->vendor_quote_attachment_path, 404);
        abort_unless(Storage::disk('local')->exists($demoRequest->vendor_quote_attachment_path), 404);
        return Storage::disk('local')->download($demoRequest->vendor_quote_attachment_path, $demoRequest->vendor_quote_attachment_name);
    }

    public function update(Request $request, DemoRequest $demoRequest)
    {
        $this->authorizeStaffVendor($request, $demoRequest->vendor_id);
        $data = $request->validate([
            'status' => ['required', Rule::in(['accepted', 'rejected'])],
            'rejection_reason' => ['nullable', 'required_if:status,rejected', 'string', 'min:5', 'max:1000'],
        ]);

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($demoRequest->vendor_id === $vendor->id, 403, 'You can only update requests for your own products.');
        }

        $before = $demoRequest->only(['status', 'rejection_reason', 'meeting_link']);

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

        Audit::record($request, 'demo_request.'.$data['status'], $demoRequest, $before, $demoRequest->fresh()->only(['status', 'rejection_reason', 'meeting_link']));

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
        Audit::record($request, 'demo_message.created', $message, null, $message->only(['id', 'demo_request_id', 'user_id', 'attachment_type', 'attachment_name', 'is_system']));

        return response()->json(['data' => $message->load('user:id,name,account_type')], 201);
    }

    public function moderate(Request $request, DemoRequest $demoRequest)
    {
        $this->authorizeStaffVendor($request, $demoRequest->vendor_id);
        $data = $request->validate([
            'participant' => ['required', Rule::in(['buyer', 'vendor'])],
            'blocked' => ['required', 'boolean'],
        ]);
        $column = $data['participant'].'_chat_blocked';
        $before = [$column => $demoRequest->{$column}];
        $demoRequest->update([$column => $data['blocked']]);
        Audit::record($request, $data['blocked'] ? 'demo_chat.blocked' : 'demo_chat.restored', $demoRequest, $before, [$column => $demoRequest->{$column}]);

        return response()->json([
            'message' => ucfirst($data['participant']).' messaging has been '.($data['blocked'] ? 'stopped.' : 'restored.'),
            'data' => $demoRequest->fresh(),
        ]);
    }

    private function authorizeParticipant(Request $request, DemoRequest $demoRequest): void
    {
        if (! in_array($request->user()->account_type, ['vendor', 'buyer'], true)) {
            $this->authorizeStaffVendor($request, $demoRequest->vendor_id);
            return;
        }

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($demoRequest->vendor_id === $vendor->id, 403);
            return;
        }

        abort_unless($demoRequest->user_id === $request->user()->id, 403);
    }

    private function scopeAssignedVendors(Request $request, $query): void
    {
        $user = $request->user();
        if ($user->account_type === 'staff' && ! $user->isSuperAdmin()) {
            $query->whereIn('vendor_id', $user->assignedVendors()->select('vendors.id'));
        }
    }

    private function authorizeStaffVendor(Request $request, ?int $vendorId): void
    {
        $user = $request->user();
        if ($user->account_type === 'staff' && ! $user->isSuperAdmin()) {
            abort_unless($vendorId && $user->assignedVendors()->whereKey($vendorId)->exists(), 403, 'This request belongs to a vendor that is not assigned to you.');
        }
    }
}
