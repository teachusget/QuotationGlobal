<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE services MODIFY billing_cycle ENUM('monthly', 'quarterly', 'semi_annual', 'annual') NOT NULL DEFAULT 'monthly'");
    }

    public function down(): void
    {
        DB::statement("UPDATE services SET billing_cycle = 'annual' WHERE billing_cycle IN ('quarterly', 'semi_annual')");
        DB::statement("ALTER TABLE services MODIFY billing_cycle ENUM('monthly', 'annual') NOT NULL DEFAULT 'monthly'");
    }
};
