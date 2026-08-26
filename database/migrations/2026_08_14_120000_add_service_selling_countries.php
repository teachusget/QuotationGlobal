<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->boolean('sell_globally')->default(false)->after('ai_enabled');
            $table->json('selling_countries')->nullable()->after('sell_globally');
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['sell_globally', 'selling_countries']);
        });
    }
};
