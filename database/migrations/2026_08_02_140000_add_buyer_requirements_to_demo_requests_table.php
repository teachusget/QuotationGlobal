<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->text('quote_purpose')->nullable()->after('request_type');
            $table->unsignedInteger('expected_users')->nullable()->after('quote_purpose');
        });
    }

    public function down(): void
    {
        Schema::table('demo_requests', fn (Blueprint $table) => $table->dropColumn(['quote_purpose', 'expected_users']));
    }
};
