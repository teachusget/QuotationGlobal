<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') DB::statement("ALTER TABLE services MODIFY billing_cycle ENUM('hourly', 'daily', 'monthly', 'quarterly', 'semi_annual', 'annual') NOT NULL DEFAULT 'monthly'");
    }

    public function down(): void
    {
        DB::statement("UPDATE services SET billing_cycle = 'monthly' WHERE billing_cycle IN ('hourly', 'daily')");
        if (DB::getDriverName() === 'mysql') DB::statement("ALTER TABLE services MODIFY billing_cycle ENUM('monthly', 'quarterly', 'semi_annual', 'annual') NOT NULL DEFAULT 'monthly'");
    }
};
