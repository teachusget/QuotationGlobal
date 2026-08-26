<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotificationState extends Model
{
    protected $fillable = ['user_id', 'notification_key', 'read_at', 'cleared_at'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime', 'cleared_at' => 'datetime'];
    }
}
