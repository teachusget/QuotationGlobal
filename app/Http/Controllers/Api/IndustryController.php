<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Industry;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class IndustryController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Industry::orderBy('name')->get()->map(fn ($industry) => $this->resource($industry)),
        ]);
    }

    public function marketplace()
    {
        $industries = Cache::remember('marketplace:industries', 600, fn () => Industry::where('status', 'active')->orderBy('name')->get()->map(fn ($industry) => $this->resource($industry)));
        return response()->json(['data' => $industries])
            ->header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'deactive'])],
            'logo_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
        ]);

        $name = trim($data['name']);
        if (Industry::whereRaw('LOWER(TRIM(name)) = ?', [Str::lower($name)])->exists()) {
            throw ValidationException::withMessages([
                'name' => ['Industry with this name already exists.'],
            ]);
        }

        $industry = Industry::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(5)),
            'description' => isset($data['description']) ? trim($data['description']) : null,
            'logo_data' => $data['logo_data'] ?? null,
            'status' => $data['status'],
        ]);
        Audit::record($request, 'industry.created', $industry, null, $industry->only(['id', 'name', 'slug', 'description', 'status']));

        return response()->json([
            'message' => 'Industry added successfully.',
            'data' => $this->resource($industry),
        ], 201);
    }

    public function update(Request $request, Industry $industry)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'deactive'])],
            'logo_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
        ]);
        $name = trim($data['name']);
        if (Industry::whereKeyNot($industry->id)->whereRaw('LOWER(TRIM(name)) = ?', [Str::lower($name)])->exists()) {
            throw ValidationException::withMessages(['name' => ['Industry with this name already exists.']]);
        }
        $before = $industry->only(['id', 'name', 'slug', 'description', 'status']);
        $industry->update([
            'name' => $name,
            'slug' => $industry->name === $name ? $industry->slug : Str::slug($name).'-'.Str::lower(Str::random(5)),
            'description' => isset($data['description']) ? trim($data['description']) : null,
            'status' => $data['status'],
            ...(array_key_exists('logo_data', $data) ? ['logo_data' => $data['logo_data']] : []),
        ]);
        Audit::record($request, 'industry.updated', $industry, $before, $industry->only(['id', 'name', 'slug', 'description', 'status']));
        return response()->json(['message' => 'Industry updated successfully.', 'data' => $this->resource($industry->fresh())]);
    }

    public function destroy(Request $request, Industry $industry)
    {
        if ($industry->services()->exists() || $industry->legacyServices()->exists()) {
            throw ValidationException::withMessages(['industry' => ['This industry is assigned to services and cannot be deleted. Deactivate it instead.']]);
        }
        $before = $industry->only(['id', 'name', 'slug', 'description', 'status']);
        $industry->delete();
        Audit::record($request, 'industry.deleted', $industry, $before);
        return response()->json(['message' => 'Industry deleted successfully.']);
    }

    public function logo(Industry $industry)
    {
        abort_unless(
            $industry->logo_data
                && preg_match('#^data:(image/(?:png|jpeg|webp));base64,(.+)$#', $industry->logo_data, $parts),
            404
        );

        return response(base64_decode($parts[2]))
            ->header('Content-Type', $parts[1])
            ->header('Cache-Control', 'public, max-age=3600');
    }

    private function resource(Industry $industry): array
    {
        return [
            'id' => $industry->id,
            'name' => $industry->name,
            'slug' => $industry->slug,
            'description' => $industry->description,
            'status' => $industry->status,
            'logo_url' => $industry->logo_data ? url('/api/industries/'.$industry->id.'/logo') : null,
            'created_at' => $industry->created_at,
            'updated_at' => $industry->updated_at,
        ];
    }
}
