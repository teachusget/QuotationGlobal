<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->string('currently_using', 40)->nullable()->after('expected_users');
            $table->string('current_brand_name', 150)->nullable()->after('currently_using');
        });
    }

    public function down(): void
    {
        Schema::table('demo_requests', fn (Blueprint $table) => $table->dropColumn(['currently_using', 'current_brand_name']));
    }
};
