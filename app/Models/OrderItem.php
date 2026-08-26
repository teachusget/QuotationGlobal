<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OrderItem extends Model {
    protected $fillable=['order_id','service_id','sku','product_name','quantity','unit_price','line_total','product_snapshot'];
    protected $casts=['product_snapshot'=>'array','unit_price'=>'decimal:2','line_total'=>'decimal:2'];
    public function order(){ return $this->belongsTo(Order::class); }
    public function service(){ return $this->belongsTo(Service::class); }
}
