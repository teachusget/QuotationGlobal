<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $query = Brand::orderBy('name');
        $vendorId = null;
        if ($request->user()->account_type === 'vendor') {
            $vendorId = \App\Models\Vendor::where('user_id', $request->user()->id)->value('id');
            $query->where(fn ($brands) => $brands->where('status', 'approved')->orWhere('vendor_id', $vendorId));
        } elseif (! $request->user()->isSuperAdmin()) {
            $query->whereHas('assignedUsers', fn ($assigned) => $assigned->whereKey($request->user()->id));
        }
        return response()->json(['data' => $query->get()->map(fn ($item) => $this->resource($item, $vendorId && (int) $item->vendor_id === (int) $vendorId))]);
    }

    public function marketplace()
    {
        $brands = Cache::remember('marketplace:brands', 600, fn () => Brand::where('status', 'approved')->orderBy('name')->get()->map(fn ($item) => $this->resource($item)));
        return response()->json(['data' => $brands])
            ->header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $vendor = $request->user()->account_type === 'vendor' ? \App\Models\Vendor::where('user_id', $request->user()->id)->firstOrFail() : null;
        $item = Brand::create([...$this->attributes($data), 'vendor_id' => $vendor?->id, 'status' => $vendor ? 'pending' : 'approved']);
        if ($request->user()->account_type === 'staff' && ! $request->user()->isSuperAdmin()) {
            $request->user()->assignedBrands()->syncWithoutDetaching([$item->id]);
        }
        Audit::record($request, 'brand.created', $item, null, $item->only(['id', 'name', 'slug', 'details', 'status', 'vendor_id']));

        return response()->json(['message' => $vendor ? 'Brand submitted for admin approval.' : 'Saved successfully.', 'data' => $this->resource($item, (bool) $vendor)], 201);
    }

    public function update(Request $request, Brand $brand)
    {
        $this->authorizeAssignedBrand($request, $brand);
        $isVendor = $request->user()->account_type === 'vendor';
        if ($isVendor) {
            $vendorId = \App\Models\Vendor::where('user_id', $request->user()->id)->value('id');
            abort_unless($vendorId && (int) $brand->vendor_id === (int) $vendorId, 403, 'You can only edit brands submitted by your vendor account.');
        }
        $data = $this->validated($request, $brand);
        $before = $brand->only(['id', 'name', 'slug', 'details', 'status', 'vendor_id']);
        $brand->update([...$this->attributes($data, $brand), ...($isVendor ? ['status' => 'pending'] : [])]);
        Audit::record($request, 'brand.updated', $brand, $before, $brand->only(['id', 'name', 'slug', 'details', 'status', 'vendor_id']));

        return response()->json(['message' => $isVendor ? 'Brand changes submitted for admin approval.' : 'Saved successfully.', 'data' => $this->resource($brand->fresh(), $isVendor)]);
    }

    public function approve(Request $request, Brand $brand)
    {
        abort_if($request->user()->account_type === 'vendor', 403, 'Only administrators can approve brands.');
        $this->authorizeAssignedBrand($request, $brand);
        $before = ['status' => $brand->status];
        $brand->update(['status' => 'approved']);
        Audit::record($request, 'brand.approved', $brand, $before, ['status' => 'approved']);
        return response()->json(['message' => 'Brand approved successfully.', 'data' => $this->resource($brand->fresh())]);
    }

    public function destroy(Request $request, Brand $brand)
    {
        abort_if($request->user()->account_type === 'vendor', 403, 'Vendor accounts cannot delete brands.');
        $this->authorizeAssignedBrand($request, $brand);
        $before = $brand->only(['id', 'name', 'slug', 'details', 'status', 'vendor_id']);
        $brand->delete();
        Audit::record($request, 'brand.deleted', $brand, $before);

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

    private function authorizeAssignedBrand(Request $request, Brand $brand): void
    {
        $user = $request->user();
        if ($user->account_type === 'staff' && ! $user->isSuperAdmin()) {
            abort_unless($user->assignedBrands()->whereKey($brand->id)->exists(), 403, 'This brand is not assigned to you.');
        }
    }

    private function resource(Brand $item, bool $ownedByCurrentVendor = false): array
    {
        return ['id' => $item->id, 'name' => $item->name, 'slug' => $item->slug, 'details' => $item->details, 'status' => $item->status, 'vendor_id' => $item->vendor_id, 'owned_by_current_vendor' => $ownedByCurrentVendor, 'logo_url' => $item->logo_data ? url('/api/brands/'.$item->id.'/logo') : null, 'created_at' => $item->created_at, 'updated_at' => $item->updated_at];
    }
}
