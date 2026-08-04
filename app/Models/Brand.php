<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    protected $fillable = ['vendor_id', 'name', 'slug', 'details', 'logo_data', 'status'];
}
