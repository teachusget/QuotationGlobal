<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Industry extends Model
{
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('marketplace:industries'));
        static::deleted(fn () => Cache::forget('marketplace:industries'));
    }
    protected $fillable = ['name', 'slug', 'description', 'logo_data', 'status'];

    public function services()
    {
        return $this->belongsToMany(Service::class);
    }

    public function legacyServices()
    {
        return $this->hasMany(Service::class);
    }
}
