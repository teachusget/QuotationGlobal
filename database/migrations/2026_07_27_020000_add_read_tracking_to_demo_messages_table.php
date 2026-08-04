<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_messages', function (Blueprint $table) {
            $table->timestamp('buyer_read_at')->nullable()->after('is_system');
            $table->timestamp('vendor_read_at')->nullable()->after('buyer_read_at');
        });
    }

    public function down(): void
    {
        Schema::table('demo_messages', function (Blueprint $table) {
            $table->dropColumn(['buyer_read_at', 'vendor_read_at']);
        });
    }
};
