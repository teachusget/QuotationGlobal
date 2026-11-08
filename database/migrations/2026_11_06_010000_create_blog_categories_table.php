<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('blog_categories', function (Blueprint $table) {
            $table->id(); $table->string('name')->unique(); $table->boolean('is_active')->default(true); $table->timestamps();
        });
        $now = now();
        DB::table('blog_categories')->insert(collect(['Insights', 'Buying guides', 'Technology', 'Business', 'Partner stories'])->map(fn ($name) => ['name' => $name, 'created_at' => $now, 'updated_at' => $now])->all());
    }

    public function down(): void { Schema::dropIfExists('blog_categories'); }
};
