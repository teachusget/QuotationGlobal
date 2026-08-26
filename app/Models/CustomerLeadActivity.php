<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerLeadActivity extends Model
{
    public $timestamps = false;
    protected $fillable = ['customer_lead_id', 'actor_id', 'action', 'status', 'note', 'created_at'];
    protected $casts = ['created_at' => 'datetime'];
    public function actor() { return $this->belongsTo(User::class, 'actor_id'); }
}
