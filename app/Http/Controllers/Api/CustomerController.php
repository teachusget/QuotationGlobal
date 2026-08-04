<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\Request;
class CustomerController extends Controller {
    public function index(Request $request) {
        $vendorId = null;
        if ($request->user()->account_type === 'vendor') {
            $vendorId = Vendor::where('user_id', $request->user()->id)->firstOrFail()->id;
        }

        $scopeVendor = fn ($query) => $vendorId ? $query->where('vendor_id', $vendorId) : $query;
        $customers = User::where('account_type', 'buyer')
            ->when($vendorId, fn ($query) => $query->where(function ($customers) use ($vendorId) {
                $customers->whereHas('purchaseOrders', fn ($orders) => $orders->where('vendor_id', $vendorId)->whereNotNull('sent_at'))
                    ->orWhereHas('demoRequests', fn ($demos) => $demos->where('vendor_id', $vendorId)->where('request_type', 'demo')->where('status', 'accepted'));
            }))
            ->withCount([
            'demoRequests as demo_requests_count' => fn ($query) => $scopeVendor($query->where('request_type', 'demo')),
            'demoRequests as quote_requests_count' => fn ($query) => $scopeVendor($query->where('request_type', 'quote')),
            'purchaseOrders as sent_purchase_orders_count' => fn ($query) => $scopeVendor($query->whereNotNull('sent_at')),
        ])->withMax([
            'purchaseOrders as last_po_sent_at' => fn ($query) => $scopeVendor($query->whereNotNull('sent_at')),
        ], 'sent_at')->withSum([
            'purchaseOrders as total_po_value' => fn ($query) => $scopeVendor($query->whereNotNull('sent_at')),
        ], 'total_amount')->latest()->get(['id', 'name', 'username', 'email', 'phone', 'company_name', 'company_logo_data', 'address', 'city', 'country', 'is_blocked', 'email_verified_at', 'last_login_at', 'created_at']);

        $customers->each(function (User $customer) use ($vendorId) {
            $customer->lifecycle_status = $vendorId ? 'customer' : ($customer->sent_purchase_orders_count > 0 ? 'customer' : 'lead');
            $customer->total_po_value = (float) ($customer->total_po_value ?? 0);
        });

        return response()->json(['data' => $customers]);
    }

    public function setBlocked(Request $request, User $customer) {
        abort_unless($customer->account_type === 'buyer', 422, 'Only customer accounts can be blocked.');
        $data = $request->validate(['blocked' => ['required', 'boolean']]);
        $customer->update(['is_blocked' => $data['blocked']]);
        if ($data['blocked']) $customer->tokens()->delete();
        return response()->json(['message' => $data['blocked'] ? 'Customer blocked.' : 'Customer unblocked.', 'data' => $customer->only(['id', 'is_blocked'])]);
    }

    public function destroy(User $customer) {
        abort_unless($customer->account_type === 'buyer', 422, 'Only customer accounts can be deleted.');
        $customer->tokens()->delete();
        $customer->delete();
        return response()->json(['message' => 'Customer deleted permanently.']);
    }
}
