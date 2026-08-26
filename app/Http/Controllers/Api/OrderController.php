<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Service;
use App\Models\Vendor;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    private const STATUSES = ['placed','confirmed','processing','ready_to_ship','shipped','delivered','on_hold','cancelled','returned'];
    private const PAYMENT_STATUSES = ['pending','paid','failed','refunded'];
    private const TRANSITIONS = [
        'placed' => ['confirmed','on_hold','cancelled'],
        'confirmed' => ['processing','on_hold','cancelled'],
        'processing' => ['ready_to_ship','on_hold','cancelled'],
        'ready_to_ship' => ['shipped','on_hold','cancelled'],
        'shipped' => ['delivered','returned'],
        'delivered' => ['returned'],
        'on_hold' => ['confirmed','processing','ready_to_ship','cancelled'],
        'cancelled' => [],
        'returned' => [],
    ];

    public function index(Request $request)
    {
        $query = Order::with(['buyer:id,name,email,phone','vendor:id,company_name,name,email,phone','items','history.user:id,name'])->latest();
        $user = $request->user();
        if ($user->account_type === 'buyer') $query->where('buyer_id', $user->id);
        elseif ($user->account_type === 'vendor') $query->where('vendor_id', Vendor::where('user_id', $user->id)->firstOrFail()->id);
        elseif ($user->account_type === 'staff' && ! $user->isSuperAdmin()) $query->whereIn('vendor_id', $user->assignedVendors()->pluck('vendors.id'));
        if ($request->filled('status')) $query->where('status', $request->string('status'));
        if ($search = trim((string) $request->input('search'))) $query->where(fn($q) => $q->where('order_number','like',"%{$search}%")->orWhereHas('buyer',fn($b)=>$b->where('name','like',"%{$search}%")->orWhere('email','like',"%{$search}%"))->orWhereHas('items',fn($i)=>$i->where('sku','like',"%{$search}%")->orWhere('product_name','like',"%{$search}%")));
        return response()->json(['data'=>$query->paginate(25)]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->account_type === 'buyer', 403, 'Only buyers can place direct orders.');
        $data = $request->validate(['service_id'=>['required','integer','exists:services,id'],'quantity'=>['required','integer','min:1','max:1000'],'shipping'=>['required','array'],'shipping.name'=>['required','string','max:120'],'shipping.phone'=>['required','string','max:40'],'shipping.address'=>['required','string','max:500'],'shipping.city'=>['required','string','max:100'],'shipping.country'=>['required','string','max:100']]);
        $order = DB::transaction(function () use ($data, $request) {
            $service = Service::whereKey($data['service_id'])->lockForUpdate()->firstOrFail();
            $productPlans = Service::where('vendor_id', $service->vendor_id)->where('name', $service->name)->where('service_type', $service->service_type)->lockForUpdate()->get();
            $inventoryProduct = $productPlans->sortBy('id')->first();
            abort_unless($service->service_type === 'hardware', 422, 'Direct ordering is only available for hardware.');
            abort_unless($service->sku, 422, 'This hardware product does not have an SKU.');
            if ($inventoryProduct->track_inventory) abort_if($inventoryProduct->inventory_quantity < $data['quantity'], 422, 'Only '.$inventoryProduct->inventory_quantity.' item(s) are currently available.');
            $price = (float) $service->price_from;
            abort_if($price <= 0, 422, 'This product does not have an orderable price.');
            $total = round($price * $data['quantity'], 2);
            $order = Order::create(['buyer_id'=>$request->user()->id,'vendor_id'=>$service->vendor_id,'status'=>'placed','payment_status'=>'pending','currency'=>'USD','subtotal'=>$total,'grand_total'=>$total,'shipping_address'=>$data['shipping'],'placed_at'=>now()]);
            $order->update(['order_number'=>'ORD-'.now()->format('Ymd').'-'.str_pad((string)$order->id,6,'0',STR_PAD_LEFT)]);
            $order->items()->create(['service_id'=>$service->id,'sku'=>$service->sku,'product_name'=>$service->name,'quantity'=>$data['quantity'],'unit_price'=>$price,'line_total'=>$total,'product_snapshot'=>['service_type'=>'hardware','vendor_id'=>$service->vendor_id,'billing_cycle'=>$service->billing_cycle]]);
            $order->history()->create(['changed_by'=>$request->user()->id,'to_status'=>'placed']);
            if ($inventoryProduct->track_inventory) Service::whereIn('id', $productPlans->pluck('id'))->decrement('inventory_quantity', $data['quantity']);
            Audit::record($request,'order.placed',$order,[],$order->toArray());
            return $order;
        });
        return response()->json(['message'=>'Order placed successfully.','data'=>$order->fresh(['buyer:id,name,email,phone','vendor:id,company_name,name,email,phone','items','history.user:id,name'])],201);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $user = $request->user();
        $isBuyerCancel = $user->account_type === 'buyer' && $order->buyer_id === $user->id;
        if ($user->account_type === 'vendor') abort_unless($order->vendor_id === Vendor::where('user_id',$user->id)->firstOrFail()->id,403);
        elseif ($user->account_type === 'staff' && ! $user->isSuperAdmin()) abort_unless($user->assignedVendors()->whereKey($order->vendor_id)->exists(),403);
        elseif ($user->account_type === 'buyer') abort_unless($isBuyerCancel,403);
        $data = $request->validate(['status'=>['required',Rule::in(self::STATUSES)],'reason'=>['nullable','string','max:1000',Rule::requiredIf(fn()=>in_array($request->input('status'),['on_hold','cancelled','returned'],true))],'payment_status'=>['nullable',Rule::in(self::PAYMENT_STATUSES)]]);
        if ($isBuyerCancel) abort_unless($data['status']==='cancelled' && in_array($order->status,['placed','confirmed'],true),422,'This order can no longer be cancelled by the buyer.');
        abort_unless(in_array($data['status'], self::TRANSITIONS[$order->status] ?? [], true), 422, 'This status change is not allowed from '.str_replace('_', ' ', $order->status).'.');
        $before=$order->toArray(); $from=$order->status;
        DB::transaction(function () use ($order,$data,$request,$from) {
            if (in_array($data['status'],['cancelled','returned'],true) && !in_array($from,['cancelled','returned'],true)) foreach($order->items as $item) if($item->service?->track_inventory) Service::where('vendor_id',$item->service->vendor_id)->where('name',$item->service->name)->where('service_type','hardware')->increment('inventory_quantity',$item->quantity);
            $order->update(['status'=>$data['status'],'payment_status'=>$data['payment_status']??$order->payment_status,'status_reason'=>in_array($data['status'],['on_hold','cancelled','returned'],true)?$data['reason']:null]);
            $order->history()->create(['changed_by'=>$request->user()->id,'from_status'=>$from,'to_status'=>$data['status'],'reason'=>$data['reason']??null]);
        });
        Audit::record($request,'order.status_updated',$order,$before,$order->fresh()->toArray());
        return response()->json(['message'=>'Order status updated.','data'=>$order->fresh(['buyer:id,name,email,phone','vendor:id,company_name,name,email,phone','items','history.user:id,name'])]);
    }

    public function updatePayment(Request $request, Order $order)
    {
        $user = $request->user();
        abort_if($user->account_type === 'buyer', 403);
        if ($user->account_type === 'vendor') abort_unless($order->vendor_id === Vendor::where('user_id', $user->id)->firstOrFail()->id, 403);
        elseif ($user->account_type === 'staff' && ! $user->isSuperAdmin()) abort_unless($user->assignedVendors()->whereKey($order->vendor_id)->exists(), 403);
        $data = $request->validate(['payment_status' => ['required', Rule::in(self::PAYMENT_STATUSES)]]);
        $before = $order->toArray();
        $order->update($data);
        Audit::record($request, 'order.payment_updated', $order, $before, $order->fresh()->toArray());
        return response()->json(['message' => 'Payment status updated.', 'data' => $order->fresh(['buyer:id,name,email,phone','vendor:id,company_name,name,email,phone','items','history.user:id,name'])]);
    }
}
