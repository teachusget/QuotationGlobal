<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\ServiceRating;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Service::with(['vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'industries:id,name', 'brands:id,name', 'images:id,service_id,image_data,sort_order', 'specificationValues.definition'])->latest();

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            $query->where('vendor_id', $vendor->id);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function marketplace()
    {
        $services = Service::with([
            'vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'brand:id,name',
            'brands:id,name', 'industries:id,name',
            'specificationValues.definition',
            'images' => fn ($query) => $query->select('id', 'service_id', 'sort_order')->orderBy('sort_order')->limit(1),
        ])->latest()->get();

        return response()->json(['data' => $services->map(fn (Service $service) => $this->marketplaceResource($service))]);
    }

    public function marketplaceShow(Service $service)
    {
        $plans = Service::with(['vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'brand:id,name', 'brands:id,name', 'industries:id,name'])
            ->where('vendor_id', $service->vendor_id)
            ->where('name', $service->name)
            ->where('service_type', $service->service_type)
            ->orderByRaw("FIELD(billing_cycle, 'hourly', 'daily', 'monthly', 'quarterly', 'semi_annual', 'annual')")
            ->get();
        $service->load(['vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'brand:id,name', 'brands:id,name', 'industries:id,name', 'images:id,service_id,sort_order', 'specificationValues.definition']);

        return response()->json(['data' => [
            'service' => $this->marketplaceResource($service, true),
            'plans' => $plans->map(fn (Service $plan) => $this->marketplaceResource($plan)),
        ]]);
    }

    public function marketplaceImage(ServiceImage $serviceImage)
    {
        // Marketplace seed artwork is generated as a controlled SVG data URI. User
        // uploads remain restricted to PNG/JPEG/WebP by store() validation.
        abort_unless($serviceImage->image_data && preg_match('#^data:(image/(?:png|jpeg|webp|svg\+xml));base64,(.+)$#', $serviceImage->image_data, $parts), 404);

        return response(base64_decode($parts[2]))
            ->header('Content-Type', $parts[1])
            ->header('Cache-Control', 'public, max-age=86400');
    }

    public function ratings(Service $service)
    {
        $product = $this->canonicalProduct($service);
        $ratings = $product->ratings()->with('user:id,name')->latest()->get();

        return response()->json(['data' => [
            'average' => round((float) $ratings->avg('rating'), 1),
            'count' => $ratings->count(),
            'ratings' => $ratings->map(fn (ServiceRating $rating) => [
                'id' => $rating->id,
                'rating' => $rating->rating,
                'comment' => $rating->comment,
                'customer_name' => $rating->user->name,
                'created_at' => $rating->created_at,
            ]),
        ]]);
    }

    public function rate(Request $request, Service $service)
    {
        abort_unless($request->user()->account_type === 'buyer', 403, 'Only customers can rate products.');
        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);
        $product = $this->canonicalProduct($service);
        $rating = ServiceRating::updateOrCreate(
            ['service_id' => $product->id, 'user_id' => $request->user()->id],
            ['rating' => $data['rating'], 'comment' => trim($data['comment'] ?? '') ?: null]
        );

        return response()->json(['message' => $rating->wasRecentlyCreated ? 'Rating added successfully.' : 'Rating updated successfully.']);
    }

    public function destroy(Request $request, Service $service)
    {
        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($service->vendor_id === $vendor->id, 403, 'You can only delete your own service plans.');
        }
        $service->delete();
        return response()->json(['message' => 'Service plan deleted successfully.']);
    }

    public function update(Request $request, Service $service)
    {
        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($service->vendor_id === $vendor->id, 403, 'You can only update your own service plans.');
        }
        $data = $request->validate(['monthly_price' => ['required', 'numeric', 'min:0'], 'discount_percent' => ['required', 'numeric', 'min:0', 'max:100']]);
        $months = $service->service_type === 'services' ? ['hourly' => 1 / 720, 'daily' => 1 / 30, 'monthly' => 1, 'annual' => 12][$service->billing_cycle] : ['monthly' => 1, 'quarterly' => 3, 'semi_annual' => 6, 'annual' => 12][$service->billing_cycle];
        $service->update([...$data, 'price_from' => round($data['monthly_price'] * $months * (1 - $data['discount_percent'] / 100), 2)]);
        return response()->json(['message' => 'Service plan updated.', 'data' => $service->load(['industries:id,name', 'brands:id,name'])]);
    }

    public function updateProduct(Request $request, Service $service)
    {
        $this->authorizeServiceOwner($request, $service);
        $data = $this->validateProduct($request);
        abort_unless(Category::whereKey($data['subcategory_id'])->where('parent_id', $data['category_id'])->exists(), 422, 'Selected subcategory does not belong to this category.');

        $original = ['vendor_id' => $service->vendor_id, 'name' => $service->name, 'service_type' => $service->service_type];
        $targetVendorId = $request->user()->account_type === 'vendor' ? $service->vendor_id : (int) ($data['vendor_id'] ?? 0);
        abort_unless($targetVendorId && Vendor::whereKey($targetVendorId)->exists(), 422, 'Select a valid vendor for this service.');
        $this->validateBillingCyclesForType($data);
        $multipliers = ['hourly' => 1, 'daily' => 1, 'monthly' => 1, 'quarterly' => 3, 'semi_annual' => 6, 'annual' => 12];
        $shared = collect($data)->except(['vendor_id', 'billing_cycles', 'discounts', 'monthly_price', 'industry_ids', 'brand_ids', 'image_data', 'image_datas', 'specifications'])->all();

        $services = DB::transaction(function () use ($data, $shared, $original, $targetVendorId, $multipliers) {
            $plans = Service::where($original)->get()->keyBy('billing_cycle');
            $plans->except($data['billing_cycles'])->each->delete();

            return collect($data['billing_cycles'])->map(function ($cycle) use ($data, $shared, $plans, $targetVendorId, $multipliers) {
                $discount = (float) ($data['discounts'][$cycle] ?? 0);
                $serviceMultipliers = ['hourly' => 1 / 720, 'daily' => 1 / 30, 'monthly' => 1, 'annual' => 12];
                $total = (float) $data['monthly_price'] * ($data['service_type'] === 'services' ? $serviceMultipliers[$cycle] : $multipliers[$cycle]) * (1 - $discount / 100);
                $plan = $plans->get($cycle) ?: new Service(['billing_cycle' => $cycle]);
                $plan->fill([...$shared, 'vendor_id' => $targetVendorId, 'industry_id' => $data['industry_ids'][0], 'brand_id' => $data['brand_ids'][0] ?? null, 'monthly_price' => $data['monthly_price'], 'discount_percent' => $discount, 'price_from' => round($total, 2)])->save();
                $plan->industries()->sync($data['industry_ids']);
                $plan->brands()->sync($data['brand_ids'] ?? []);
                $this->syncSpecifications($plan, $data['specifications'] ?? []);
                return $plan->load(['vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'industries:id,name', 'brands:id,name']);
            });
        });

        return response()->json(['message' => 'Complete service updated successfully.', 'data' => $services]);
    }

    public function destroyProduct(Request $request, Service $service)
    {
        $this->authorizeServiceOwner($request, $service);
        Service::where('vendor_id', $service->vendor_id)->where('name', $service->name)->where('service_type', $service->service_type)->delete();
        return response()->json(['message' => 'Complete service and all pricing plans deleted successfully.']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'name' => ['required', 'string', 'max:150'],
            'features' => ['nullable', 'string', 'max:5000'],
            'image_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
            'image_datas' => ['nullable', 'array', 'max:8'],
            'image_datas.*' => ['string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
            'category_id' => ['required', Rule::exists('categories', 'id')->whereNull('parent_id')],
            'subcategory_id' => ['required', 'integer', 'exists:categories,id'],
            'industry_ids' => ['required', 'array', 'min:1'],
            'industry_ids.*' => ['integer', 'exists:industries,id'],
            'brand_ids' => ['nullable', 'array'],
            'brand_ids.*' => [Rule::exists('brands', 'id')->where('status', 'approved')],
            'service_type' => ['required', Rule::in(['software', 'hardware', 'services'])],
            'ai_enabled' => ['required', 'boolean'],
            'pricing_mode' => ['required', Rule::in(['starting_price', 'flexible_price'])],
            'monthly_price' => ['required', 'numeric', 'min:0'],
            'billing_cycles' => ['required', 'array', 'min:1'],
            'billing_cycles.*' => [Rule::in(['hourly', 'daily', 'monthly', 'quarterly', 'semi_annual', 'annual'])],
            'discounts' => ['nullable', 'array'],
            'discounts.*' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'specifications' => ['nullable', 'array'],
            'specifications.*' => ['nullable', 'string', 'max:1000'],
        ]);
        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
        } else {
            abort_unless(!empty($data['vendor_id']), 422, 'Select the vendor for this service.');
            $vendor = Vendor::findOrFail($data['vendor_id']);
        }
        abort_unless(Category::whereKey($data['subcategory_id'])->where('parent_id', $data['category_id'])->exists(), 422, 'Selected subcategory does not belong to this category.');
        $this->validateBillingCyclesForType($data);
        $multipliers = ['hourly' => 1, 'daily' => 1, 'monthly' => 1, 'quarterly' => 3, 'semi_annual' => 6, 'annual' => 12];
        $shared = collect($data)->except(['vendor_id', 'billing_cycles', 'discounts', 'monthly_price', 'industry_ids', 'brand_ids', 'specifications'])->all();
        $services = DB::transaction(function () use ($data, $shared, $vendor, $multipliers) {
            return collect($data['billing_cycles'])->map(function ($cycle) use ($data, $shared, $vendor, $multipliers) {
                $discount = (float) ($data['discounts'][$cycle] ?? 0);
                $serviceMultipliers = ['hourly' => 1 / 720, 'daily' => 1 / 30, 'monthly' => 1, 'annual' => 12];
                $total = (float) $data['monthly_price'] * ($data['service_type'] === 'services' ? $serviceMultipliers[$cycle] : $multipliers[$cycle]) * (1 - $discount / 100);
                $service = Service::create([...$shared, 'vendor_id' => $vendor->id, 'industry_id' => $data['industry_ids'][0], 'brand_id' => $data['brand_ids'][0] ?? null, 'billing_cycle' => $cycle, 'monthly_price' => $data['monthly_price'] ?? null, 'discount_percent' => $discount, 'price_from' => $total === null ? null : round($total, 2)]);
                $service->industries()->sync($data['industry_ids']);
                $service->brands()->sync($data['brand_ids'] ?? []);
                $this->syncSpecifications($service, $data['specifications'] ?? []);
                $images = array_values(array_filter([...($data['image_datas'] ?? []), $data['image_data'] ?? null]));
                foreach ($images as $order => $image) $service->images()->create(['image_data' => $image, 'sort_order' => $order]);
                return $service;
            });
        });
        return response()->json(['message' => 'Service pricing saved successfully.', 'data' => $services->map(fn ($service) => $service->load(['category:id,name', 'subcategory:id,name', 'industries:id,name', 'brands:id,name']))], 201);
    }

    private function marketplaceResource(Service $service, bool $allImages = false): array
    {
        $data = $service->toArray();
        unset($data['image_data']);
        $images = $service->relationLoaded('images') ? $service->images : collect();
        $data['images'] = ($allImages ? $images : $images->take(1))->map(fn ($image) => [
            'id' => $image->id,
            'sort_order' => $image->sort_order,
            'image_url' => url('/api/marketplace/service-images/'.$image->id),
        ])->values();

        return $data;
    }

    private function canonicalProduct(Service $service): Service
    {
        return Service::where('vendor_id', $service->vendor_id)
            ->where('name', $service->name)
            ->where('service_type', $service->service_type)
            ->oldest('id')->firstOrFail();
    }

    private function authorizeServiceOwner(Request $request, Service $service): void
    {
        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($service->vendor_id === $vendor->id, 403, 'You can only manage your own services.');
        }
    }

    private function validateProduct(Request $request): array
    {
        return $request->validate([
            'vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'name' => ['required', 'string', 'max:150'],
            'features' => ['nullable', 'string', 'max:5000'],
            'category_id' => ['required', Rule::exists('categories', 'id')->whereNull('parent_id')],
            'subcategory_id' => ['required', 'integer', 'exists:categories,id'],
            'industry_ids' => ['required', 'array', 'min:1'],
            'industry_ids.*' => ['integer', 'exists:industries,id'],
            'brand_ids' => ['nullable', 'array'],
            'brand_ids.*' => [Rule::exists('brands', 'id')->where('status', 'approved')],
            'service_type' => ['required', Rule::in(['software', 'hardware', 'services'])],
            'ai_enabled' => ['required', 'boolean'],
            'pricing_mode' => ['required', Rule::in(['starting_price', 'flexible_price'])],
            'monthly_price' => ['required', 'numeric', 'min:0'],
            'billing_cycles' => ['required', 'array', 'min:1'],
            'billing_cycles.*' => [Rule::in(['hourly', 'daily', 'monthly', 'quarterly', 'semi_annual', 'annual'])],
            'discounts' => ['nullable', 'array'],
            'discounts.*' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'specifications' => ['nullable', 'array'],
            'specifications.*' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function syncSpecifications(Service $service, array $values): void
    {
        $service->specificationValues()->delete();
        foreach ($values as $definitionId => $value) {
            if ($value === null || $value === '') continue;
            $service->specificationValues()->create(['specification_definition_id' => $definitionId, 'value' => is_array($value) ? json_encode($value) : (string) $value]);
        }
    }

    private function validateBillingCyclesForType(array $data): void
    {
        $allowed = $data['service_type'] === 'services' ? ['hourly', 'daily', 'monthly', 'annual'] : ['monthly', 'quarterly', 'semi_annual', 'annual'];
        abort_unless(collect($data['billing_cycles'])->every(fn ($cycle) => in_array($cycle, $allowed, true)), 422, 'Selected pricing frequency is not available for this service type.');
    }
}
