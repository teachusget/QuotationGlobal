<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sales_leads', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('vendor_id')->constrained('users')->nullOnDelete();
            $table->index(['vendor_id', 'customer_id']);
        });
    }

    public function down(): void
    {
        Schema::table('sales_leads', function (Blueprint $table) {
            $table->dropIndex(['vendor_id', 'customer_id']);
            $table->dropConstrainedForeignId('customer_id');
        });
    }
};
