<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('users', fn (Blueprint $table) => $table->string('account_type', 30)->nullable()->after('role'));
        DB::table('users')->update(['account_type' => DB::raw("CASE role WHEN 'vendor' THEN 'vendor' WHEN 'buyer' THEN 'buyer' ELSE 'staff' END")]);
        foreach (['Super Admin', 'Buyer', 'Vendor'] as $name) DB::table('roles')->insert(['name' => $name, 'guard_name' => 'web', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()]);
        $roles = DB::table('roles')->pluck('id', 'name');
        DB::table('users')->orderBy('id')->get()->each(function ($user) use ($roles) { DB::table('model_has_roles')->insert(['role_id' => $roles[$user->role === 'buyer' ? 'Buyer' : ($user->role === 'vendor' ? 'Vendor' : 'Super Admin')], 'model_type' => App\Models\User::class, 'model_id' => $user->id]); });
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('role'));
        app(Database\Seeders\RbacSeeder::class)->run();
    }
    public function down(): void {
        Schema::table('users', fn (Blueprint $table) => $table->string('role', 30)->default('buyer')->after('password'));
        DB::table('users')->update(['role' => DB::raw("CASE account_type WHEN 'vendor' THEN 'vendor' WHEN 'buyer' THEN 'buyer' ELSE 'admin' END")]);
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('account_type'));
    }
};
