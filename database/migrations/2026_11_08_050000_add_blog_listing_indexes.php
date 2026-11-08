<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->index(['category', 'status', 'published_at'], 'blog_posts_category_status_published_idx');
            $table->index(['title', 'published_at'], 'blog_posts_title_published_idx');
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropIndex('blog_posts_category_status_published_idx');
            $table->dropIndex('blog_posts_title_published_idx');
        });
    }
};
