<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void { Schema::table('users', function (Blueprint $table) { $table->string('email_verification_code')->nullable()->after('email_verified_at'); $table->timestamp('email_verification_expires_at')->nullable()->after('email_verification_code'); }); DB::table('users')->where('role', 'buyer')->whereNull('email_verified_at')->update(['email_verified_at' => now()]); }
    public function down(): void { Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['email_verification_code', 'email_verification_expires_at'])); }
};
