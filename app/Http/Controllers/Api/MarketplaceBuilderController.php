<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Industry;
use App\Models\MarketplaceMediaAsset;
use App\Models\MarketplacePage;
use App\Models\MarketplacePageVersion;
use App\Models\MarketplaceTemplate;
use App\Models\Service;
use App\Support\Audit;
use App\Support\MarketplaceDefaults;
use App\Support\MarketplaceDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MarketplaceBuilderController extends Controller
{
    public function show()
    {
        $page = $this->page()->load(['publishedVersion:id,version_number,published_at', 'activeTemplate:id,name', 'draftTemplate:id,name']);
        return response()->json(['data' => ['id' => $page->id, 'draft_document' => $page->draft_document, 'published_version' => $page->publishedVersion, 'active_template' => $page->activeTemplate, 'draft_template' => $page->draftTemplate, 'updated_at' => $page->updated_at, 'lock_version' => $page->lock_version]]);
    }

    public function saveDraft(Request $request)
    {
        abort_if(strlen($request->getContent()) > 2_000_000, 413, 'Marketplace document cannot exceed 2 MB.');
        $data = $request->validate(['document' => ['required', 'array'], 'lock_version' => ['required', 'integer', 'min:1']]);
        $document = MarketplaceDocument::validate($data['document']);
        $page = $this->page();
        if ((int) $data['lock_version'] !== $page->lock_version) throw \Illuminate\Validation\ValidationException::withMessages(['lock_version' => ['This draft was updated by another administrator. Reload before saving your changes.']]);
        $before = $this->summary($page->draft_document);
        $page->update(['draft_document' => $document, 'updated_by' => $request->user()->id, 'lock_version' => $page->lock_version + 1]);
        Audit::record($request, 'marketplace.draft_saved', $page, $before, $this->summary($document));
        return response()->json(['message' => 'Marketplace draft saved.', 'data' => ['updated_at' => $page->updated_at, 'lock_version' => $page->lock_version]]);
    }

    public function publish(Request $request)
    {
        $data = $request->validate(['name' => ['nullable', 'string', 'max:120'], 'release_note' => ['nullable', 'string', 'max:500']]);
        $page = $this->page();
        $document = MarketplaceDocument::validate($page->draft_document, true);
        $version = DB::transaction(function () use ($request, $page, $document, $data) {
            $locked = MarketplacePage::whereKey($page->id)->lockForUpdate()->firstOrFail();
            $number = ((int) $locked->versions()->max('version_number')) + 1;
            $version = $locked->versions()->create(['marketplace_template_id' => $locked->draft_template_id, 'version_number' => $number, 'name' => trim($data['name'] ?? '') ?: null, 'release_note' => trim($data['release_note'] ?? '') ?: null, 'document' => $document, 'published_by' => $request->user()->id, 'published_at' => now(), 'activated_at' => now()]);
            $locked->update(['published_version_id' => $version->id, 'active_template_id' => $locked->draft_template_id, 'updated_by' => $request->user()->id]);
            return $version;
        });
        Audit::record($request, 'marketplace.published', $page, null, ['version' => $version->version_number, ...$this->summary($document)]);
        return response()->json(['message' => "Marketplace version {$version->version_number} published.", 'data' => $version->only(['id', 'version_number', 'published_at'])]);
    }

    public function schedule(Request $request)
    {
        $data = $request->validate(['scheduled_for' => ['required', 'date', 'after:now'], 'name' => ['nullable', 'string', 'max:120'], 'release_note' => ['nullable', 'string', 'max:500']]);
        $page = $this->page();
        $document = MarketplaceDocument::validate($page->draft_document, true);
        $version = DB::transaction(function () use ($request, $page, $document, $data) {
            $locked = MarketplacePage::whereKey($page->id)->lockForUpdate()->firstOrFail();
            $number = ((int) $locked->versions()->max('version_number')) + 1;
            return $locked->versions()->create(['marketplace_template_id' => $locked->draft_template_id, 'version_number' => $number, 'name' => trim($data['name'] ?? '') ?: null, 'release_note' => trim($data['release_note'] ?? '') ?: null, 'document' => $document, 'published_by' => $request->user()->id, 'published_at' => $data['scheduled_for'], 'scheduled_for' => $data['scheduled_for']]);
        });
        Audit::record($request, 'marketplace.publish_scheduled', $page, null, ['version' => $version->version_number, 'scheduled_for' => $version->scheduled_for, ...$this->summary($document)]);
        return response()->json(['message' => "Marketplace version {$version->version_number} scheduled.", 'data' => $version->only(['id', 'version_number', 'scheduled_for'])]);
    }

    public function versions()
    {
        $page = $this->page();
        return response()->json(['data' => $page->versions()->with(['publisher:id,name,email', 'template:id,name'])->latest('version_number')->get(['id', 'marketplace_page_id', 'marketplace_template_id', 'version_number', 'name', 'release_note', 'published_by', 'published_at', 'scheduled_for', 'activated_at'])]);
    }

    public function restore(Request $request, MarketplacePageVersion $version)
    {
        $page = $this->page();
        abort_unless($version->marketplace_page_id === $page->id, 404);
        MarketplaceDocument::validate($version->document);
        $before = $this->summary($page->draft_document);
        $page->update(['draft_document' => $version->document, 'draft_template_id' => $version->marketplace_template_id, 'updated_by' => $request->user()->id, 'lock_version' => $page->lock_version + 1]);
        Audit::record($request, 'marketplace.version_restored', $page, $before, ['restored_version' => $version->version_number, ...$this->summary($version->document)]);
        return response()->json(['message' => "Version {$version->version_number} restored to draft.", 'data' => ['draft_document' => $version->document, 'updated_at' => $page->updated_at, 'lock_version' => $page->lock_version]]);
    }

    public function resetToDefaultTemplate(Request $request)
    {
        $data = $request->validate(['lock_version' => ['required', 'integer', 'min:1']]);
        $page = $this->page();
        if ((int) $data['lock_version'] !== $page->lock_version) throw \Illuminate\Validation\ValidationException::withMessages(['lock_version' => ['This draft was updated by another administrator. Reload before resetting the template.']]);
        $record = MarketplaceTemplate::where('slug', 'neon-nexus-marketplace')->where('status', 'active')->first();
        $template = MarketplaceDocument::validate($record?->document ?: $page->default_template_document ?: MarketplaceDefaults::document());
        $before = $this->summary($page->draft_document);
        $page->update(['draft_document' => $template, 'draft_template_id' => $record?->id, 'updated_by' => $request->user()->id, 'lock_version' => $page->lock_version + 1]);
        Audit::record($request, 'marketplace.template_reset', $page, $before, ['template' => 'neon-nexus-marketplace', ...$this->summary($template)]);
        return response()->json(['message' => 'Neon Nexus Marketplace template restored to the draft.', 'data' => ['draft_document' => $template, 'updated_at' => $page->updated_at, 'lock_version' => $page->lock_version]]);
    }

    public function saveDefaultTemplate(Request $request)
    {
        $data = $request->validate(['lock_version' => ['required', 'integer', 'min:1']]);
        $page = $this->page();
        if ((int) $data['lock_version'] !== $page->lock_version) throw \Illuminate\Validation\ValidationException::withMessages(['lock_version' => ['This draft was updated by another administrator. Reload before saving the template.']]);
        $template = MarketplaceDocument::validate($page->draft_document);
        $record = MarketplaceTemplate::firstOrNew(['slug' => 'neon-nexus-marketplace']);
        $record->fill(['name' => 'Neon Nexus Marketplace', 'description' => 'Protected navy, cyan and violet marketplace theme.', 'status' => 'active', 'document' => $template, 'design_tokens' => $template['theme'], 'variants' => $record->variants ?: [], 'created_by' => $record->created_by ?: $request->user()->id, 'updated_by' => $request->user()->id])->save();
        $page->update(['default_template_document' => $template, 'updated_by' => $request->user()->id]);
        Audit::record($request, 'marketplace.template_saved', $page, null, ['template' => 'neon-nexus-marketplace', ...$this->summary($template)]);
        return response()->json(['message' => 'Neon Nexus Marketplace saved as the protected template.', 'data' => ['section_count' => count($template['sections'] ?? []), 'lock_version' => $page->lock_version]]);
    }

    public function catalog()
    {
        return response()->json(['data' => [
            'categories' => Category::orderBy('name')->get(['id', 'name'])->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'logo_url' => $row->logo_data ? url("/api/categories/{$row->id}/logo") : null]),
            'brands' => Brand::where('status', 'approved')->orderBy('name')->get(['id', 'name'])->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'logo_url' => $row->logo_data ? url("/api/brands/{$row->id}/logo") : null]),
            'industries' => Industry::where('status', 'active')->orderBy('name')->get(['id', 'name'])->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'logo_url' => $row->logo_data ? url("/api/industries/{$row->id}/logo") : null]),
            'services' => Service::with(['vendor:id,company_name,name', 'images:id,service_id,sort_order'])->latest()->get()->unique(fn ($row) => "{$row->vendor_id}|{$row->name}|{$row->service_type}")->values()->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'service_type' => $row->service_type, 'vendor' => $row->vendor?->company_name ?: $row->vendor?->name, 'image_url' => $row->images->first() ? url("/api/marketplace/service-images/{$row->images->first()->id}") : null]),
        ]]);
    }

    public function publicPage()
    {
        $this->activateScheduledVersions();
        $page = MarketplacePage::where('slug', 'home')->with('publishedVersion')->first();
        $publishedDocument = $page?->publishedVersion?->document;
        $cacheKey = 'marketplace.page.published.'.($page?->published_version_id ?: 'default').'.'.substr(hash('sha256', json_encode($publishedDocument)), 0, 16);
        return response()->json(['data' => Cache::remember($cacheKey, 300, function () use ($page) {
            $document = $page?->publishedVersion?->document ?: MarketplaceDefaults::document();
            $ids = MarketplaceDocument::mediaIds($document);
            $media = MarketplaceMediaAsset::whereIn('id', $ids)->whereNull('archived_at')->get()->mapWithKeys(fn ($asset) => [(string) $asset->id => ['id' => $asset->id, 'url' => $asset->url, 'alt_text' => $asset->alt_text, 'width' => $asset->width, 'height' => $asset->height]])->all();
            return ['document' => $document, 'media' => $media, 'catalog' => $this->resolvedCatalog($document), 'version' => $page?->publishedVersion?->version_number];
        })]);
    }

    private function activateScheduledVersions(): void
    {
        $due = MarketplacePageVersion::whereNotNull('scheduled_for')->whereNull('activated_at')->where('scheduled_for', '<=', now())->orderBy('scheduled_for')->get()->groupBy('marketplace_page_id');
        foreach ($due as $pageId => $versions) DB::transaction(function () use ($pageId, $versions) {
            $page = MarketplacePage::whereKey($pageId)->lockForUpdate()->first();
            $version = $versions->last();
            if (! $page || ! $version) return;
            $page->update(['published_version_id' => $version->id, 'active_template_id' => $version->marketplace_template_id]);
            $version->update(['activated_at' => now()]);
            MarketplacePageVersion::whereIn('id', $versions->pluck('id')->filter(fn ($id) => $id !== $version->id))->whereNull('activated_at')->update(['activated_at' => now()]);
        });
    }

    private function page(): MarketplacePage
    {
        $defaults = MarketplaceDefaults::document();
        $page = MarketplacePage::firstOrCreate(['slug' => 'home'], ['draft_document' => $defaults, 'default_template_document' => $defaults]);
        if (! $page->default_template_document) $page->update(['default_template_document' => $page->publishedVersion?->document ?: $page->draft_document ?: $defaults]);
        return $page;
    }

    private function summary(array $document): array
    {
        return ['document_hash' => hash('sha256', json_encode($document)), 'section_count' => count($document['sections'] ?? []), 'section_types' => collect($document['sections'] ?? [])->pluck('type')->values()->all()];
    }

    private function resolvedCatalog(array $document): array
    {
        $wanted = ['categories' => [], 'brands' => [], 'industries' => [], 'services' => []];
        $types = ['category_grid' => 'categories', 'brand_grid' => 'brands', 'industry_grid' => 'industries', 'product_grid' => 'services'];
        $walk = function (array $blocks) use (&$walk, &$wanted, $types) {
            foreach ($blocks as $block) {
                if (isset($types[$block['type'] ?? ''])) $wanted[$types[$block['type']]] = array_values(array_unique([...$wanted[$types[$block['type']]], ...array_map('intval', data_get($block, 'settings.catalog_ids', []))]));
                if (($block['type'] ?? '') === 'hero') $wanted['services'] = array_values(array_unique([...$wanted['services'], ...array_map('intval', array_column(data_get($block, 'settings.featured_ads', []), 'service_id'))]));
                $children = data_get($block, 'settings.children', []);
                if (is_array($children)) $walk($children);
            }
        };
        $walk($document['sections'] ?? []);
        foreach (['center', 'footer'] as $placement) $wanted['services'] = array_values(array_unique([...$wanted['services'], ...array_map('intval', array_column(data_get($document, "advertisements.$placement", []), 'service_id'))]));
        $simple = fn ($query, string $kind) => $query->get()->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'logo_url' => $row->logo_data ? url("/api/$kind/{$row->id}/logo") : null])->values();
        $services = Service::whereIn('id', $wanted['services'])->with(['vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'brand:id,name', 'brands:id,name', 'industries:id,name', 'images' => fn ($query) => $query->select('id', 'service_id', 'sort_order')->orderBy('sort_order')->limit(1)])->get()->map(function ($row) {
            return ['id' => $row->id, 'name' => $row->name, 'service_type' => $row->service_type, 'price_from' => $row->price_from, 'vendor' => $row->vendor, 'category' => $row->category, 'subcategory' => $row->subcategory, 'brand' => $row->brand, 'brands' => $row->brands, 'industries' => $row->industries, 'images' => $row->images->map(fn ($image) => ['id' => $image->id, 'image_url' => url('/api/marketplace/service-images/'.$image->id)]), 'plans' => [['price_from' => $row->price_from]]];
        });
        return [
            'categories' => $simple(Category::whereIn('id', $wanted['categories'])->orderBy('name'), 'categories'),
            'brands' => $simple(Brand::whereIn('id', $wanted['brands'])->where('status', 'approved')->orderBy('name'), 'brands'),
            'industries' => $simple(Industry::whereIn('id', $wanted['industries'])->where('status', 'active')->orderBy('name'), 'industries'),
            'services' => $services,
        ];
    }
}
