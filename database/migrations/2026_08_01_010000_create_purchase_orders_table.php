<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void { Schema::create('purchase_orders', function (Blueprint $table) { $table->id(); $table->string('po_number', 40)->unique(); $table->foreignId('demo_request_id')->unique()->constrained()->cascadeOnDelete(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->foreignId('vendor_id')->constrained()->cascadeOnDelete(); $table->decimal('total_amount', 14, 2); $table->string('currency', 10)->default('PKR'); $table->string('status', 30)->default('issued'); $table->json('order_data'); $table->timestamp('issued_at'); $table->timestamps(); }); }
    public function down(): void { Schema::dropIfExists('purchase_orders'); }
};
