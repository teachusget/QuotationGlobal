<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('customer_leads', function (Blueprint $table) {
            // Keep a non-unique index available for the existing customer FK.
            $table->index('customer_id');
            $table->dropUnique('customer_leads_customer_id_unique');
            $table->foreignId('vendor_id')->nullable()->after('customer_id')->constrained()->cascadeOnDelete();
            $table->unique(['customer_id', 'vendor_id']);
        });
    }

    public function down(): void
    {
        Schema::table('customer_leads', function (Blueprint $table) {
            $table->dropUnique(['customer_id', 'vendor_id']);
            $table->dropConstrainedForeignId('vendor_id');
            $table->unique('customer_id');
            $table->dropIndex(['customer_id']);
        });
    }
};
