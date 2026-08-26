<?php

use App\Support\MarketplaceDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketplace_pages', function (Blueprint $table) {
            $table->longText('default_template_document')->nullable()->after('draft_document');
        });

        DB::table('marketplace_pages')->orderBy('id')->get()->each(function ($page) {
            $published = $page->published_version_id
                ? DB::table('marketplace_page_versions')->where('id', $page->published_version_id)->value('document')
                : null;
            DB::table('marketplace_pages')->where('id', $page->id)->update([
                'default_template_document' => $published ?: $page->draft_document ?: json_encode(MarketplaceDefaults::document()),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('marketplace_pages', fn (Blueprint $table) => $table->dropColumn('default_template_document'));
    }
};
