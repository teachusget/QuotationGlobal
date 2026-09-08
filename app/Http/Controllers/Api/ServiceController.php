<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\ServiceRating;
use App\Models\Vendor;
use App\Models\PlatformSetting;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        // The management table does not render service images. Excluding their
        // base64 payloads keeps this initial request small and fast.
        $query = Service::with(['vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'industries:id,name', 'brands:id,name', 'specificationValues.definition'])->latest();

        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            $query->where('vendor_id', $vendor->id);
        } elseif ($request->user()->account_type === 'staff' && ! $request->user()->isSuperAdmin()) {
            $query->whereIn('vendor_id', $request->user()->assignedVendors()->select('vendors.id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function marketplace()
    {
        $version = Cache::get('marketplace:services:version', 1);
        $data = Cache::remember("marketplace:services:v2:{$version}", 300, function () {
            $services = Service::query()->select([
                'id', 'vendor_id', 'category_id', 'subcategory_id', 'brand_id', 'name',
                'service_type', 'pricing_mode', 'price_from', 'monthly_price', 'discount_percent',
                'billing_cycle', 'ai_enabled', 'sell_globally', 'selling_countries', 'created_at',
            ])->with([
                'vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'brand:id,name',
                'brands:id,name', 'industries:id,name',
                'specificationValues:id,service_id,specification_definition_id,value',
                'specificationValues.definition:id,name,field_type,unit',
                'images' => fn ($query) => $query->select('id', 'service_id', 'sort_order')->orderBy('sort_order')->limit(1),
            ])->latest()->get();
            return $services->map(fn (Service $service) => $this->marketplaceResource($service))->values();
        });

        return response()->json(['data' => $data])
            ->header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    }

    public function marketplaceShow(Service $service)
    {
        $version = Cache::get('marketplace:services:version', 1);
        $data = Cache::remember("marketplace:service:{$version}:{$service->id}", 300, function () use ($service) {
        $plans = Service::with(['vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'brand:id,name', 'brands:id,name', 'industries:id,name'])
            ->where('vendor_id', $service->vendor_id)
            ->where('name', $service->name)
            ->where('service_type', $service->service_type)
            ->orderByRaw("FIELD(billing_cycle, 'hourly', 'daily', 'monthly', 'quarterly', 'semi_annual', 'annual')")
            ->get();
        $service->load(['vendor:id,company_name,name', 'category:id,name', 'subcategory:id,name', 'brand:id,name', 'brands:id,name', 'industries:id,name', 'images:id,service_id,sort_order', 'specificationValues.definition']);

        return [
            'service' => $this->marketplaceResource($service, true),
            'plans' => $plans->map(fn (Service $plan) => $this->marketplaceResource($plan)),
        ];
        });
        return response()->json(['data' => $data])
            ->header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
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
        $before = ServiceRating::where('service_id', $product->id)->where('user_id', $request->user()->id)->first()?->only(['rating', 'comment']);
        $rating = ServiceRating::updateOrCreate(
            ['service_id' => $product->id, 'user_id' => $request->user()->id],
            ['rating' => $data['rating'], 'comment' => trim($data['comment'] ?? '') ?: null]
        );
        Audit::record($request, $rating->wasRecentlyCreated ? 'service_rating.created' : 'service_rating.updated', $rating, $before, $rating->only(['id', 'service_id', 'user_id', 'rating', 'comment']));

        return response()->json(['message' => $rating->wasRecentlyCreated ? 'Rating added successfully.' : 'Rating updated successfully.']);
    }

    public function destroy(Request $request, Service $service)
    {
        $this->authorizeServiceOwner($request, $service);
        $before = $this->auditSnapshot($service);
        $service->delete();
        Audit::record($request, 'service.deleted', $service, $before);
        return response()->json(['message' => 'Service plan deleted successfully.']);
    }

    public function update(Request $request, Service $service)
    {
        $this->authorizeServiceOwner($request, $service);
        $data = $request->validate(['monthly_price' => ['required', 'numeric', 'min:0'], 'discount_percent' => ['required', 'numeric', 'min:0', 'max:100']]);
        $before = $this->auditSnapshot($service);
        $months = $service->service_type === 'services' ? ['hourly' => 1 / 720, 'daily' => 1 / 30, 'monthly' => 1, 'annual' => 12][$service->billing_cycle] : ['monthly' => 1, 'quarterly' => 3, 'semi_annual' => 6, 'annual' => 12][$service->billing_cycle];
        $service->update([...$data, 'price_from' => round($data['monthly_price'] * $months * (1 - $data['discount_percent'] / 100), 2)]);
        Audit::record($request, 'service.updated', $service, $before, $this->auditSnapshot($service->fresh()));
        return response()->json(['message' => 'Service plan updated.', 'data' => $service->load(['industries:id,name', 'brands:id,name'])]);
    }

    public function updateProduct(Request $request, Service $service)
    {
        $this->authorizeServiceOwner($request, $service);
        $before = Service::where('vendor_id', $service->vendor_id)->where('name', $service->name)->where('service_type', $service->service_type)->get()->map(fn ($plan) => $this->auditSnapshot($plan))->all();
        $data = $this->validateProduct($request);
        abort_unless(Category::whereKey($data['subcategory_id'])->where('parent_id', $data['category_id'])->exists(), 422, 'Selected subcategory does not belong to this category.');

        $original = ['vendor_id' => $service->vendor_id, 'name' => $service->name, 'service_type' => $service->service_type];
        $targetVendorId = $request->user()->account_type === 'vendor' ? $service->vendor_id : (int) ($data['vendor_id'] ?? 0);
        abort_unless($targetVendorId && Vendor::whereKey($targetVendorId)->exists(), 422, 'Select a valid vendor for this service.');
        if ($data['service_type'] === 'hardware') abort_if(Service::where('vendor_id', $targetVendorId)->where('sku', $data['sku'])->where(fn ($query) => $query->where('name', '!=', $original['name'])->orWhere('service_type', '!=', $original['service_type']))->exists(), 422, 'This SKU is already used by another hardware product.');
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
        Audit::record($request, 'service.product_updated', $service, ['plans' => $before], ['plans' => $services->map(fn ($plan) => $this->auditSnapshot($plan))->all()]);

        return response()->json(['message' => 'Complete service updated successfully.', 'data' => $services]);
    }

    public function destroyProduct(Request $request, Service $service)
    {
        $this->authorizeServiceOwner($request, $service);
        $plans = Service::where('vendor_id', $service->vendor_id)->where('name', $service->name)->where('service_type', $service->service_type)->get();
        $before = $plans->map(fn ($plan) => $this->auditSnapshot($plan))->all();
        Service::where('vendor_id', $service->vendor_id)->where('name', $service->name)->where('service_type', $service->service_type)->delete();
        Audit::record($request, 'service.product_deleted', $service, ['plans' => $before]);
        return response()->json(['message' => 'Complete service and all pricing plans deleted successfully.']);
    }

    public function store(Request $request)
    {
        $this->normalizeHardwarePricing($request);
        $data = $request->validate([
            'vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'name' => ['required', 'string', 'max:150'],
            'features' => ['nullable', 'string', 'max:5000'],
            'certificates' => ['nullable', 'array', 'max:20'],
            'certificates.*.name' => ['required', 'string', 'max:255'],
            'certificates.*.data' => ['required', 'string', 'max:1400000', 'regex:#^data:(application/pdf|image/(jpeg|png|webp));base64,#'],
            'image_data' => ['nullable', 'string', 'max:1400000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
            'image_datas' => ['nullable', 'array', 'max:8'],
            'image_datas.*' => ['string', 'max:1400000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
            'category_id' => ['required', Rule::exists('categories', 'id')->whereNull('parent_id')],
            'subcategory_id' => ['required', 'integer', 'exists:categories,id'],
            'industry_ids' => ['required', 'array', 'min:1'],
            'industry_ids.*' => ['integer', 'exists:industries,id'],
            'brand_ids' => ['nullable', 'array'],
            'brand_ids.*' => [Rule::exists('brands', 'id')->where('status', 'approved')],
            'service_type' => ['required', Rule::in(['software', 'hardware', 'services'])],
            'sku' => ['nullable', 'required_if:service_type,hardware', 'string', 'max:80', 'regex:/^[A-Za-z0-9._-]+$/'],
            'inventory_quantity' => ['nullable', 'required_if:service_type,hardware', 'integer', 'min:0', 'max:100000000'],
            'low_stock_threshold' => ['nullable', 'required_if:service_type,hardware', 'integer', 'min:0', 'max:100000000'],
            'track_inventory' => ['sometimes', 'boolean'],
            'deployment' => ['required', Rule::in(['cloud', 'on_prem', 'hybrid'])],
            'ai_enabled' => ['required', 'boolean'],
            'sell_globally' => ['sometimes', 'boolean'],
            'selling_countries' => ['nullable', 'required_if:sell_globally,true', 'array', 'min:1'],
            'selling_countries.*' => ['string', 'size:2', 'regex:/^[A-Z]{2}$/', 'distinct'],
            'pricing_mode' => ['required', Rule::in(['starting_price', 'flexible_price'])],
            'monthly_price' => ['required', 'numeric', 'min:0'],
            'billing_cycles' => ['required', 'array', 'min:1'],
            'billing_cycles.*' => [Rule::in(['hourly', 'daily', 'monthly', 'quarterly', 'semi_annual', 'annual'])],
            'discounts' => ['nullable', 'array'],
            'discounts.*' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'specifications' => ['nullable', 'array'],
            'specifications.*' => ['nullable', 'string', 'max:1000'],
        ]);
        $this->validateSellingCountries($data);
        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
        } else {
            abort_unless(!empty($data['vendor_id']), 422, 'Select the vendor for this service.');
            $vendor = Vendor::findOrFail($data['vendor_id']);
            if (! $request->user()->isSuperAdmin()) {
                abort_unless($request->user()->assignedVendors()->whereKey($vendor->id)->exists(), 403, 'This vendor is not assigned to you.');
            }
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
        foreach ($services as $service) {
            Audit::record($request, 'service.created', $service, null, $this->auditSnapshot($service));
        }
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

    private function auditSnapshot(Service $service): array
    {
        return $service->only([
            'id', 'vendor_id', 'category_id', 'subcategory_id', 'industry_id', 'brand_id',
            'name', 'service_type', 'sku', 'deployment', 'ai_enabled', 'pricing_mode',
            'monthly_price', 'billing_cycle', 'discount_percent', 'price_from',
            'inventory_quantity', 'low_stock_threshold', 'track_inventory',
            'sell_globally', 'selling_countries',
        ]);
    }

    private function authorizeServiceOwner(Request $request, Service $service): void
    {
        if ($request->user()->account_type === 'vendor') {
            $vendor = Vendor::where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($service->vendor_id === $vendor->id, 403, 'You can only manage your own services.');
        } elseif ($request->user()->account_type === 'staff' && ! $request->user()->isSuperAdmin()) {
            abort_unless($request->user()->assignedVendors()->whereKey($service->vendor_id)->exists(), 403, 'This service belongs to a vendor that is not assigned to you.');
        }
    }

    private function validateProduct(Request $request): array
    {
        $this->normalizeHardwarePricing($request);
        $data = $request->validate([
            'vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'name' => ['required', 'string', 'max:150'],
            'features' => ['nullable', 'string', 'max:5000'],
            'certificates' => ['nullable', 'array', 'max:20'],
            'certificates.*.name' => ['required', 'string', 'max:255'],
            'certificates.*.data' => ['required', 'string', 'max:1400000', 'regex:#^data:(application/pdf|image/(jpeg|png|webp));base64,#'],
            'category_id' => ['required', Rule::exists('categories', 'id')->whereNull('parent_id')],
            'subcategory_id' => ['required', 'integer', 'exists:categories,id'],
            'industry_ids' => ['required', 'array', 'min:1'],
            'industry_ids.*' => ['integer', 'exists:industries,id'],
            'brand_ids' => ['nullable', 'array'],
            'brand_ids.*' => [Rule::exists('brands', 'id')->where('status', 'approved')],
            'service_type' => ['required', Rule::in(['software', 'hardware', 'services'])],
            'sku' => ['nullable', 'required_if:service_type,hardware', 'string', 'max:80', 'regex:/^[A-Za-z0-9._-]+$/'],
            'inventory_quantity' => ['nullable', 'required_if:service_type,hardware', 'integer', 'min:0', 'max:100000000'],
            'low_stock_threshold' => ['nullable', 'required_if:service_type,hardware', 'integer', 'min:0', 'max:100000000'],
            'track_inventory' => ['sometimes', 'boolean'],
            'deployment' => ['required', Rule::in(['cloud', 'on_prem', 'hybrid'])],
            'ai_enabled' => ['required', 'boolean'],
            'sell_globally' => ['sometimes', 'boolean'],
            'selling_countries' => ['nullable', 'required_if:sell_globally,true', 'array', 'min:1'],
            'selling_countries.*' => ['string', 'size:2', 'regex:/^[A-Z]{2}$/', 'distinct'],
            'pricing_mode' => ['required', Rule::in(['starting_price', 'flexible_price'])],
            'monthly_price' => ['required', 'numeric', 'min:0'],
            'billing_cycles' => ['required', 'array', 'min:1'],
            'billing_cycles.*' => [Rule::in(['hourly', 'daily', 'monthly', 'quarterly', 'semi_annual', 'annual'])],
            'discounts' => ['nullable', 'array'],
            'discounts.*' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'specifications' => ['nullable', 'array'],
            'specifications.*' => ['nullable', 'string', 'max:1000'],
        ]);
        $this->validateSellingCountries($data);
        return $data;
    }

    private function validateSellingCountries(array &$data): void
    {
        $data['sell_globally'] = (bool) ($data['sell_globally'] ?? false);
        if (! $data['sell_globally']) {
            $data['selling_countries'] = null;
            return;
        }
        $data['selling_countries'] = array_values(array_unique($data['selling_countries'] ?? []));
        $allowed = PlatformSetting::allowedSellingCountries();
        if ($allowed !== null) {
            abort_unless(collect($data['selling_countries'])->every(fn ($code) => in_array($code, $allowed, true)), 422, 'One or more selected countries are not enabled by the administrator.');
        }
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

    private function normalizeHardwarePricing(Request $request): void
    {
        if ($request->input('service_type') !== 'hardware') return;

        // Hardware is sold at one unit price. "monthly" is retained only as the
        // legacy database value so existing schemas do not need a fake plan type.
        $request->merge([
            'billing_cycles' => ['monthly'],
            'discounts' => [],
        ]);
    }
}
