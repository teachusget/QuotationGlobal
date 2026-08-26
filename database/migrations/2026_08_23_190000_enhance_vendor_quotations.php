<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->unsignedInteger('quote_revision')->default(0)->after('quoted_at');
            $table->json('quote_versions')->nullable()->after('quote_revision');
            $table->string('vendor_quote_attachment_name')->nullable();
            $table->string('vendor_quote_attachment_path')->nullable();
            $table->string('vendor_quote_attachment_mime', 150)->nullable();
            $table->unsignedBigInteger('vendor_quote_attachment_size')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('demo_requests', fn (Blueprint $table) => $table->dropColumn([
            'quote_revision', 'quote_versions', 'vendor_quote_attachment_name', 'vendor_quote_attachment_path',
            'vendor_quote_attachment_mime', 'vendor_quote_attachment_size',
        ]));
    }
};
