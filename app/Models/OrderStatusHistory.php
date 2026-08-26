<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OrderStatusHistory extends Model {
    protected $fillable=['order_id','changed_by','from_status','to_status','reason'];
    public function user(){ return $this->belongsTo(User::class,'changed_by'); }
}
