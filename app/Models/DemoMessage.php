<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemoMessage extends Model
{
    protected $fillable = ['demo_request_id', 'user_id', 'message', 'attachment_type', 'attachment_name', 'attachment_data', 'is_system', 'buyer_read_at', 'vendor_read_at', 'admin_read_at'];

    protected $casts = ['is_system' => 'boolean', 'buyer_read_at' => 'datetime', 'vendor_read_at' => 'datetime', 'admin_read_at' => 'datetime'];

    public function demoRequest() { return $this->belongsTo(DemoRequest::class); }
    public function user() { return $this->belongsTo(User::class); }
}
