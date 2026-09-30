<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['buyer_id']);
            $table->unsignedBigInteger('buyer_id')->nullable()->change();
            $table->foreign('buyer_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['buyer_id']);
            $table->unsignedBigInteger('buyer_id')->nullable(false)->change();
            $table->foreign('buyer_id')->references('id')->on('users')->restrictOnDelete();
        });
    }
};
