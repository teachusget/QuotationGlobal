<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('service_type', 30)->default('services')->after('name');
            $table->string('pricing_mode', 30)->default('starting_price')->after('service_type');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) { $table->dropColumn(['service_type', 'pricing_mode']); });
    }
};
