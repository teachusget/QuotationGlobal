<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->decimal('quoted_price', 14, 2)->nullable()->after('buyer_notification_read_at');
            $table->text('quote_message')->nullable()->after('quoted_price');
            $table->text('quote_terms')->nullable()->after('quote_message');
            $table->date('quote_valid_until')->nullable()->after('quote_terms');
            $table->timestamp('quoted_at')->nullable()->after('quote_valid_until');
            $table->timestamp('buyer_quote_response_at')->nullable()->after('quoted_at');
        });
    }

    public function down(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->dropColumn(['quoted_price', 'quote_message', 'quote_terms', 'quote_valid_until', 'quoted_at', 'buyer_quote_response_at']);
        });
    }
};
