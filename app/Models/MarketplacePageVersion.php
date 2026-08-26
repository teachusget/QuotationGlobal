<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplacePageVersion extends Model
{
    protected $fillable = ['marketplace_page_id', 'marketplace_template_id', 'version_number', 'name', 'release_note', 'document', 'published_by', 'published_at', 'scheduled_for', 'activated_at'];
    protected $casts = ['document' => 'array', 'published_at' => 'datetime', 'scheduled_for' => 'datetime', 'activated_at' => 'datetime'];
    public function publisher() { return $this->belongsTo(User::class, 'published_by'); }
    public function template() { return $this->belongsTo(MarketplaceTemplate::class, 'marketplace_template_id'); }
}
