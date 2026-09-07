<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplacePage;
use App\Models\MarketplaceTemplate;
use App\Models\MarketplaceTemplateBackup;
use App\Support\Audit;
use App\Support\MarketplaceDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MarketplaceTemplateController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'page' => ['nullable', 'integer', 'min:1'], 'per_page' => ['nullable', 'integer', 'between:1,48'], 'include_archived' => ['nullable', 'boolean']]);
        $page = MarketplacePage::where('slug', 'home')->first();
        $query = MarketplaceTemplate::query()->with('updater:id,name')->latest('updated_at');
        if (empty($data['include_archived'])) $query->where('status', 'active');
        if ($search = trim($data['search'] ?? '')) $query->where(fn ($builder) => $builder->where('name', 'like', "%$search%")->orWhere('description', 'like', "%$search%"));
        $templates = $query->paginate($data['per_page'] ?? 12);
        return response()->json(['data' => collect($templates->items())->map(fn ($template) => $this->resource($template, $page)), 'meta' => ['current_page' => $templates->currentPage(), 'last_page' => $templates->lastPage(), 'per_page' => $templates->perPage(), 'total' => $templates->total()]]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $document = MarketplaceDocument::validate($data['document']);
        $template = MarketplaceTemplate::create([...$data, 'slug' => $this->uniqueSlug($data['name']), 'document' => $document, 'design_tokens' => $data['design_tokens'] ?? $document['theme'], 'created_by' => $request->user()->id, 'updated_by' => $request->user()->id]);
        Audit::record($request, 'marketplace.template_created', $template, null, $this->auditSnapshot($template));
        return response()->json(['message' => 'Marketplace theme created.', 'data' => $this->resource($template)], 201);
    }

    public function show(MarketplaceTemplate $template)
    {
        $page = MarketplacePage::where('slug', 'home')->firstOrFail();
        return response()->json(['data' => [...$this->resource($template, $page), 'document' => $this->mergeLiveContent($template->document, $page->draft_document)]]);
    }

    public function update(Request $request, MarketplaceTemplate $template)
    {
        $before = $this->auditSnapshot($template);
        $data = $this->validated($request, $template);
        if (isset($data['document'])) $data['document'] = MarketplaceDocument::validate($data['document']);
        if (isset($data['name']) && $data['name'] !== $template->name) $data['slug'] = $this->uniqueSlug($data['name'], $template);
        $template->update([...$data, 'updated_by' => $request->user()->id]);
        Audit::record($request, 'marketplace.template_updated', $template, $before, $this->auditSnapshot($template->fresh()));
        return response()->json(['message' => 'Marketplace theme updated.', 'data' => $this->resource($template->fresh())]);
    }

    public function clone(Request $request, MarketplaceTemplate $template)
    {
        abort_if($template->status === 'archived', 422, 'Archived themes cannot be cloned.');
        $name = trim($request->validate(['name' => ['nullable', 'string', 'max:120']])['name'] ?? '') ?: $template->name.' Copy';
        $copy = MarketplaceTemplate::create(['name' => $name, 'slug' => $this->uniqueSlug($name), 'description' => $template->description, 'thumbnail_url' => $template->thumbnail_url, 'status' => 'active', 'document' => $template->document, 'design_tokens' => $template->design_tokens, 'variants' => $template->variants, 'created_by' => $request->user()->id, 'updated_by' => $request->user()->id]);
        Audit::record($request, 'marketplace.template_cloned', $copy, ['source_template_id' => $template->id], $this->auditSnapshot($copy));
        return response()->json(['message' => 'Marketplace theme cloned.', 'data' => $this->resource($copy)], 201);
    }

    public function apply(Request $request, MarketplaceTemplate $template)
    {
        abort_if($template->status === 'archived', 422, 'Archived themes cannot be applied.');
        $data = $request->validate(['lock_version' => ['required', 'integer', 'min:1']]);
        $result = DB::transaction(function () use ($request, $template, $data) {
            $page = MarketplacePage::where('slug', 'home')->lockForUpdate()->firstOrFail();
            if ((int) $data['lock_version'] !== $page->lock_version) throw ValidationException::withMessages(['lock_version' => ['This draft was updated by another administrator. Reload before applying a theme.']]);
            MarketplaceTemplateBackup::create(['marketplace_page_id' => $page->id, 'applied_template_id' => $template->id, 'document' => $page->draft_document, 'created_by' => $request->user()->id]);
            $merged = MarketplaceDocument::validate($this->mergeLiveContent($template->document, $page->draft_document));
            $before = ['template_id' => $page->draft_template_id, 'document_hash' => hash('sha256', json_encode($page->draft_document))];
            $page->update(['draft_document' => $merged, 'draft_template_id' => $template->id, 'updated_by' => $request->user()->id, 'lock_version' => $page->lock_version + 1]);
            Audit::record($request, 'marketplace.template_applied', $page, $before, ['template_id' => $template->id, 'template' => $template->slug]);
            return $page->fresh();
        });
        return response()->json(['message' => "{$template->name} applied to the draft. Live marketplace is unchanged.", 'data' => ['draft_document' => $result->draft_document, 'draft_template_id' => $result->draft_template_id, 'lock_version' => $result->lock_version]]);
    }

    public function destroy(Request $request, MarketplaceTemplate $template)
    {
        $inUse = MarketplacePage::where('active_template_id', $template->id)->orWhere('draft_template_id', $template->id)->exists();
        if ($inUse) throw ValidationException::withMessages(['template' => ['Active or draft theme cannot be archived. Apply another theme first.']]);
        $before = $this->auditSnapshot($template);
        $template->update(['status' => 'archived', 'archived_at' => now(), 'updated_by' => $request->user()->id]);
        Audit::record($request, 'marketplace.template_archived', $template, $before, $this->auditSnapshot($template->fresh()));
        return response()->json(['message' => 'Marketplace theme archived.']);
    }

    private function mergeLiveContent(array $template, array $current): array
    {
        $pools = ['hero' => [], 'category_grid' => [], 'brand_grid' => [], 'industry_grid' => [], 'product_grid' => []];
        $collect = function (array $blocks) use (&$collect, &$pools) {
            foreach ($blocks as $block) {
                $type = $block['type'] ?? '';
                if (isset($pools[$type])) $pools[$type][] = $block['settings'] ?? [];
                $children = data_get($block, 'settings.children', []);
                if (is_array($children)) $collect($children);
            }
        };
        $collect($current['sections'] ?? []);
        $offsets = array_fill_keys(array_keys($pools), 0);
        $merge = function (array $blocks) use (&$merge, &$pools, &$offsets) {
            return array_map(function ($block) use (&$merge, &$pools, &$offsets) {
                $type = $block['type'] ?? '';
                if (isset($pools[$type])) {
                    $source = $pools[$type][$offsets[$type]++] ?? $pools[$type][0] ?? [];
                    if ($type === 'hero' && array_key_exists('featured_ads', $source)) $block['settings']['featured_ads'] = $source['featured_ads'];
                    if ($type !== 'hero' && array_key_exists('catalog_ids', $source)) $block['settings']['catalog_ids'] = $source['catalog_ids'];
                }
                $children = data_get($block, 'settings.children', []);
                if (is_array($children)) $block['settings']['children'] = $merge($children);
                return $block;
            }, $blocks);
        };
        $template['sections'] = $merge($template['sections'] ?? []);
        return $template;
    }

    private function validated(Request $request, ?MarketplaceTemplate $template = null): array
    {
        return $request->validate([
            'name' => [$template ? 'sometimes' : 'required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'thumbnail_url' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', Rule::in(['active', 'archived'])],
            'document' => [$template ? 'sometimes' : 'required', 'array'],
            'design_tokens' => ['nullable', 'array'],
            'variants' => ['nullable', 'array'],
        ]);
    }

    private function uniqueSlug(string $name, ?MarketplaceTemplate $except = null): string
    {
        $base = Str::slug($name) ?: 'marketplace-theme'; $slug = $base; $index = 2;
        while (MarketplaceTemplate::where('slug', $slug)->when($except, fn ($query) => $query->whereKeyNot($except->id))->exists()) $slug = $base.'-'.$index++;
        return $slug;
    }

    private function resource(MarketplaceTemplate $template, ?MarketplacePage $page = null): array
    {
        return ['id' => $template->id, 'name' => $template->name, 'slug' => $template->slug, 'description' => $template->description, 'thumbnail_url' => $template->thumbnail_url, 'status' => $template->status, 'design_tokens' => $template->design_tokens, 'variants' => $template->variants, 'section_count' => count($template->document['sections'] ?? []), 'is_active' => $page?->active_template_id === $template->id, 'is_draft' => $page?->draft_template_id === $template->id, 'updated_at' => $template->updated_at, 'updated_by' => $template->updater?->name];
    }

    private function auditSnapshot(MarketplaceTemplate $template): array
    {
        return $template->only(['id', 'name', 'slug', 'description', 'status', 'created_by', 'updated_by', 'archived_at'])
            + ['section_count' => count($template->document['sections'] ?? [])];
    }
}
