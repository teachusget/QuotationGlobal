<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdviceRequest extends Model
{
    protected $fillable = ['buyer_id', 'name', 'email', 'country', 'city', 'phone', 'employees', 'preferred_meeting_at', 'requirements', 'attachment_name', 'attachment_path', 'attachment_mime', 'attachment_size', 'status', 'meeting_at', 'meeting_link', 'chat_enabled'];
    protected $casts = ['preferred_meeting_at' => 'datetime', 'meeting_at' => 'datetime', 'chat_enabled' => 'boolean'];
    public function buyer() { return $this->belongsTo(User::class, 'buyer_id'); }
    public function messages() { return $this->hasMany(AdviceMessage::class); }
}
