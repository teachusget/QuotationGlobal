<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('specification_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('service_type', 30)->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name', 120);
            $table->string('field_type', 30)->default('boolean');
            $table->json('options')->nullable();
            $table->string('unit', 30)->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_comparable')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
        Schema::create('service_specification_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->foreignId('specification_definition_id')->constrained()->cascadeOnDelete();
            $table->text('value')->nullable();
            $table->timestamps();
            $table->unique(['service_id', 'specification_definition_id'], 'service_spec_value_unique');
        });
        $now = now();
        $definitions = [
            [null, 'Support available', 'boolean', null], [null, 'Implementation / delivery time', 'text', null], [null, 'Warranty / guarantee', 'text', null],
            ['software', 'Deployment', 'select', ['Cloud', 'On-premise', 'Hybrid']], ['software', 'Platforms', 'multiselect', ['Web', 'Windows', 'macOS', 'Android', 'iOS']], ['software', 'API available', 'boolean', null], ['software', 'Free trial', 'boolean', null], ['software', 'Data migration', 'boolean', null], ['software', 'Training included', 'boolean', null], ['software', 'Maximum users', 'number', null],
            ['hardware', 'Manufacturer / model', 'text', null], ['hardware', 'Condition', 'select', ['New', 'Used', 'Refurbished']], ['hardware', 'Warranty', 'text', null], ['hardware', 'Stock availability', 'boolean', null], ['hardware', 'Minimum order quantity', 'number', null], ['hardware', 'Installation included', 'boolean', null],
            ['services', 'Delivery method', 'select', ['Remote', 'On-site', 'Hybrid']], ['services', 'Estimated duration', 'text', null], ['services', 'Team size', 'number', null], ['services', 'Certifications', 'text', null], ['services', 'Support period', 'text', null], ['services', 'Response time / SLA', 'text', null], ['services', 'Revisions included', 'number', null],
        ];
        foreach ($definitions as $order => [$type, $name, $fieldType, $options]) DB::table('specification_definitions')->insert(['service_type' => $type, 'name' => $name, 'field_type' => $fieldType, 'options' => $options ? json_encode($options) : null, 'is_required' => false, 'is_comparable' => true, 'sort_order' => $order, 'created_at' => $now, 'updated_at' => $now]);
    }
    public function down(): void
    {
        Schema::dropIfExists('service_specification_values');
        Schema::dropIfExists('specification_definitions');
    }
};
