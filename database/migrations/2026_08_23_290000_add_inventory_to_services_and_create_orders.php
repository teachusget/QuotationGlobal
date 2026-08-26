<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('sku', 80)->nullable()->after('name');
            $table->unsignedInteger('inventory_quantity')->nullable()->after('sku');
            $table->unsignedInteger('low_stock_threshold')->default(5)->after('inventory_quantity');
            $table->boolean('track_inventory')->default(false)->after('low_stock_threshold');
            $table->index(['vendor_id', 'sku']);
        });
        DB::table('services')->where('service_type', 'hardware')->orderBy('id')->each(function ($service) {
            DB::table('services')->where('id', $service->id)->update(['sku' => 'HW-'.str_pad((string) $service->id, 6, '0', STR_PAD_LEFT), 'inventory_quantity' => 10, 'track_inventory' => true]);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 40)->nullable()->unique();
            $table->foreignId('buyer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('vendor_id')->constrained()->restrictOnDelete();
            $table->string('status', 30)->default('placed')->index();
            $table->string('payment_status', 30)->default('pending')->index();
            $table->string('currency', 3)->default('USD');
            $table->decimal('subtotal', 14, 2);
            $table->decimal('tax_total', 14, 2)->default(0);
            $table->decimal('shipping_total', 14, 2)->default(0);
            $table->decimal('grand_total', 14, 2);
            $table->json('shipping_address');
            $table->text('status_reason')->nullable();
            $table->timestamp('placed_at');
            $table->timestamps();
            $table->index(['vendor_id', 'created_at']);
        });
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sku', 80);
            $table->string('product_name', 180);
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 14, 2);
            $table->decimal('line_total', 14, 2);
            $table->json('product_snapshot')->nullable();
            $table->timestamps();
        });
        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_histories');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::table('services', function (Blueprint $table) {
            $table->dropIndex(['vendor_id', 'sku']);
            $table->dropColumn(['sku', 'inventory_quantity', 'low_stock_threshold', 'track_inventory']);
        });
    }
};
