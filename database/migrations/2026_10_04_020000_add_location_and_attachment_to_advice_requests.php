<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('advice_requests', function (Blueprint $table) {
            $table->string('country', 100)->nullable()->after('email');
            $table->string('city', 100)->nullable()->after('country');
            $table->string('attachment_name')->nullable()->after('requirements');
            $table->string('attachment_path')->nullable()->after('attachment_name');
            $table->string('attachment_mime', 150)->nullable()->after('attachment_path');
            $table->unsignedBigInteger('attachment_size')->nullable()->after('attachment_mime');
        });
    }

    public function down(): void
    {
        Schema::table('advice_requests', fn (Blueprint $table) => $table->dropColumn(['country', 'city', 'attachment_name', 'attachment_path', 'attachment_mime', 'attachment_size']));
    }
};
