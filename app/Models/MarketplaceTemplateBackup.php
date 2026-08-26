<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceTemplateBackup extends Model
{
    protected $fillable = ['marketplace_page_id', 'applied_template_id', 'document', 'created_by'];
    protected $casts = ['document' => 'array'];
}
