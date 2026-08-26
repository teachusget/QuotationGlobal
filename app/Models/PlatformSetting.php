<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = ['key', 'value'];
    protected $casts = ['value' => 'array'];

    public static function allowedSellingCountries(): ?array
    {
        return static::where('key', 'allowed_selling_countries')->first()?->value;
    }
}
