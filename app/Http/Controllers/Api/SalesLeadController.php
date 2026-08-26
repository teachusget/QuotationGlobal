<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesLead;
use App\Models\Service;
use App\Models\Vendor;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalesLeadController extends Controller
{
    public function buyers(Request $request)
    {
        $data = $request->validate(['vendor_id' => ['required', 'integer', 'exists:vendors,id'], 'search' => ['nullable', 'string', 'max:120']]);
        $vendorIds = $this->vendorIds($request);
        abort_if($vendorIds !== null && ! $vendorIds->contains((int) $data['vendor_id']), 403, 'This vendor is not assigned to you.');
        $existingCustomerIds = SalesLead::where('vendor_id', $data['vendor_id'])->whereNotNull('customer_id')->pluck('customer_id');
        $existingEmails = SalesLead::where('vendor_id', $data['vendor_id'])->pluck('email');
        $search = trim((string) ($data['search'] ?? ''));
        $vendorId = (int) $data['vendor_id'];
        $buyers = User::where('account_type', 'buyer')->whereNotIn('id', $existingCustomerIds)->whereNotIn('email', $existingEmails)
            ->where(fn ($query) => $query->whereHas('demoRequests', fn ($requests) => $requests->where('vendor_id', $vendorId))->orWhereHas('purchaseOrders', fn ($orders) => $orders->where('vendor_id', $vendorId)))
            ->when($search, fn ($query) => $query->where(fn ($match) => $match->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%")))
            ->orderBy('name')->limit(50)->get(['id', 'name', 'email', 'phone', 'company_name']);
        return response()->json(['data' => $buyers]);
    }

    public function index(Request $request)
    {
        $vendorIds = $this->vendorIds($request);
        $query = SalesLead::with(['vendor:id,company_name,name', 'service:id,vendor_id,name', 'creator:id,name', 'assignee:id,name,email'])
            ->when($vendorIds !== null, fn ($q) => $q->whereIn('vendor_id', $vendorIds));
        if ($search = trim((string) $request->input('search'))) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"));
        }
        if ($request->filled('status')) $query->where('status', $request->input('status'));
        $leads = $query->latest()->paginate(min(100, max(10, (int) $request->input('per_page', 25))));
        $vendors = Vendor::when($vendorIds !== null, fn ($q) => $q->whereIn('id', $vendorIds))->where('status', 'approved')->orderBy('company_name')->get(['id', 'company_name', 'name']);
        $services = Service::when($vendorIds !== null, fn ($q) => $q->whereIn('vendor_id', $vendorIds))->orderBy('name')->get(['id', 'vendor_id', 'name']);
        return response()->json(['data' => $leads->items(), 'meta' => ['current_page' => $leads->currentPage(), 'last_page' => $leads->lastPage(), 'total' => $leads->total(), 'from' => $leads->firstItem(), 'to' => $leads->lastItem()], 'vendors' => $vendors, 'services' => $services]);
    }

    public function store(Request $request)
    {
        abort_unless(in_array($request->user()->account_type, ['vendor', 'staff'], true) || $request->user()->isSuperAdmin(), 403);
        $data = $this->validated($request);
        $vendorIds = $this->vendorIds($request);
        abort_if($vendorIds !== null && ! $vendorIds->contains((int) $data['vendor_id']), 403, 'This vendor is not assigned to you.');
        abort_unless(Service::whereKey($data['service_id'])->where('vendor_id', $data['vendor_id'])->exists(), 422, 'Choose a service belonging to the selected vendor.');
        if (! empty($data['customer_id'])) {
            $buyer = User::whereKey($data['customer_id'])->where('account_type', 'buyer')
                ->where(fn ($query) => $query->whereHas('demoRequests', fn ($requests) => $requests->where('vendor_id', $data['vendor_id']))->orWhereHas('purchaseOrders', fn ($orders) => $orders->where('vendor_id', $data['vendor_id'])))->first();
            abort_unless($buyer, 422, 'This buyer is not a customer of the selected vendor.');
            $data['name'] = $buyer->name;
            $data['email'] = $buyer->email;
            $data['phone'] = $buyer->phone;
            $data['company_name'] = $buyer->company_name;
        }
        $data['email'] = strtolower($data['email']);
        $data['created_by'] = $request->user()->id;
        $data['assigned_to'] = $request->user()->account_type === 'staff' ? $request->user()->id : null;
        $lead = SalesLead::create($data);
        Audit::record($request, 'sales_lead.created', $lead, [], $lead->toArray());
        return response()->json(['message' => 'Sales lead added.', 'data' => $lead->load(['vendor:id,company_name,name', 'service:id,vendor_id,name', 'creator:id,name', 'assignee:id,name,email'])], 201);
    }

    public function update(Request $request, SalesLead $salesLead)
    {
        $vendorIds = $this->vendorIds($request);
        abort_if($vendorIds !== null && ! $vendorIds->contains((int) $salesLead->vendor_id), 403);
        $data = $request->validate(['status' => ['required', Rule::in(['new', 'contacted', 'qualified', 'demo_scheduled', 'proposal_sent', 'follow_up', 'negotiation', 'won', 'lost'])], 'next_follow_up_at' => ['nullable', 'date'], 'notes' => ['nullable', 'string', 'max:3000']]);
        $before = $salesLead->toArray();
        $data['last_contacted_at'] = $data['status'] === 'new' ? $salesLead->last_contacted_at : now();
        $salesLead->update($data);
        Audit::record($request, 'sales_lead.updated', $salesLead, $before, $salesLead->toArray());
        return response()->json(['message' => 'Lead updated.', 'data' => $salesLead->fresh(['vendor:id,company_name,name', 'creator:id,name', 'assignee:id,name,email'])]);
    }

    private function validated(Request $request): array
    {
        return $request->validate(['vendor_id' => ['required', 'integer', 'exists:vendors,id'], 'customer_id' => ['nullable', 'integer', 'exists:users,id'], 'service_id' => ['required', 'integer', 'exists:services,id'], 'name' => ['required', 'string', 'max:150'], 'company_name' => ['nullable', 'string', 'max:180'], 'email' => ['required', 'email', 'max:190', Rule::unique('sales_leads')->where(fn ($q) => $q->where('vendor_id', $request->input('vendor_id')))], 'phone' => ['nullable', 'string', 'max:40'], 'source' => ['required', Rule::in(['manual', 'quotation_global', 'quotation_pk', 'referral', 'website', 'event', 'cold_call', 'social'])], 'status' => ['required', Rule::in(['new', 'contacted', 'qualified', 'demo_scheduled', 'proposal_sent', 'follow_up', 'negotiation', 'won', 'lost'])], 'next_follow_up_at' => ['nullable', 'date'], 'notes' => ['nullable', 'string', 'max:3000']]);
    }

    private function vendorIds(Request $request)
    {
        if ($request->user()->account_type === 'vendor') return collect([Vendor::where('user_id', $request->user()->id)->firstOrFail()->id]);
        if ($request->user()->account_type === 'staff' && ! $request->user()->isSuperAdmin()) return $request->user()->assignedVendors()->pluck('vendors.id');
        return null;
    }
}
