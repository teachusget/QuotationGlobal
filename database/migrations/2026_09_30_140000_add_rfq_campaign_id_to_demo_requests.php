<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->uuid('rfq_campaign_id')->nullable()->after('id');
            $table->index('rfq_campaign_id');
        });
    }

    public function down(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->dropIndex(['rfq_campaign_id']);
            $table->dropColumn('rfq_campaign_id');
        });
    }
};
