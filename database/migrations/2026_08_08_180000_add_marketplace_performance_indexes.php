<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->index(['vendor_id', 'name', 'service_type'], 'services_product_lookup_idx');
            $table->index(['service_type', 'created_at'], 'services_type_recent_idx');
            $table->index(['category_id', 'created_at'], 'services_category_recent_idx');
            $table->index(['subcategory_id', 'created_at'], 'services_subcategory_recent_idx');
        });
        Schema::table('brands', fn (Blueprint $table) => $table->index(['status', 'name'], 'brands_status_name_idx'));
        Schema::table('industries', fn (Blueprint $table) => $table->index(['status', 'name'], 'industries_status_name_idx'));
        Schema::table('brand_service', fn (Blueprint $table) => $table->index(['brand_id', 'service_id'], 'brand_service_brand_lookup_idx'));
        Schema::table('industry_service', fn (Blueprint $table) => $table->index(['industry_id', 'service_id'], 'industry_service_industry_lookup_idx'));
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropIndex('services_product_lookup_idx');
            $table->dropIndex('services_type_recent_idx');
            $table->dropIndex('services_category_recent_idx');
            $table->dropIndex('services_subcategory_recent_idx');
        });
        Schema::table('brands', fn (Blueprint $table) => $table->dropIndex('brands_status_name_idx'));
        Schema::table('industries', fn (Blueprint $table) => $table->dropIndex('industries_status_name_idx'));
        Schema::table('brand_service', fn (Blueprint $table) => $table->dropIndex('brand_service_brand_lookup_idx'));
        Schema::table('industry_service', fn (Blueprint $table) => $table->dropIndex('industry_service_industry_lookup_idx'));
    }
};
