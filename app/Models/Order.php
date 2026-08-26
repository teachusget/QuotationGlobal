<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Order extends Model {
    protected $fillable = ['order_number','buyer_id','vendor_id','status','payment_status','currency','subtotal','tax_total','shipping_total','grand_total','shipping_address','status_reason','placed_at'];
    protected $casts = ['shipping_address'=>'array','subtotal'=>'decimal:2','tax_total'=>'decimal:2','shipping_total'=>'decimal:2','grand_total'=>'decimal:2','placed_at'=>'datetime'];
    public function buyer(){ return $this->belongsTo(User::class,'buyer_id'); }
    public function vendor(){ return $this->belongsTo(Vendor::class); }
    public function items(){ return $this->hasMany(OrderItem::class); }
    public function history(){ return $this->hasMany(OrderStatusHistory::class)->latest(); }
}
