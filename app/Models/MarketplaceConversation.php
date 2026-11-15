<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceConversation extends Model
{
    protected $fillable = ['buyer_id', 'vendor_id', 'service_id', 'last_message_at'];

    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    public function buyer() { return $this->belongsTo(User::class, 'buyer_id'); }
    public function vendor() { return $this->belongsTo(User::class, 'vendor_id'); }
    public function service() { return $this->belongsTo(Service::class); }
    public function messages() { return $this->hasMany(MarketplaceMessage::class, 'conversation_id'); }
}
