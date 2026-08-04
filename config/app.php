<?php

use App\Providers\AppServiceProvider;
use App\Providers\RouteServiceProvider;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\ServiceProvider;

return [
    'name' => env('APP_NAME', 'Laravel'), 'env' => env('APP_ENV', 'production'), 'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'), 'asset_url' => env('ASSET_URL'), 'timezone' => 'Asia/Karachi', 'locale' => 'en', 'fallback_locale' => 'en', 'faker_locale' => 'en_US',
    'key' => env('APP_KEY'), 'cipher' => 'AES-256-CBC',
    'providers' => ServiceProvider::defaultProviders()->merge([AppServiceProvider::class, RouteServiceProvider::class])->toArray(),
    'aliases' => Facade::defaultAliases()->toArray(),
];
