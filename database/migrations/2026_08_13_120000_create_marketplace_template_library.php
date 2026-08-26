<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->string('description', 500)->nullable();
            $table->string('thumbnail_url', 500)->nullable();
            $table->string('status', 20)->default('active')->index();
            $table->longText('document');
            $table->json('design_tokens')->nullable();
            $table->json('variants')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        Schema::create('marketplace_template_backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_page_id')->constrained()->cascadeOnDelete();
            $table->foreignId('applied_template_id')->nullable()->constrained('marketplace_templates')->nullOnDelete();
            $table->longText('document');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('marketplace_pages', function (Blueprint $table) {
            $table->foreignId('active_template_id')->nullable()->after('published_version_id')->constrained('marketplace_templates')->nullOnDelete();
            $table->foreignId('draft_template_id')->nullable()->after('active_template_id')->constrained('marketplace_templates')->nullOnDelete();
        });
        Schema::table('marketplace_page_versions', fn (Blueprint $table) => $table->foreignId('marketplace_template_id')->nullable()->after('marketplace_page_id')->constrained('marketplace_templates')->nullOnDelete());

        $page = DB::table('marketplace_pages')->where('slug', 'home')->first();
        if ($page) {
            $publishedDocument = $page->published_version_id
                ? DB::table('marketplace_page_versions')->where('id', $page->published_version_id)->value('document')
                : null;
            $publishedPreset = data_get(json_decode($publishedDocument ?: '{}', true), 'theme.preset');
            $document = $page->default_template_document ?: $page->draft_document;
            $decoded = json_decode($document, true) ?: [];
            $decoded['theme']['preset'] = 'neon-nexus';
            $document = json_encode($decoded);
            $now = now();
            $templateId = DB::table('marketplace_templates')->insertGetId([
                'name' => 'Neon Nexus Marketplace',
                'slug' => 'neon-nexus-marketplace',
                'description' => 'Protected navy, cyan and violet marketplace theme with featured ads and responsive catalog sections.',
                'status' => 'active',
                'document' => $document,
                'design_tokens' => json_encode($decoded['theme'] ?? []),
                'variants' => json_encode(['header' => 'neon-glass', 'hero' => 'neon-showcase', 'featured_ad' => 'trust-panel', 'category' => 'tile-grid', 'product_card' => 'classic', 'footer' => 'classic']),
                'created_by' => $page->updated_by,
                'updated_by' => $page->updated_by,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $versionId = $page->published_version_id;
            if ($publishedPreset === 'neon-nexus' && $versionId) {
                DB::table('marketplace_page_versions')->where('id', $versionId)->update(['marketplace_template_id' => $templateId]);
            } else {
                $versionNumber = ((int) DB::table('marketplace_page_versions')->where('marketplace_page_id', $page->id)->max('version_number')) + 1;
                $versionId = DB::table('marketplace_page_versions')->insertGetId([
                    'marketplace_page_id' => $page->id,
                    'marketplace_template_id' => $templateId,
                    'version_number' => $versionNumber,
                    'name' => 'Neon Nexus rollback',
                    'release_note' => 'Restored the protected Neon Nexus theme while retaining the previous Orbit version in history.',
                    'document' => $document,
                    'published_by' => $page->updated_by,
                    'published_at' => $now,
                    'activated_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
            DB::table('marketplace_pages')->where('id', $page->id)->update([
                'draft_document' => $document,
                'default_template_document' => $document,
                'published_version_id' => $versionId,
                'active_template_id' => $templateId,
                'draft_template_id' => $templateId,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('marketplace_page_versions', fn (Blueprint $table) => $table->dropConstrainedForeignId('marketplace_template_id'));
        Schema::table('marketplace_pages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('draft_template_id');
            $table->dropConstrainedForeignId('active_template_id');
        });
        Schema::dropIfExists('marketplace_template_backups');
        Schema::dropIfExists('marketplace_templates');
    }
};
