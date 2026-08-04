<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->string('password')->nullable()->after('last_name');
            $table->foreignId('industry_id')->nullable()->after('business_type')->constrained('industries')->nullOnDelete();
            $table->foreignId('service_category_id')->nullable()->after('industry_id')->constrained('categories')->nullOnDelete();
            $table->string('status', 30)->default('pending_approval')->after('service_category_id');
            $table->longText('document_data')->nullable()->after('status');
            $table->longText('logo_data')->nullable()->after('document_data');
        });
    }

    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_category_id');
            $table->dropConstrainedForeignId('industry_id');
            $table->dropColumn(['password', 'status', 'document_data', 'logo_data']);
        });
    }
};
