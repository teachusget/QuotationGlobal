<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vendor;
use App\Models\CustomerLead;
use App\Models\CustomerLeadActivity;
use App\Models\DemoRequest;
use App\Models\PurchaseOrder;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
class CustomerController extends Controller {
    public function index(Request $request) {
        $vendorId = null;
        if ($request->user()->account_type === 'vendor') {
            $vendorId = Vendor::where('user_id', $request->user()->id)->firstOrFail()->id;
        }

        $vendorIds = $vendorId ? collect([$vendorId]) : null;
        if ($request->user()->account_type === 'staff' && ! $request->user()->isSuperAdmin()) {
            $vendorIds = $request->user()->assignedVendors()->pluck('vendors.id');
        }

        $customers = User::where('account_type', 'buyer')
            ->when($vendorIds !== null, fn ($query) => $query->where(function ($customers) use ($vendorIds) {
                $customers->whereHas('demoRequests', fn ($requests) => $requests->whereIn('vendor_id', $vendorIds))
                    ->orWhereHas('purchaseOrders', fn ($orders) => $orders->whereIn('vendor_id', $vendorIds));
            }))
            ->latest()->get(['id', 'name', 'username', 'email', 'phone', 'company_name', 'company_logo_data', 'address', 'city', 'country', 'is_blocked', 'email_verified_at', 'last_login_at', 'created_at']);

        $customerIds = $customers->pluck('id');
        $requestVendors = DemoRequest::with('vendor:id,company_name,name')->whereIn('user_id', $customerIds)
            ->when($vendorIds !== null, fn ($query) => $query->whereIn('vendor_id', $vendorIds))->latest('created_at')->get(['id', 'user_id', 'vendor_id', 'request_type', 'status', 'quoted_at', 'buyer_quote_response_at', 'created_at']);
        $orderVendors = PurchaseOrder::with('vendor:id,company_name,name')->whereIn('user_id', $customerIds)
            ->when($vendorIds !== null, fn ($query) => $query->whereIn('vendor_id', $vendorIds))->get(['id', 'user_id', 'vendor_id', 'sent_at', 'total_amount']);
        $leads = CustomerLead::with(['assignee:id,name,email', 'activities' => fn ($query) => $query->with('actor:id,name,email')->limit(20)])
            ->whereIn('customer_id', $customerIds)->get()->keyBy(fn ($lead) => $lead->customer_id.':'.$lead->vendor_id);
        $customerMap = $customers->keyBy('id');
        $pairs = $requestVendors->map(fn ($row) => [$row->user_id, $row->vendor_id])
            ->concat($orderVendors->map(fn ($row) => [$row->user_id, $row->vendor_id]))->unique(fn ($pair) => $pair[0].':'.$pair[1]);
        $rows = $pairs->map(function ($pair) use ($customerMap, $requestVendors, $orderVendors, $leads) {
            [$customerId, $pairVendorId] = $pair;
            $customer = $customerMap->get($customerId);
            if (! $customer) return null;
            $requests = $requestVendors->where('user_id', $customerId)->where('vendor_id', $pairVendorId);
            $orders = $orderVendors->where('user_id', $customerId)->where('vendor_id', $pairVendorId);
            $vendor = $requests->first()?->vendor ?: $orders->first()?->vendor;
            $demoCount = $requests->where('request_type', 'demo')->count();
            $quoteRequests = $requests->where('request_type', 'quote');
            $quoteCount = $quoteRequests->count();
            $latestQuote = $quoteRequests->sortByDesc('created_at')->first();
            $sentOrders = $orders->whereNotNull('sent_at');
            $sources = collect([$demoCount ? 'Demo' : null, $quoteCount ? 'Quote' : null, (! $demoCount && ! $quoteCount && $orders->isNotEmpty()) ? 'PO' : null])->filter()->values();
            $row = clone $customer;
            $row->setAttribute('row_key', $customerId.':'.$pairVendorId);
            $row->setAttribute('vendor', ['id' => $vendor->id, 'name' => $vendor->company_name ?: $vendor->name]);
            $row->setAttribute('lead_sources', $sources);
            $row->setAttribute('demo_requests_count', $demoCount);
            $row->setAttribute('quote_requests_count', $quoteCount);
            $row->setAttribute('quote_status', $latestQuote?->status);
            $row->setAttribute('quote_status_at', $latestQuote?->buyer_quote_response_at ?: $latestQuote?->quoted_at ?: $latestQuote?->created_at);
            $row->setAttribute('sent_purchase_orders_count', $sentOrders->count());
            $row->setAttribute('total_po_value', (float) $sentOrders->sum('total_amount'));
            $row->setAttribute('last_po_sent_at', $sentOrders->max('sent_at'));
            $isCustomer = $sentOrders->isNotEmpty() || $requests->where('request_type', 'demo')->where('status', 'accepted')->isNotEmpty();
            $row->setAttribute('lifecycle_status', $isCustomer ? 'customer' : 'lead');
            $row->setAttribute('crm', $leads->get($customerId.':'.$pairVendorId));
            return $row;
        })->filter()->values();
        $assignees = $request->user()->account_type !== 'vendor' && $request->user()->can('customers.assign')
            ? User::where('account_type', 'staff')->where('is_blocked', false)->orderBy('name')->get(['id', 'name', 'email'])
            : collect();

        return response()->json(['data' => $rows, 'assignees' => $assignees]);
    }

