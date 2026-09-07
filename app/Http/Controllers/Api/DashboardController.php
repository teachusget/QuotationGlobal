<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DemoRequest;
use App\Models\Order;
use App\Models\Project;
use App\Models\Service;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_if(in_array($user->account_type, ['buyer', 'vendor'], true), 403);
        $vendorIds = $user->account_type === 'staff' && ! $user->isSuperAdmin()
            ? $user->assignedVendors()->pluck('vendors.id')
            : null;
        $scope = fn ($query) => $vendorIds === null ? $query : $query->whereIn('vendor_id', $vendorIds);
        $rfqs = $scope(DemoRequest::query()->where('request_type', 'quote'));
        $demos = $scope(DemoRequest::query()->where('request_type', 'demo'));
        $services = $scope(Service::query());
        $vendors = Vendor::query()->when($vendorIds !== null, fn ($query) => $query->whereIn('id', $vendorIds));
        $orders = $scope(Order::query());
        $projects = $scope(Project::query());
        $buyerCount = DemoRequest::query()->when($vendorIds !== null, fn ($query) => $query->whereIn('vendor_id', $vendorIds))->distinct('user_id')->count('user_id');

        $kpis = [
            ['key' => 'vendors', 'label' => 'Active vendors', 'value' => (clone $vendors)->where('status', 'approved')->count(), 'path' => '/vendors'],
            ['key' => 'customers', 'label' => 'Customers', 'value' => $vendorIds === null ? User::where('account_type', 'buyer')->count() : $buyerCount, 'path' => '/customers'],
            ['key' => 'services', 'label' => 'Solutions', 'value' => (clone $services)->count(), 'path' => '/services'],
            ['key' => 'rfqs', 'label' => 'Pending RFQs', 'value' => (clone $rfqs)->where('status', 'pending')->count(), 'path' => '/rfqs'],
            ['key' => 'demos', 'label' => 'Open demos', 'value' => (clone $demos)->where('status', 'pending')->count(), 'path' => '/demos'],
            ['key' => 'orders', 'label' => 'Active orders', 'value' => (clone $orders)->whereNotIn('status', ['delivered', 'cancelled'])->count(), 'path' => '/orders'],
        ];
        $attention = [
            ['key' => 'vendor_approvals', 'label' => 'Vendors awaiting approval', 'count' => (clone $vendors)->where('status', 'pending_approval')->count(), 'path' => '/vendors', 'tone' => 'warning'],
            ['key' => 'rfq_pending', 'label' => 'RFQs awaiting quotation', 'count' => (clone $rfqs)->where('status', 'pending')->count(), 'path' => '/rfqs', 'tone' => 'warning'],
            ['key' => 'demo_pending', 'label' => 'Demo requests awaiting action', 'count' => (clone $demos)->where('status', 'pending')->count(), 'path' => '/demos', 'tone' => 'warning'],
            ['key' => 'low_stock', 'label' => 'Low-stock products', 'count' => (clone $services)->where('track_inventory', true)->whereColumn('inventory_quantity', '<=', 'low_stock_threshold')->count(), 'path' => '/inventory', 'tone' => 'danger'],
            ['key' => 'overdue_projects', 'label' => 'Overdue projects', 'count' => (clone $projects)->whereDate('delivery_due_date', '<', today())->whereNotIn('status', ['completed', 'cancelled'])->count(), 'path' => '/projects', 'tone' => 'danger'],
            ['key' => 'pending_payments', 'label' => 'Orders awaiting payment', 'count' => (clone $orders)->where('payment_status', 'pending')->count(), 'path' => '/orders', 'tone' => 'warning'],
        ];
        $pipeline = collect(['pending' => 'New RFQs', 'quoted' => 'Quotes sent', 'quote_accepted' => 'Accepted', 'quote_declined' => 'Declined'])
            ->map(fn ($label, $status) => ['status' => $status, 'label' => $label, 'count' => (clone $rfqs)->where('status', $status)->count()])->values();
        $recent = collect()
            ->concat((clone $rfqs)->with(['service:id,name', 'user:id,name'])->latest()->limit(8)->get()->map(fn ($item) => ['id' => "rfq-$item->id", 'type' => 'RFQ', 'title' => $item->service?->name ?: "RFQ #$item->id", 'detail' => ($item->user?->name ?: 'Customer').' · '.str_replace('_', ' ', $item->status), 'time' => $item->updated_at, 'path' => '/rfqs']))
            ->concat((clone $orders)->with('buyer:id,name')->latest()->limit(6)->get()->map(fn ($item) => ['id' => "order-$item->id", 'type' => 'Order', 'title' => $item->order_number ?: "Order #$item->id", 'detail' => ($item->buyer?->name ?: 'Customer').' · '.str_replace('_', ' ', $item->status), 'time' => $item->updated_at, 'path' => '/orders']))
            ->concat((clone $demos)->with(['service:id,name', 'user:id,name'])->latest()->limit(6)->get()->map(fn ($item) => ['id' => "demo-$item->id", 'type' => 'Demo', 'title' => $item->service?->name ?: "Demo #$item->id", 'detail' => ($item->user?->name ?: 'Customer').' · '.str_replace('_', ' ', $item->status), 'time' => $item->updated_at, 'path' => '/demos']))
            ->sortByDesc('time')->take(12)->values();

        return response()->json(['data' => compact('kpis', 'attention', 'pipeline', 'recent'), 'generated_at' => now()]);
    }
}
