<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->json('quote_data')->nullable()->after('quote_terms');
        });
    }

    public function down(): void
    {
        Schema::table('demo_requests', fn (Blueprint $table) => $table->dropColumn('quote_data'));
    }
};
