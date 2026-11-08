<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BlogPost extends Model
{
    protected $fillable = ['author_id', 'title', 'slug', 'excerpt', 'content', 'cover_image_url', 'youtube_video_id', 'external_link', 'gallery_images', 'category', 'tags', 'status', 'published_at'];
    protected $casts = ['tags' => 'array', 'gallery_images' => 'array', 'published_at' => 'datetime'];

    public function author() { return $this->belongsTo(User::class, 'author_id'); }
    public function getRouteKeyName() { return 'slug'; }

    public static function makeSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'untitled-post'; $slug = $base; $count = 2;
        while (static::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '<>', $ignoreId))->exists()) $slug = $base.'-'.$count++;
        return $slug;
    }
}
