<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('marketplace_page_versions', function (Blueprint $table) {
            $table->timestamp('scheduled_for')->nullable()->after('published_at')->index();
            $table->timestamp('activated_at')->nullable()->after('scheduled_for');
        });
    }

    public function down(): void
    {
        Schema::table('marketplace_page_versions', fn (Blueprint $table) => $table->dropColumn(['scheduled_for', 'activated_at']));
    }
};
