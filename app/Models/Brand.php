<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Brand extends Model
{
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('marketplace:brands'));
        static::deleted(fn () => Cache::forget('marketplace:brands'));
    }
    protected $fillable = ['vendor_id', 'name', 'slug', 'details', 'logo_data', 'status'];

    public function assignedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_brand_assignments')->withTimestamps();
    }
}
