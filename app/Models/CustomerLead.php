<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerLead extends Model
{
    protected $fillable = ['customer_id', 'vendor_id', 'assigned_to', 'status', 'next_follow_up_at', 'last_contacted_at', 'notes'];
    protected $casts = ['next_follow_up_at' => 'datetime', 'last_contacted_at' => 'datetime'];
    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function vendor() { return $this->belongsTo(Vendor::class); }
    public function assignee() { return $this->belongsTo(User::class, 'assigned_to'); }
    public function activities() { return $this->hasMany(CustomerLeadActivity::class)->latest('created_at'); }
}
