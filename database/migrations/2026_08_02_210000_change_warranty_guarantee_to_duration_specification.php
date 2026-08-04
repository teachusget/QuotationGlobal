<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('specification_definitions')
            ->whereRaw('LOWER(name) = ?', ['warranty / guarantee'])
            ->update(['field_type' => 'duration', 'unit' => null]);
    }

    public function down(): void
    {
        DB::table('specification_definitions')
            ->whereRaw('LOWER(name) = ?', ['warranty / guarantee'])
            ->update(['field_type' => 'text']);
    }
};
