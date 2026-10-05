<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('advice_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('email', 190);
            $table->string('phone', 40);
            $table->unsignedInteger('employees');
            $table->string('status', 30)->default('pending')->index();
            $table->timestamp('meeting_at')->nullable();
            $table->string('meeting_link', 500)->nullable();
            $table->boolean('chat_enabled')->default(false);
            $table->timestamps();
        });

        Schema::create('advice_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advice_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('message');
            $table->boolean('is_system')->default(false);
            $table->timestamp('buyer_read_at')->nullable();
            $table->timestamp('admin_read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('advice_messages');
        Schema::dropIfExists('advice_requests');
    }
};
