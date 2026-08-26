<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('marketplace_pages', function (Blueprint $table) {
            $table->unsignedInteger('lock_version')->default(1)->after('updated_by');
        });
        Schema::table('marketplace_page_versions', function (Blueprint $table) {
            $table->string('name', 120)->nullable()->after('version_number');
            $table->string('release_note', 500)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('marketplace_page_versions', fn (Blueprint $table) => $table->dropColumn(['name', 'release_note']));
        Schema::table('marketplace_pages', fn (Blueprint $table) => $table->dropColumn('lock_version'));
    }
};
