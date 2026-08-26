<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->foreignId('quote_sent_by')->nullable()->after('quoted_at')->constrained('users')->nullOnDelete();
        });

        DB::table('vendors')->select(['id', 'user_id'])->orderBy('id')->each(function ($vendor) {
            DB::table('demo_requests')
                ->where('vendor_id', $vendor->id)
                ->whereNotNull('quoted_at')
                ->whereNull('quote_sent_by')
                ->update(['quote_sent_by' => $vendor->user_id]);
        });
    }

    public function down(): void
    {
        Schema::table('demo_requests', fn (Blueprint $table) => $table->dropConstrainedForeignId('quote_sent_by'));
    }
};
