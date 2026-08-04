<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_messages', function (Blueprint $table) {
            $table->timestamp('admin_read_at')->nullable()->after('vendor_read_at');
        });
    }

    public function down(): void
    {
        Schema::table('demo_messages', function (Blueprint $table) {
            $table->dropColumn('admin_read_at');
        });
    }
};
