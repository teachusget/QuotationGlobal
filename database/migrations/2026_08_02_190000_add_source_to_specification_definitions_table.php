<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::table('specification_definitions', fn (Blueprint $table) => $table->string('source', 30)->default('template')->after('name')); }
    public function down(): void { Schema::table('specification_definitions', fn (Blueprint $table) => $table->dropColumn('source')); }
};
