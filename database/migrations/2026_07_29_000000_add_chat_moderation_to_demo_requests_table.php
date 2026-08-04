<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->boolean('buyer_chat_blocked')->default(false)->after('meeting_link');
            $table->boolean('vendor_chat_blocked')->default(false)->after('buyer_chat_blocked');
        });
    }

    public function down(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->dropColumn(['buyer_chat_blocked', 'vendor_chat_blocked']);
        });
    }
};
