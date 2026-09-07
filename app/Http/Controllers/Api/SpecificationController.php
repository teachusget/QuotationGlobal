<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SpecificationDefinition;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SpecificationController extends Controller
{
    public function index(Request $request)
    {
        $query = SpecificationDefinition::query()->orderBy('sort_order')->orderBy('name');
        if ($request->filled('service_type')) {
            $query->where(fn ($q) => $q->whereNull('service_type')->orWhere('service_type', $request->service_type));
            if ($request->filled('subcategory_id')) {
                $query->where(fn ($q) => $q->whereNull('category_id')->orWhere('category_id', $request->integer('category_id')))
                    ->where(fn ($q) => $q->whereNull('subcategory_id')->orWhere('subcategory_id', $request->integer('subcategory_id')));
            } else {
                $query->whereNull('category_id')->whereNull('subcategory_id');
            }
        } else {
            if ($request->filled('category_id')) $query->where(fn ($q) => $q->whereNull('category_id')->orWhere('category_id', $request->integer('category_id')));
            if ($request->filled('subcategory_id')) $query->where(fn ($q) => $q->whereNull('subcategory_id')->orWhere('subcategory_id', $request->integer('subcategory_id')));
        }
        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $item = SpecificationDefinition::create($this->validated($request));
        Audit::record($request, 'specification.created', $item, null, $item->toArray());
        return response()->json(['message' => 'Specification created.', 'data' => $item], 201);
    }

    public function update(Request $request, SpecificationDefinition $specification)
    {
        $before = $specification->toArray();
        $specification->update($this->validated($request));
        Audit::record($request, 'specification.updated', $specification, $before, $specification->fresh()->toArray());
        return response()->json(['message' => 'Specification updated.', 'data' => $specification]);
    }

    public function destroy(Request $request, SpecificationDefinition $specification)
    {
        $before = $specification->toArray();
        $specification->delete();
        Audit::record($request, 'specification.deleted', $specification, $before);
        return response()->json(['message' => 'Specification deleted.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'service_type' => ['nullable', Rule::in(['software', 'hardware', 'services'])],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'subcategory_id' => ['nullable', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'field_type' => ['required', Rule::in(['boolean', 'text', 'number', 'duration', 'select', 'multiselect'])],
            'options' => ['nullable', 'array'], 'options.*' => ['string', 'max:80'],
            'unit' => ['nullable', 'string', 'max:30'],
            'is_required' => ['required', 'boolean'], 'is_comparable' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
