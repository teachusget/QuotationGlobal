<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\SpecificationDefinition;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::with('parent')->orderBy('name');
        $isSubcategory = $request->query('type', 'category') === 'subcategory';
        $isSubcategory ? $query->whereNotNull('parent_id') : $query->whereNull('parent_id');
        if ($isSubcategory && $request->user()->account_type === 'staff' && ! $request->user()->isSuperAdmin()) {
            $query->whereHas('assignedUsers', fn ($assigned) => $assigned->whereKey($request->user()->id));
        }

        return response()->json(['data' => $query->get()->map(fn ($item) => $this->resource($item))]);
    }

    public function marketplace()
    {
        $categories = Cache::remember('marketplace:categories:v2', 600, fn () => Category::with([
            'services:id,category_id,service_type',
            'children' => fn ($query) => $query->orderBy('name'),
            'children.subcategoryServices:id,subcategory_id,service_type',
        ])
            ->whereNull('parent_id')->orderBy('name')->get());

        return response()->json(['data' => $categories->map(fn ($category) => [
            'id' => $category->id,
            'name' => $category->name,
            'details' => $category->details,
            'logo_url' => $category->logo_data ? url('/api/categories/'.$category->id.'/logo') : null,
            'service_types' => $category->services->pluck('service_type')->unique()->values(),
            'subcategories' => $category->children->map(fn ($child) => [
                'id' => $child->id,
                'name' => $child->name,
                'logo_url' => $child->logo_data ? url('/api/categories/'.$child->id.'/logo') : null,
                'service_types' => $child->subcategoryServices->pluck('service_type')->unique()->values(),
            ]),
        ])])->header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }

    public function store(Request $request)
    {
        $data = $this->validateRequest($request);
        $item = Category::create($this->attributes($data));
        if ($item->parent_id && $request->user()->account_type === 'staff' && ! $request->user()->isSuperAdmin()) {
            $request->user()->assignedSubcategories()->syncWithoutDetaching([$item->id]);
        }
        $this->syncKeyPoints($item, $data);
        Audit::record($request, 'category.created', $item, null, $this->auditSnapshot($item, $data));

        return response()->json(['message' => 'Saved successfully.', 'data' => $this->resource($item->load('parent'))], 201);
    }

    public function update(Request $request, Category $category)
    {
        $this->authorizeAssignedSubcategory($request, $category);
        $before = $this->auditSnapshot($category);
        $data = $this->validateRequest($request);
        $category->update($this->attributes($data, $category));
        $this->syncKeyPoints($category, $data);
        Audit::record($request, 'category.updated', $category, $before, $this->auditSnapshot($category, $data));

        return response()->json(['message' => 'Saved successfully.', 'data' => $this->resource($category->load('parent'))]);
    }

    public function destroy(Request $request, Category $category)
    {
        $this->authorizeAssignedSubcategory($request, $category);
        $before = $this->auditSnapshot($category);
        SpecificationDefinition::where('source', 'subcategory_key_point')->where(fn ($query) => $query->where('subcategory_id', $category->id)->orWhere('category_id', $category->id))->delete();
        $category->delete();
        Audit::record($request, 'category.deleted', $category, $before);

        return response()->json(['message' => 'Deleted successfully.']);
    }

    public function logo(Category $category)
    {
        abort_unless($category->logo_data && preg_match('#^data:(image/(?:png|jpeg|webp));base64,(.+)$#', $category->logo_data, $parts), 404);

        return response(base64_decode($parts[2]))->header('Content-Type', $parts[1])->header('Cache-Control', 'public, max-age=604800, immutable');
    }

    private function validateRequest(Request $request): array
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100'], 'details' => ['nullable', 'string', 'max:1000'], 'type' => ['required', Rule::in(['category', 'subcategory'])], 'parent_id' => [Rule::requiredIf($request->input('type') === 'subcategory'), 'nullable', 'integer', 'exists:categories,id'], 'logo_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#'], 'key_points_json' => ['nullable', 'json', 'max:10000']]);
        $data['key_points'] = collect(json_decode($data['key_points_json'] ?? '[]', true))->map(fn ($point) => trim((string) $point))->filter()->unique(fn ($point) => mb_strtolower($point))->take(100)->values()->all();
        $current = $request->route('category');
        $parentId = $data['type'] === 'subcategory' ? (int) $data['parent_id'] : null;
        $unchanged = $current instanceof Category && Str::lower(trim($current->name)) === Str::lower(trim($data['name'])) && (int) ($current->parent_id ?? 0) === (int) ($parentId ?? 0);
        if (! $unchanged && Category::whereRaw('LOWER(TRIM(name)) = ?', [Str::lower(trim($data['name']))])->when($parentId, fn ($q) => $q->where('parent_id', $parentId), fn ($q) => $q->whereNull('parent_id'))->exists()) {
            throw ValidationException::withMessages(['name' => [($data['type'] === 'category' ? 'Category' : 'Sub category').' with this name already exists.']]);
        }

return $data;
    }

    private function attributes(array $data, ?Category $item = null): array
    {
        return ['name' => trim($data['name']), 'slug' => Str::slug($data['name']).($item ? '' : '-'.Str::lower(Str::random(5))), 'details' => $data['details'] ?? null, 'parent_id' => $data['type'] === 'subcategory' ? $data['parent_id'] : null, 'logo_data' => $data['logo_data'] ?? $item?->logo_data];
    }

    private function resource(Category $item): array
    {
        return ['id' => $item->id, 'parent_id' => $item->parent_id, 'name' => $item->name, 'slug' => $item->slug, 'details' => $item->details, 'key_points' => $item->parent_id ? SpecificationDefinition::where('subcategory_id', $item->id)->where('source', 'subcategory_key_point')->orderBy('sort_order')->pluck('name')->all() : [], 'logo_url' => $item->logo_data ? url('/api/categories/'.$item->id.'/logo') : null, 'parent' => $item->parent ? ['id' => $item->parent->id, 'name' => $item->parent->name] : null, 'created_at' => $item->created_at, 'updated_at' => $item->updated_at];
    }

    private function auditSnapshot(Category $category, array $data = []): array
    {
        return $category->only(['id', 'parent_id', 'name', 'slug', 'details'])
            + ['key_points' => $data['key_points'] ?? SpecificationDefinition::where('subcategory_id', $category->id)->where('source', 'subcategory_key_point')->orderBy('sort_order')->pluck('name')->all()];
    }

    private function syncKeyPoints(Category $category, array $data): void
    {
        if (($data['type'] ?? null) !== 'subcategory') return;
        SpecificationDefinition::where('subcategory_id', $category->id)->where('source', 'subcategory_key_point')->delete();
        foreach ($data['key_points'] ?? [] as $order => $name) SpecificationDefinition::create(['category_id' => $category->parent_id, 'subcategory_id' => $category->id, 'name' => $name, 'source' => 'subcategory_key_point', 'field_type' => 'boolean', 'is_required' => false, 'is_comparable' => true, 'sort_order' => 100 + $order]);
    }

    private function authorizeAssignedSubcategory(Request $request, Category $category): void
    {
        $user = $request->user();
        if ($category->parent_id && $user->account_type === 'staff' && ! $user->isSuperAdmin()) {
            abort_unless($user->assignedSubcategories()->whereKey($category->id)->exists(), 403, 'This subcategory is not assigned to you.');
        }
    }
}
