<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register() {}

    public function boot()
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return url('/reset-password/'.$token).'?email='.urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
