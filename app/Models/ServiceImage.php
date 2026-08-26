<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
class ServiceImage extends Model {
    protected $fillable = ['service_id', 'image_data', 'sort_order'];
    protected static function booted(): void {
        $invalidate = fn () => Cache::put('marketplace:services:version', ((int) Cache::get('marketplace:services:version', 1)) + 1);
        static::saved($invalidate);
        static::deleted($invalidate);
    }
    public function service() { return $this->belongsTo(Service::class); }
}
