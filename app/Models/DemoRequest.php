<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemoRequest extends Model
{
    protected $fillable = ['service_id', 'vendor_id', 'user_id', 'request_type', 'quote_purpose', 'expected_users', 'currently_using', 'current_brand_name', 'buyer_attachment_name', 'buyer_attachment_path', 'buyer_attachment_mime', 'buyer_attachment_size', 'demo_at', 'meeting_link', 'status', 'rejection_reason', 'buyer_notification_read_at', 'quoted_price', 'quote_message', 'quote_terms', 'quote_data', 'quote_valid_until', 'quoted_at', 'quote_sent_by', 'quote_revision', 'quote_versions', 'buyer_quote_response_at', 'vendor_quote_attachment_name', 'vendor_quote_attachment_path', 'vendor_quote_attachment_mime', 'vendor_quote_attachment_size', 'buyer_chat_blocked', 'vendor_chat_blocked'];
    protected $casts = ['demo_at' => 'datetime', 'buyer_notification_read_at' => 'datetime', 'quoted_price' => 'decimal:2', 'quote_data' => 'array', 'quote_versions' => 'array', 'quote_valid_until' => 'date', 'quoted_at' => 'datetime', 'buyer_quote_response_at' => 'datetime', 'buyer_chat_blocked' => 'boolean', 'vendor_chat_blocked' => 'boolean'];
    public function quoteSender() { return $this->belongsTo(User::class, 'quote_sent_by'); }

    public function service() { return $this->belongsTo(Service::class); }
    public function vendor() { return $this->belongsTo(Vendor::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function messages() { return $this->hasMany(DemoMessage::class); }
    public function purchaseOrder() { return $this->hasOne(PurchaseOrder::class); }
}
