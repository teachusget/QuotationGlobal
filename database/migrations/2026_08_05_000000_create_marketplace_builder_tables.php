<?php

use App\Support\MarketplaceDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('marketplace_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->longText('draft_document');
            $table->unsignedBigInteger('published_version_id')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('marketplace_page_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_page_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->longText('document');
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at');
            $table->timestamps();
            $table->unique(['marketplace_page_id', 'version_number'], 'marketplace_page_version_unique');
        });
        Schema::table('marketplace_pages', function (Blueprint $table) {
            $table->foreign('published_version_id')->references('id')->on('marketplace_page_versions')->nullOnDelete();
        });
        Schema::create('marketplace_media_assets', function (Blueprint $table) {
            $table->id();
            $table->string('disk', 40)->default('public');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');
            $table->string('alt_text', 255);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        $document = MarketplaceDefaults::document();
        $now = now();
        $pageId = DB::table('marketplace_pages')->insertGetId(['slug' => 'home', 'draft_document' => json_encode($document), 'created_at' => $now, 'updated_at' => $now]);
        $versionId = DB::table('marketplace_page_versions')->insertGetId(['marketplace_page_id' => $pageId, 'version_number' => 1, 'document' => json_encode($document), 'published_at' => $now, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('marketplace_pages')->where('id', $pageId)->update(['published_version_id' => $versionId]);

        $permissions = ['marketplace_builder.view', 'marketplace_builder.update', 'marketplace_builder.publish', 'marketplace_builder.manage_media'];
        foreach ($permissions as $permission) DB::table('permissions')->insertOrIgnore(['name' => $permission, 'guard_name' => 'web', 'created_at' => $now, 'updated_at' => $now]);
        $superRoleId = DB::table('roles')->where('name', 'Super Admin')->where('guard_name', 'web')->value('id');
        if ($superRoleId) foreach (DB::table('permissions')->whereIn('name', $permissions)->pluck('id') as $permissionId) DB::table('role_has_permissions')->insertOrIgnore(['permission_id' => $permissionId, 'role_id' => $superRoleId]);
    }

    public function down(): void
    {
        Schema::table('marketplace_pages', fn (Blueprint $table) => $table->dropForeign(['published_version_id']));
        Schema::dropIfExists('marketplace_media_assets');
        Schema::dropIfExists('marketplace_page_versions');
        Schema::dropIfExists('marketplace_pages');
    }
};
