<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void { Schema::table('users', function (Blueprint $table) { $table->string('phone', 30)->nullable()->after('email'); $table->string('company_name', 150)->nullable()->after('phone'); $table->longText('company_logo_data')->nullable()->after('company_name'); $table->text('address')->nullable()->after('company_logo_data'); $table->string('city', 100)->nullable()->after('address'); $table->string('country', 100)->nullable()->after('city'); }); }
    public function down(): void { Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['phone', 'company_name', 'company_logo_data', 'address', 'city', 'country'])); }
};
