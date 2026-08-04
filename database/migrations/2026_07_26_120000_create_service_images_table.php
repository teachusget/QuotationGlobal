<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up(): void { Schema::create('service_images', function (Blueprint $table) { $table->id(); $table->foreignId('service_id')->constrained()->cascadeOnDelete(); $table->longText('image_data'); $table->unsignedInteger('sort_order')->default(0); $table->timestamps(); }); } public function down(): void { Schema::dropIfExists('service_images'); } };
