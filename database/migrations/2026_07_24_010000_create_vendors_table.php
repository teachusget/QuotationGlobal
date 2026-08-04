<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->string('registration_type', 20)->index();
            $table->string('name', 150)->nullable();
            $table->string('first_name', 75)->nullable();
            $table->string('last_name', 75)->nullable();
            $table->string('designation', 100)->nullable();
            $table->string('phone', 30);
            $table->string('email', 150)->index();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('company_name', 150)->nullable();
            $table->string('business_type', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendors');
    }
};
