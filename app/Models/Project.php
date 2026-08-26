<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['project_number', 'sales_lead_id', 'vendor_id', 'service_id', 'created_by', 'name', 'start_date', 'delivery_days', 'delivery_duration', 'delivery_unit', 'delivery_due_date', 'payment_model', 'billing_frequency', 'currency', 'contract_value', 'additional_services_payment', 'payment_terms', 'status', 'status_reason', 'notes'];
    protected $casts = ['start_date' => 'date', 'delivery_due_date' => 'date', 'contract_value' => 'decimal:2', 'additional_services_payment' => 'decimal:2'];
    public function opportunity() { return $this->belongsTo(SalesLead::class, 'sales_lead_id'); }
    public function vendor() { return $this->belongsTo(Vendor::class); }
    public function service() { return $this->belongsTo(Service::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
