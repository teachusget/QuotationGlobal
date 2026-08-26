<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplacePage extends Model
{
    protected $fillable = ['slug', 'draft_document', 'default_template_document', 'published_version_id', 'active_template_id', 'draft_template_id', 'updated_by', 'lock_version'];
    protected $casts = ['draft_document' => 'array', 'default_template_document' => 'array', 'lock_version' => 'integer'];
    public function versions() { return $this->hasMany(MarketplacePageVersion::class); }
    public function publishedVersion() { return $this->belongsTo(MarketplacePageVersion::class, 'published_version_id'); }
    public function activeTemplate() { return $this->belongsTo(MarketplaceTemplate::class, 'active_template_id'); }
    public function draftTemplate() { return $this->belongsTo(MarketplaceTemplate::class, 'draft_template_id'); }
}