    public function updateCrm(Request $request, User $customer) {
        abort_if($request->user()->account_type === 'vendor', 403, 'Vendor accounts cannot manage internal lead assignments.');
        abort_unless($customer->account_type === 'buyer', 422, 'Only buyer accounts can be managed as leads.');
        $canAssign = $request->user()->can('customers.assign');
        $canFollowUp = $request->user()->can('customers.follow_up');
        abort_unless($canAssign || $canFollowUp, 403);
        $data = $request->validate([
            'vendor_id' => ['required', 'integer', 'exists:vendors,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['required', Rule::in(['new', 'contacted', 'qualified', 'proposal_sent', 'follow_up', 'won', 'lost'])],
            'next_follow_up_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);
        if (! $request->user()->isSuperAdmin()) {
            $allowedVendorIds = $request->user()->assignedVendors()->pluck('vendors.id');
            abort_unless($allowedVendorIds->contains((int) $data['vendor_id']), 403, 'This vendor is not assigned to you.');
        }
        abort_unless(DemoRequest::where('user_id', $customer->id)->where('vendor_id', $data['vendor_id'])->exists()
            || PurchaseOrder::where('user_id', $customer->id)->where('vendor_id', $data['vendor_id'])->exists(), 422, 'This buyer has no activity with the selected vendor.');
        $lead = CustomerLead::firstOrCreate(['customer_id' => $customer->id, 'vendor_id' => $data['vendor_id']]);
        $requestedAssignee = $data['assigned_to'] ?? null;
        if (! $canAssign) {
            abort_unless(! $lead->assigned_to || (int) $lead->assigned_to === (int) $request->user()->id, 403, 'This lead is assigned to another user.');
            $requestedAssignee = $request->user()->id;
        }
        if ($requestedAssignee) {
            abort_unless(User::whereKey($requestedAssignee)->where('account_type', 'staff')->where('is_blocked', false)->exists(), 422, 'Choose an active staff user.');
        }
        $before = $lead->only(['assigned_to', 'status', 'next_follow_up_at', 'last_contacted_at', 'notes']);
        $lastContacted = in_array($data['status'], ['contacted', 'qualified', 'proposal_sent', 'follow_up', 'won', 'lost'], true) ? now() : $lead->last_contacted_at;
        $lead->update(['assigned_to' => $requestedAssignee, 'status' => $data['status'], 'next_follow_up_at' => $data['next_follow_up_at'] ?? null, 'last_contacted_at' => $lastContacted, 'notes' => ($data['note'] ?? null) ?: $lead->notes]);
        CustomerLeadActivity::create(['customer_lead_id' => $lead->id, 'actor_id' => $request->user()->id, 'action' => $before['assigned_to'] != $requestedAssignee ? 'assigned_and_updated' : 'follow_up_updated', 'status' => $lead->status, 'note' => $data['note'] ?? null, 'created_at' => now()]);
        Audit::record($request, 'customer.crm_updated', $customer, $before, $lead->only(['assigned_to', 'status', 'next_follow_up_at', 'last_contacted_at', 'notes']));
        return response()->json(['message' => 'Lead follow-up saved.', 'data' => $lead->fresh(['assignee:id,name,email', 'activities' => fn ($query) => $query->with('actor:id,name,email')->limit(20)])]);
    }

    public function setBlocked(Request $request, User $customer) {
        abort_if($request->user()->account_type === 'vendor', 403, 'Vendor accounts have view-only access to their leads and customers.');
        abort_unless($customer->account_type === 'buyer', 422, 'Only customer accounts can be blocked.');
        $data = $request->validate(['blocked' => ['required', 'boolean']]);
        $before = ['is_blocked' => $customer->is_blocked];
        $customer->update(['is_blocked' => $data['blocked']]);
        if ($data['blocked']) $customer->tokens()->delete();
        Audit::record($request, $data['blocked'] ? 'customer.blocked' : 'customer.unblocked', $customer, $before, ['is_blocked' => $customer->is_blocked]);
        return response()->json(['message' => $data['blocked'] ? 'Customer blocked.' : 'Customer unblocked.', 'data' => $customer->only(['id', 'is_blocked'])]);
    }

    public function destroy(Request $request, User $customer) {
        abort_unless($customer->account_type === 'buyer', 422, 'Only customer accounts can be deleted.');
        $before = $customer->only(['id', 'name', 'username', 'email', 'phone', 'company_name', 'account_type', 'is_blocked']);
        $customer->tokens()->delete();
        $customer->delete();
        Audit::record($request, 'customer.deleted', $customer, $before);
        return response()->json(['message' => 'Customer deleted permanently.']);
    }
}
