<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::table('demo_requests', function (Blueprint $table) { $table->string('buyer_attachment_name')->nullable(); $table->string('buyer_attachment_path')->nullable(); $table->string('buyer_attachment_mime', 150)->nullable(); $table->unsignedBigInteger('buyer_attachment_size')->nullable(); }); }
    public function down(): void { Schema::table('demo_requests', fn (Blueprint $table) => $table->dropColumn(['buyer_attachment_name', 'buyer_attachment_path', 'buyer_attachment_mime', 'buyer_attachment_size'])); }
};
