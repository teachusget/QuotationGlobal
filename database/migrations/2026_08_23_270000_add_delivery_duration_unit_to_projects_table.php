<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->unsignedInteger('delivery_duration')->nullable()->after('delivery_days');
            $table->string('delivery_unit', 10)->default('days')->after('delivery_duration');
        });

        DB::table('projects')->update(['delivery_duration' => DB::raw('delivery_days')]);
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['delivery_duration', 'delivery_unit']);
        });
    }
};
