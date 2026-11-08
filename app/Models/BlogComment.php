<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlogComment extends Model
{
    protected $fillable = ['blog_post_id', 'user_id', 'body'];

    public function user() { return $this->belongsTo(User::class); }
}
