<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Industry extends Model
{
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
