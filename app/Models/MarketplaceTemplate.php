<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceTemplate extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'thumbnail_url', 'status', 'document', 'design_tokens', 'variants', 'created_by', 'updated_by', 'archived_at'];
    protected $casts = ['document' => 'array', 'design_tokens' => 'array', 'variants' => 'array', 'archived_at' => 'datetime'];
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function updater() { return $this->belongsTo(User::class, 'updated_by'); }
}
