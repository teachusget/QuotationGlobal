<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register() {}

    public function boot()
    {
        Gate::before(fn (User $user) => $user->isSuperAdmin() ? true : null);
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return url('/reset-password/'.$token).'?email='.urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
