<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\IndustryController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\DemoRequestController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\SpecificationController;
use Illuminate\Support\Facades\Route;

Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/verify-email', [AuthController::class, 'verifyEmail']);
Route::post('auth/login', [AuthController::class, 'login']);
Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);
Route::get('marketplace/services', [ServiceController::class, 'marketplace']);
Route::get('marketplace/services/{service}', [ServiceController::class, 'marketplaceShow']);
Route::get('marketplace/services/{service}/ratings', [ServiceController::class, 'ratings']);
Route::get('marketplace/categories', [CategoryController::class, 'marketplace']);
Route::get('marketplace/brands', [BrandController::class, 'marketplace']);
Route::get('marketplace/industries', [IndustryController::class, 'marketplace']);
Route::get('specifications', [SpecificationController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/user', [AuthController::class, 'user']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::middleware('not-buyer')->group(function () {
    Route::middleware('admin')->group(function () {
        Route::apiResource('categories', CategoryController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('brands', BrandController::class)->only(['update', 'destroy']);
        Route::post('industries', [IndustryController::class, 'store']);
        Route::post('brands/{brand}/approve', [BrandController::class, 'approve']);
        Route::patch('demo-requests/{demoRequest}/moderation', [DemoRequestController::class, 'moderate']);
        Route::patch('purchase-orders/{purchaseOrder}/assign-vendor', [DemoRequestController::class, 'assignPurchaseOrderVendor']);
        Route::post('vendors/{vendor}/impersonate', [AuthController::class, 'impersonateVendor']);
        Route::patch('customers/{customer}/blocked', [CustomerController::class, 'setBlocked']);
        Route::delete('customers/{customer}', [CustomerController::class, 'destroy']);
        Route::post('specifications', [SpecificationController::class, 'store']);
        Route::put('specifications/{specification}', [SpecificationController::class, 'update']);
        Route::delete('specifications/{specification}', [SpecificationController::class, 'destroy']);
    });
    Route::get('customers', [CustomerController::class, 'index']);
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('industries', [IndustryController::class, 'index']);
    Route::apiResource('vendors', VendorController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('services', [ServiceController::class, 'index']);
    Route::post('services', [ServiceController::class, 'store']);
    Route::patch('services/{service}', [ServiceController::class, 'update']);
    Route::put('services/{service}/product', [ServiceController::class, 'updateProduct']);
    Route::delete('services/{service}/product', [ServiceController::class, 'destroyProduct']);
    Route::delete('services/{service}', [ServiceController::class, 'destroy']);
    Route::patch('demo-requests/{demoRequest}', [DemoRequestController::class, 'update']);
    Route::post('brands', [BrandController::class, 'store']);
    Route::get('brands', [BrandController::class, 'index']);
    });
    Route::post('demo-requests', [DemoRequestController::class, 'store']);
    Route::post('marketplace/services/{service}/ratings', [ServiceController::class, 'rate']);
    Route::get('demo-requests', [DemoRequestController::class, 'index']);
    Route::get('quote-requests', [DemoRequestController::class, 'quoteIndex']);
    Route::post('quote-requests/{demoRequest}/send', [DemoRequestController::class, 'sendQuote']);
    Route::post('quote-requests/{demoRequest}/respond', [DemoRequestController::class, 'respondToQuote']);
    Route::post('quote-requests/{demoRequest}/purchase-order', [DemoRequestController::class, 'generatePurchaseOrder']);
    Route::post('quote-requests/{demoRequest}/purchase-order/send', [DemoRequestController::class, 'sendPurchaseOrder']);
    Route::get('purchase-orders', [DemoRequestController::class, 'purchaseOrdersIndex']);
    Route::post('demo-notifications/read', [DemoRequestController::class, 'markBuyerNotificationsRead']);
    Route::get('demo-requests/{demoRequest}/messages', [DemoRequestController::class, 'messages']);
    Route::post('demo-requests/{demoRequest}/messages', [DemoRequestController::class, 'sendMessage']);
});

Route::get('categories/{category}/logo', [CategoryController::class, 'logo']);
Route::get('brands/{brand}/logo', [BrandController::class, 'logo']);
Route::get('industries/{industry}/logo', [IndustryController::class, 'logo']);
Route::get('vendors/{vendor}/document', [VendorController::class, 'document']);
Route::get('vendors/{vendor}/logo', [VendorController::class, 'logo']);
Route::get('marketplace/service-images/{serviceImage}', [ServiceController::class, 'marketplaceImage']);
