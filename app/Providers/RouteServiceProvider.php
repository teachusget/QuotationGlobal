<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/';

    public function boot()
    {
        $this->configureRateLimiting();
        $this->routes(function () {
            Route::middleware('api')->prefix('api')->group(base_path('routes/api.php'));
            Route::middleware('web')->group(base_path('routes/web.php'));
        });
    }

    protected function configureRateLimiting()
    {
        RateLimiter::for('api', function (Request $request) {
            $token = $request->bearerToken();
            $key = $token ? 'token:'.hash('sha256', $token) : 'ip:'.$request->ip();
            return Limit::perMinute($token ? 300 : 120)->by($key);
        });
        RateLimiter::for('marketplace-media', fn (Request $request) => Limit::perMinute(2000)->by(
            'media:'.$request->ip()
        ));
        RateLimiter::for('authentication', fn (Request $request) => Limit::perMinute(10)->by(
            $request->ip().'|'.mb_strtolower((string) ($request->input('login') ?: $request->input('email')))
        ));
        RateLimiter::for('password-reset', fn (Request $request) => Limit::perMinute(5)->by(
            $request->ip().'|'.mb_strtolower((string) $request->input('email'))
        ));
    }
}
