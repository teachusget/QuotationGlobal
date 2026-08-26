<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesLead extends Model
{
    protected $fillable = ['vendor_id', 'customer_id', 'service_id', 'created_by', 'assigned_to', 'name', 'company_name', 'email', 'phone', 'source', 'status', 'next_follow_up_at', 'last_contacted_at', 'notes'];
    protected $casts = ['next_follow_up_at' => 'datetime', 'last_contacted_at' => 'datetime'];
    public function vendor() { return $this->belongsTo(Vendor::class); }
    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function service() { return $this->belongsTo(Service::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function assignee() { return $this->belongsTo(User::class, 'assigned_to'); }
    public function project() { return $this->hasOne(Project::class); }
}
