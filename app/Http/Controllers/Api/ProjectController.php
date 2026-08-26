<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\SalesLead;
use App\Models\Vendor;
use App\Support\Audit;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $vendorIds = $this->vendorIds($request);
        $query = Project::with(['opportunity:id,name,company_name,email,status', 'vendor:id,company_name,name', 'service:id,name', 'creator:id,name'])
            ->when($vendorIds !== null, fn ($q) => $q->whereIn('vendor_id', $vendorIds));
        if ($search = trim((string) $request->input('search'))) {
            $query->where(fn ($q) => $q->where('project_number', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%")->orWhereHas('opportunity', fn ($lead) => $lead->where('name', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")));
        }
        $statusCounts = (clone $query)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        if ($request->filled('status')) $query->where('status', $request->input('status'));
        $projects = $query->latest()->paginate(min(100, max(10, (int) $request->input('per_page', 25))));
        $opportunities = SalesLead::with(['vendor:id,company_name,name', 'service:id,name'])->where('status', '!=', 'lost')->whereDoesntHave('project')
            ->when($vendorIds !== null, fn ($q) => $q->whereIn('vendor_id', $vendorIds))->latest()->get(['id', 'vendor_id', 'service_id', 'name', 'company_name', 'email']);
        return response()->json(['data' => $projects->items(), 'opportunities' => $opportunities, 'meta' => ['current_page' => $projects->currentPage(), 'last_page' => $projects->lastPage(), 'total' => $projects->total(), 'all_total' => $statusCounts->sum(), 'status_counts' => $statusCounts, 'from' => $projects->firstItem(), 'to' => $projects->lastItem()]]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['sales_lead_id' => ['required', 'integer', 'exists:sales_leads,id', 'unique:projects,sales_lead_id'], 'name' => ['required', 'string', 'max:180'], 'start_date' => ['required', 'date'], 'delivery_duration' => ['required', 'integer', 'min:1', 'max:3650'], 'delivery_unit' => ['required', Rule::in(['days', 'months', 'years'])], 'payment_model' => ['required', Rule::in(['one_time', 'subscription'])], 'billing_frequency' => ['nullable', Rule::in(['weekly', 'monthly', 'quarterly', 'semi_annual', 'annually']), 'required_if:payment_model,subscription'], 'currency' => ['required', Rule::in(['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', 'CNY', 'JPY', 'INR', 'TRY', 'QAR', 'KWD', 'BHD', 'OMR'])], 'contract_value' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'], 'additional_services_payment' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'], 'payment_terms' => ['nullable', 'string', 'max:3000'], 'notes' => ['nullable', 'string', 'max:3000']]);
        $lead = SalesLead::with('service:id,vendor_id')->findOrFail($data['sales_lead_id']);
        abort_unless($lead->status !== 'lost', 422, 'A lost opportunity cannot be converted into a project.');
        $vendorIds = $this->vendorIds($request);
        abort_if($vendorIds !== null && ! $vendorIds->contains((int) $lead->vendor_id), 403, 'This opportunity is outside your assigned vendors.');
        $startDate = Carbon::parse($data['start_date']);
        $dueDate = match ($data['delivery_unit']) {
            'months' => $startDate->copy()->addMonthsNoOverflow((int) $data['delivery_duration']),
            'years' => $startDate->copy()->addYearsNoOverflow((int) $data['delivery_duration']),
            default => $startDate->copy()->addDays((int) $data['delivery_duration']),
        };
        $project = Project::create([...$data, 'vendor_id' => $lead->vendor_id, 'service_id' => $lead->service_id, 'created_by' => $request->user()->id, 'delivery_days' => $startDate->diffInDays($dueDate), 'delivery_due_date' => $dueDate->toDateString(), 'billing_frequency' => $data['payment_model'] === 'subscription' ? $data['billing_frequency'] : null, 'status' => 'planning']);
        $project->update(['project_number' => 'PRJ-'.now()->format('Y').'-'.str_pad((string) $project->id, 6, '0', STR_PAD_LEFT)]);
        if ($lead->status !== 'won') {
            $lead->update(['status' => 'won', 'last_contacted_at' => now()]);
        }
        Audit::record($request, 'project.created', $project, [], $project->toArray());
        return response()->json(['message' => 'Project created and opportunity marked as won.', 'data' => $project->fresh(['opportunity:id,name,company_name,email,status', 'vendor:id,company_name,name', 'service:id,name', 'creator:id,name'])], 201);
    }

    public function update(Request $request, Project $project)
    {
        $vendorIds = $this->vendorIds($request);
        abort_if($vendorIds !== null && ! $vendorIds->contains((int) $project->vendor_id), 403);
        if ($request->has('status') && array_diff(array_keys($request->all()), ['status', 'status_reason']) === []) {
            $data = $request->validate(['status' => ['required', Rule::in(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])], 'status_reason' => ['nullable', 'string', 'max:1000', Rule::requiredIf(fn () => in_array($request->input('status'), ['on_hold', 'cancelled'], true))]]);
            $before = $project->toArray();
            $project->update([...$data, 'status_reason' => in_array($data['status'], ['on_hold', 'cancelled'], true) ? $data['status_reason'] : null]);
            Audit::record($request, 'project.status_updated', $project, $before, $project->toArray());

            return response()->json(['message' => 'Project status updated.', 'data' => $project->fresh(['opportunity:id,name,company_name,email,status', 'vendor:id,company_name,name', 'service:id,name', 'creator:id,name'])]);
        }
        $data = $request->validate(['name' => ['required', 'string', 'max:180'], 'start_date' => ['required', 'date'], 'delivery_duration' => ['required', 'integer', 'min:1', 'max:3650'], 'delivery_unit' => ['required', Rule::in(['days', 'months', 'years'])], 'payment_model' => ['required', Rule::in(['one_time', 'subscription'])], 'billing_frequency' => ['nullable', Rule::in(['weekly', 'monthly', 'quarterly', 'semi_annual', 'annually']), 'required_if:payment_model,subscription'], 'currency' => ['required', Rule::in(['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', 'CNY', 'JPY', 'INR', 'TRY', 'QAR', 'KWD', 'BHD', 'OMR'])], 'contract_value' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'], 'additional_services_payment' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'], 'payment_terms' => ['nullable', 'string', 'max:3000'], 'status' => ['required', Rule::in(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])], 'status_reason' => ['nullable', 'string', 'max:1000', Rule::requiredIf(fn () => in_array($request->input('status'), ['on_hold', 'cancelled'], true))], 'notes' => ['nullable', 'string', 'max:3000']]);
        $before = $project->toArray();
        $startDate = Carbon::parse($data['start_date']);
        $dueDate = match ($data['delivery_unit']) {
            'months' => $startDate->copy()->addMonthsNoOverflow((int) $data['delivery_duration']),
            'years' => $startDate->copy()->addYearsNoOverflow((int) $data['delivery_duration']),
            default => $startDate->copy()->addDays((int) $data['delivery_duration']),
        };
        $project->update([...$data, 'delivery_days' => $startDate->diffInDays($dueDate), 'delivery_due_date' => $dueDate->toDateString(), 'billing_frequency' => $data['payment_model'] === 'subscription' ? $data['billing_frequency'] : null, 'status_reason' => in_array($data['status'], ['on_hold', 'cancelled'], true) ? $data['status_reason'] : null]);
        Audit::record($request, 'project.updated', $project, $before, $project->toArray());
        return response()->json(['message' => 'Project updated.', 'data' => $project->fresh(['opportunity:id,name,company_name,email,status', 'vendor:id,company_name,name', 'service:id,name', 'creator:id,name'])]);
    }

    private function vendorIds(Request $request)
    {
        if ($request->user()->account_type === 'vendor') return collect([Vendor::where('user_id', $request->user()->id)->firstOrFail()->id]);
        if ($request->user()->account_type === 'staff' && ! $request->user()->isSuperAdmin()) return $request->user()->assignedVendors()->pluck('vendors.id');
        return null;
    }
}
