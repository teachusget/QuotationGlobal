<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceMediaAsset extends Model
{
    protected $fillable = ['disk', 'path', 'original_name', 'mime_type', 'size', 'width', 'height', 'alt_text', 'uploaded_by', 'archived_at'];
    protected $casts = ['archived_at' => 'datetime'];
    protected $appends = ['url'];
    public function getUrlAttribute(): string { return url('/api/marketplace/media/'.$this->id).'?v='.($this->updated_at?->timestamp ?? 1); }
}
