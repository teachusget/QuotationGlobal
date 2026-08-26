<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('project_number', 40)->nullable()->unique();
            $table->foreignId('sales_lead_id')->unique()->constrained('sales_leads')->cascadeOnDelete();
            $table->foreignId('vendor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name', 180);
            $table->date('start_date');
            $table->unsignedInteger('delivery_days');
            $table->date('delivery_due_date')->index();
            $table->string('payment_model', 30)->default('one_time');
            $table->string('billing_frequency', 30)->nullable();
            $table->decimal('contract_value', 14, 2)->nullable();
            $table->text('payment_terms')->nullable();
            $table->string('status', 30)->default('planning')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['vendor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
