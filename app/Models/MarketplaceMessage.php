<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceMessage extends Model
{
    protected $fillable = ['conversation_id', 'user_id', 'message', 'is_auto', 'read_at', 'attachment_path', 'attachment_name', 'attachment_mime', 'attachment_size'];

    protected function casts(): array
    {
        return ['is_auto' => 'boolean', 'read_at' => 'datetime'];
    }

    public function conversation() { return $this->belongsTo(MarketplaceConversation::class, 'conversation_id'); }
    public function user() { return $this->belongsTo(User::class); }
}
