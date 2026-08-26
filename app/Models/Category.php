<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Category extends Model
{
    protected static function booted(): void
    {
        static::saved(function () { Cache::forget('marketplace:categories'); Cache::forget('marketplace:categories:v2'); });
        static::deleted(function () { Cache::forget('marketplace:categories'); Cache::forget('marketplace:categories:v2'); });
    }
    protected $fillable = ['parent_id', 'name', 'slug', 'details', 'logo_data'];

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function services() { return $this->hasMany(Service::class, 'category_id'); }
    public function subcategoryServices() { return $this->hasMany(Service::class, 'subcategory_id'); }
    public function assignedUsers(): BelongsToMany { return $this->belongsToMany(User::class, 'user_subcategory_assignments', 'subcategory_id', 'user_id')->withTimestamps(); }
}
