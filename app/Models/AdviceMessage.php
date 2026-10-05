<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdviceMessage extends Model
{
    protected $fillable = ['advice_request_id', 'user_id', 'message', 'is_system', 'buyer_read_at', 'admin_read_at'];
    protected $casts = ['is_system' => 'boolean', 'buyer_read_at' => 'datetime', 'admin_read_at' => 'datetime'];
    public function user() { return $this->belongsTo(User::class); }
    public function adviceRequest() { return $this->belongsTo(AdviceRequest::class); }
}
