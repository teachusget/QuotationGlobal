<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlogLike extends Model
{
    protected $fillable = ['blog_post_id', 'user_id', 'reaction'];
}
