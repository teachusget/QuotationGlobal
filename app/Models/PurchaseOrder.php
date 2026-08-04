<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class PurchaseOrder extends Model {
    protected $fillable = ['po_number', 'demo_request_id', 'user_id', 'vendor_id', 'total_amount', 'currency', 'status', 'order_data', 'issued_at', 'sent_at'];
    protected $casts = ['total_amount' => 'decimal:2', 'order_data' => 'array', 'issued_at' => 'datetime', 'sent_at' => 'datetime'];
    public function quoteRequest() { return $this->belongsTo(DemoRequest::class, 'demo_request_id'); }
    public function user() { return $this->belongsTo(User::class); }
    public function vendor() { return $this->belongsTo(Vendor::class); }
}
