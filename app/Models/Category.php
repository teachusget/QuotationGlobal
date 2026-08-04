<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
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
}
