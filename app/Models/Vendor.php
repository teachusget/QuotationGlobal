<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vendor extends Model
{
    protected $fillable = [
        'registration_type',
        'user_id',
        'name',
        'first_name',
        'last_name',
        'password',
        'designation',
        'phone',
        'email',
        'country',
        'address',
        'city',
        'company_name',
        'business_type',
        'industry_id',
        'service_category_id',
        'status',
        'document_data',
        'logo_data',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    public function serviceCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'service_category_id');
    }

    public function services()
    {
        return $this->hasMany(Service::class);
    }
}
