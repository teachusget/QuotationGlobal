<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $query = Brand::orderBy('name');
        if ($request->user()->account_type === 'vendor') {
            $vendorId = \App\Models\Vendor::where('user_id', $request->user()->id)->value('id');
            $query->where(fn ($brands) => $brands->where('status', 'approved')->orWhere('vendor_id', $vendorId));
        }
        return response()->json(['data' => $query->get()->map(fn ($item) => $this->resource($item))]);
    }

    public function marketplace()
    {
        return response()->json(['data' => Brand::where('status', 'approved')->orderBy('name')->get()->map(fn ($item) => $this->resource($item))])
            ->header('Cache-Control', 'private, max-age=300');
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $vendor = $request->user()->account_type === 'vendor' ? \App\Models\Vendor::where('user_id', $request->user()->id)->firstOrFail() : null;
        $item = Brand::create([...$this->attributes($data), 'vendor_id' => $vendor?->id, 'status' => $vendor ? 'pending' : 'approved']);

        return response()->json(['message' => $vendor ? 'Brand submitted for admin approval.' : 'Saved successfully.', 'data' => $this->resource($item)], 201);
    }

    public function update(Request $request, Brand $brand)
    {
        $data = $this->validated($request, $brand);
        $brand->update($this->attributes($data, $brand));

        return response()->json(['message' => 'Saved successfully.', 'data' => $this->resource($brand->fresh())]);
    }

    public function approve(Brand $brand)
    {
        $brand->update(['status' => 'approved']);
        return response()->json(['message' => 'Brand approved successfully.', 'data' => $this->resource($brand->fresh())]);
    }

    public function destroy(Brand $brand)
    {
        $brand->delete();

        return response()->json(['message' => 'Deleted successfully.']);
    }

    public function logo(Brand $brand)
    {
        abort_unless($brand->logo_data, 404);
        [, $content] = explode(',', $brand->logo_data, 2);
        preg_match('#^data:([^;]+)#', $brand->logo_data, $match);

        return response(base64_decode($content))
            ->header('Content-Type', $match[1] ?? 'image/png')
            ->header('Cache-Control', 'public, max-age=604800, immutable');
    }

    private function validated(Request $request, ?Brand $current = null): array
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100'], 'details' => ['nullable', 'string', 'max:1000'], 'logo_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#']]);
        if (Brand::whereRaw('LOWER(TRIM(name)) = ?', [Str::lower(trim($data['name']))])->when($current, fn ($q) => $q->whereKeyNot($current->id))->exists()) {
            throw ValidationException::withMessages(['name' => ['Brand with this name already exists.']]);
        }

return $data;
    }

    private function attributes(array $data, ?Brand $item = null): array
    {
        return ['name' => trim($data['name']), 'slug' => Str::slug($data['name']), 'details' => $data['details'] ?? null, 'logo_data' => $data['logo_data'] ?? $item?->logo_data];
    }

    private function resource(Brand $item): array
    {
        return ['id' => $item->id, 'name' => $item->name, 'slug' => $item->slug, 'details' => $item->details, 'status' => $item->status, 'vendor_id' => $item->vendor_id, 'logo_url' => $item->logo_data ? url('/api/brands/'.$item->id.'/logo') : null, 'created_at' => $item->created_at, 'updated_at' => $item->updated_at];
    }
}
