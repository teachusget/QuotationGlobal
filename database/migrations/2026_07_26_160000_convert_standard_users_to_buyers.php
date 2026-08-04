<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('users')->where('role', 'user')->update(['role' => 'buyer']);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'buyer')->update(['role' => 'user']);
    }
};
