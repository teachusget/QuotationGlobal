<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemoRequest extends Model
{
    protected $fillable = ['service_id', 'vendor_id', 'user_id', 'request_type', 'quote_purpose', 'expected_users', 'demo_at', 'meeting_link', 'status', 'rejection_reason', 'buyer_notification_read_at', 'quoted_price', 'quote_message', 'quote_terms', 'quote_data', 'quote_valid_until', 'quoted_at', 'buyer_quote_response_at', 'buyer_chat_blocked', 'vendor_chat_blocked'];
    protected $casts = ['demo_at' => 'datetime', 'buyer_notification_read_at' => 'datetime', 'quoted_price' => 'decimal:2', 'quote_data' => 'array', 'quote_valid_until' => 'date', 'quoted_at' => 'datetime', 'buyer_quote_response_at' => 'datetime', 'buyer_chat_blocked' => 'boolean', 'vendor_chat_blocked' => 'boolean'];

    public function service() { return $this->belongsTo(Service::class); }
    public function vendor() { return $this->belongsTo(Vendor::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function messages() { return $this->hasMany(DemoMessage::class); }
    public function purchaseOrder() { return $this->hasOne(PurchaseOrder::class); }
}
