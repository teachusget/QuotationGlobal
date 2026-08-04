<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $fillable = ['vendor_id', 'category_id', 'subcategory_id', 'industry_id', 'brand_id', 'name', 'features', 'image_data', 'service_type', 'ai_enabled', 'pricing_mode', 'price_from', 'monthly_price', 'discount_percent', 'billing_cycle'];

    protected $casts = [
        'ai_enabled' => 'boolean',
    ];

    public function vendor() { return $this->belongsTo(Vendor::class); }
    public function category() { return $this->belongsTo(Category::class); }
    public function subcategory() { return $this->belongsTo(Category::class, 'subcategory_id'); }
    public function industry() { return $this->belongsTo(Industry::class); }
    public function industries() { return $this->belongsToMany(Industry::class); }
    public function brand() { return $this->belongsTo(Brand::class); }
    public function brands() { return $this->belongsToMany(Brand::class); }
    public function images() { return $this->hasMany(ServiceImage::class)->orderBy('sort_order'); }
    public function ratings() { return $this->hasMany(ServiceRating::class); }
    public function specificationValues() { return $this->hasMany(ServiceSpecificationValue::class); }
}
