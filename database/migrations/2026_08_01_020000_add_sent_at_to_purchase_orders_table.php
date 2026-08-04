<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void { Schema::table('purchase_orders', fn (Blueprint $table) => $table->timestamp('sent_at')->nullable()->after('issued_at')); DB::table('purchase_orders')->where('status', 'issued')->update(['status' => 'draft']); }
    public function down(): void { Schema::table('purchase_orders', fn (Blueprint $table) => $table->dropColumn('sent_at')); }
};
