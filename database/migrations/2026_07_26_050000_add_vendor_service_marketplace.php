<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $table->foreignId('vendor_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->string('status', 30)->default('approved')->after('logo_data');
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('subcategory_id')->constrained('categories')->restrictOnDelete();
            $table->foreignId('industry_id')->constrained()->restrictOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 150);
            $table->decimal('price_from', 12, 2)->nullable();
            $table->enum('billing_cycle', ['monthly', 'annual'])->default('monthly');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
        Schema::table('brands', function (Blueprint $table) { $table->dropConstrainedForeignId('vendor_id'); $table->dropColumn('status'); });
    }
};
