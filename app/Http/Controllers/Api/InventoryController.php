<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\Vendor;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Service::query()->with('vendor:id,company_name,name')->where('service_type', 'hardware')->orderBy('name')->orderBy('id');
        $user = $request->user();

        if ($user->account_type === 'buyer') abort(403);
        if ($user->account_type === 'vendor') $query->where('vendor_id', Vendor::where('user_id', $user->id)->firstOrFail()->id);
        elseif ($user->account_type === 'staff' && ! $user->isSuperAdmin()) $query->whereIn('vendor_id', $user->assignedVendors()->pluck('vendors.id'));

        if ($search = trim((string) $request->input('search'))) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%")->orWhereHas('vendor', fn ($v) => $v->where('company_name', 'like', "%{$search}%")));
        }

        $products = $query->get()->unique(fn ($service) => $service->vendor_id.'|'.mb_strtolower($service->name))->values()->map(function ($service) {
            $quantity = (int) $service->inventory_quantity;
            $threshold = (int) $service->low_stock_threshold;
            $service->setAttribute('stock_status', ! $service->track_inventory ? 'not_tracked' : ($quantity === 0 ? 'out_of_stock' : ($quantity <= $threshold ? 'low_stock' : 'in_stock')));
            return $service;
        });

        return response()->json(['data' => $products, 'summary' => [
            'products' => $products->count(),
            'units' => $products->where('track_inventory', true)->sum('inventory_quantity'),
            'low_stock' => $products->whereIn('stock_status', ['low_stock', 'out_of_stock'])->count(),
            'out_of_stock' => $products->where('stock_status', 'out_of_stock')->count(),
        ]]);
    }

    public function update(Request $request, Service $service)
    {
        abort_unless($service->service_type === 'hardware', 422, 'Inventory is only available for hardware products.');
        $user = $request->user();
        if ($user->account_type === 'buyer') abort(403);
        if ($user->account_type === 'vendor') abort_unless($service->vendor_id === Vendor::where('user_id', $user->id)->firstOrFail()->id, 403);
        elseif ($user->account_type === 'staff' && ! $user->isSuperAdmin()) abort_unless($user->assignedVendors()->whereKey($service->vendor_id)->exists(), 403);

        $data = $request->validate([
            'inventory_quantity' => ['required', 'integer', 'min:0', 'max:100000000'],
            'low_stock_threshold' => ['required', 'integer', 'min:0', 'max:100000000'],
            'track_inventory' => ['required', 'boolean'],
        ]);
        $before = $service->only(array_keys($data));
        DB::transaction(fn () => Service::where('vendor_id', $service->vendor_id)->where('name', $service->name)->where('service_type', 'hardware')->update($data));
        $service->refresh();
        Audit::record($request, 'inventory.updated', $service, $before, $service->only(array_keys($data)));

        return response()->json(['message' => 'Inventory updated.', 'data' => $service]);
    }
}
