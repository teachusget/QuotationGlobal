<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Service extends Model
{
    protected static function booted(): void
    {
        static::saved(function () {
            Cache::put('marketplace:services:version', ((int) Cache::get('marketplace:services:version', 1)) + 1);
            Cache::forget('marketplace:categories');
            Cache::forget('marketplace:categories:v2');
        });
        static::deleted(function () {
            Cache::put('marketplace:services:version', ((int) Cache::get('marketplace:services:version', 1)) + 1);
            Cache::forget('marketplace:categories');
            Cache::forget('marketplace:categories:v2');
        });
    }
    protected $fillable = ['vendor_id', 'category_id', 'subcategory_id', 'industry_id', 'brand_id', 'name', 'sku', 'inventory_quantity', 'low_stock_threshold', 'track_inventory', 'features', 'image_data', 'certificates', 'service_type', 'deployment', 'ai_enabled', 'sell_globally', 'selling_countries', 'pricing_mode', 'price_from', 'monthly_price', 'discount_percent', 'billing_cycle'];

    protected $casts = [
        'ai_enabled' => 'boolean',
        'sell_globally' => 'boolean',
        'selling_countries' => 'array',
        'certificates' => 'array',
        'track_inventory' => 'boolean',
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
