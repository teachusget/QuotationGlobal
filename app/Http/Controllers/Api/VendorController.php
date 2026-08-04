<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        $query = Vendor::with(['user:id', 'industry:id,name', 'serviceCategory:id,name'])->latest();

        if ($request->user()->account_type === 'vendor') {
            $query->where('user_id', $request->user()->id);
        }

        return response()->json([
            'data' => $query->get()->map(fn ($vendor) => $this->resource($vendor)),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);

        abort_if($request->user()->account_type === 'vendor', 403, 'Vendor accounts cannot create other vendors.');

        $vendor = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => trim($data['name']),
                'email' => trim($data['email']),
                'password' => $data['password'],
                'account_type' => 'vendor',
            ]);
            $user->assignRole('Vendor');

            return Vendor::create([
                ...$this->payload($data),
                'user_id' => $user->id,
            ]);
        });

        return response()->json([
            'message' => 'Registration saved successfully.',
            'data' => $this->resource($vendor->load(['user:id', 'industry:id,name', 'serviceCategory:id,name'])),
        ], 201);
    }

    public function update(Request $request, Vendor $vendor)
    {
        $data = $this->validatedData($request);
        $this->authorizeVendor($request, $vendor);

        DB::transaction(function () use ($data, $vendor) {
            $vendor->update($this->payload($data, $vendor));
            $account = array_filter([
                'name' => trim($data['name']),
                'email' => trim($data['email']),
                'password' => $data['password'] ?? null,
            ], fn ($value) => $value !== null && $value !== '');

            if ($vendor->user) {
                $vendor->user->update($account);
            } else {
                $user = User::create([...$account, 'account_type' => 'vendor']);
                $user->assignRole('Vendor');
                $vendor->update(['user_id' => $user->id]);
            }
        });

        return response()->json([
            'message' => 'Registration updated successfully.',
            'data' => $this->resource($vendor->load(['user:id', 'industry:id,name', 'serviceCategory:id,name'])),
        ]);
    }

    public function destroy(Request $request, Vendor $vendor)
    {
        abort_if($request->user()->account_type === 'vendor', 403, 'Vendor accounts cannot delete vendors.');

        DB::transaction(function () use ($vendor) {
            $user = $vendor->user;
            $vendor->delete();
            $user?->delete();
        });

        return response()->json([
            'message' => 'Registration deleted successfully.',
        ]);
    }

    public function document(Vendor $vendor)
    {
        abort_unless(
            $vendor->document_data
                && preg_match('#^data:((?:image/(?:png|jpeg|webp))|application/pdf);base64,(.+)$#', $vendor->document_data, $parts),
            404
        );

        return response(base64_decode($parts[2]))
            ->header('Content-Type', $parts[1])
            ->header('Cache-Control', 'private, max-age=3600');
    }

    public function logo(Vendor $vendor)
    {
        abort_unless(
            $vendor->logo_data
                && preg_match('#^data:(image/(?:png|jpeg|webp));base64,(.+)$#', $vendor->logo_data, $parts),
            404
        );

        return response(base64_decode($parts[2]))
            ->header('Content-Type', $parts[1])
            ->header('Cache-Control', 'public, max-age=3600');
    }

    private function validatedData(Request $request): array
    {
        $type = $request->input('registration_type');
        $needsAccount = $request->isMethod('post') || ! $request->route('vendor')?->user_id;

        return $request->validate([
            'registration_type' => ['required', Rule::in(['freelancer', 'agency', 'company'])],
            'name' => ['required', 'string', 'max:150'],
            'first_name' => ['nullable', 'string', 'max:75'],
            'last_name' => ['nullable', 'string', 'max:75'],
            'password' => [$needsAccount ? 'required' : 'nullable', 'string', 'min:8', 'max:100', 'confirmed'],
            'password_confirmation' => ['required_with:password', 'string', 'min:8', 'max:100'],
            'designation' => ['nullable', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => [
                'required',
                'email',
                'max:150',
                Rule::unique('users', 'email')->ignore($request->route('vendor')?->user_id),
            ],
            'country' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:1000'],
            'city' => ['required', 'string', 'max:100'],
            'company_name' => ['required', 'string', 'max:150'],
            'business_type' => ['nullable', 'string', 'max:100'],
            'industry_id' => ['nullable', 'integer', 'exists:industries,id'],
            'service_category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'status' => ['nullable', Rule::in(['pending_approval', 'approved', 'rejected', 'suspended'])],
            'document_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:(image/(png|jpeg|webp)|application/pdf);base64,#'],
            'logo_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
        ]);
    }

    private function payload(array $data, ?Vendor $vendor = null): array
    {
        $payload = collect($data)->map(fn ($value) => is_string($value) ? trim($value) : $value)->all();
        $payload['status'] = $payload['status'] ?? $vendor?->status ?? 'pending_approval';
        unset($payload['password_confirmation']);

        if (! empty($payload['password'])) {
            $payload['password'] = Hash::make($payload['password']);
        } else {
            unset($payload['password']);
        }

        return $payload;
    }

    private function authorizeVendor(Request $request, Vendor $vendor): void
    {
        if ($request->user()->account_type === 'vendor' && $vendor->user_id !== $request->user()->id) {
            abort(403, 'You can only access your own vendor account.');
        }
    }

    private function resource(Vendor $vendor): array
    {
        $data = $vendor->toArray();
        unset($data['password'], $data['document_data'], $data['logo_data']);

        return [
            ...$data,
            'document_url' => $vendor->document_data ? url('/api/vendors/'.$vendor->id.'/document') : null,
            'logo_url' => $vendor->logo_data ? url('/api/vendors/'.$vendor->id.'/logo') : null,
        ];
    }
}
