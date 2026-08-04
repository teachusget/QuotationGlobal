<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecificationDefinition extends Model
{
    protected $fillable = ['service_type', 'category_id', 'subcategory_id', 'name', 'source', 'field_type', 'options', 'unit', 'is_required', 'is_comparable', 'sort_order'];
    protected $casts = ['options' => 'array', 'is_required' => 'boolean', 'is_comparable' => 'boolean'];
}
