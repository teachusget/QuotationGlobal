<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function registerVendor(Request $request)
    {
        $data = $request->validate([
            'registration_type' => ['required', Rule::in(['freelancer', 'agency', 'company'])],
            'name' => ['required', 'string', 'max:150'],
            'first_name' => ['nullable', 'string', 'max:75'],
            'last_name' => ['nullable', 'string', 'max:75'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['required', 'email:rfc,dns', 'max:150', 'unique:users,email', 'unique:vendors,email'],
            'country' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:1000'],
            'city' => ['required', 'string', 'max:100'],
            'company_name' => ['required', 'string', 'max:150'],
            'designation' => ['nullable', 'string', 'max:100'],
            'business_type' => ['nullable', 'string', 'max:100'],
        ]);
        $code = (string) random_int(100000, 999999);
        DB::transaction(function () use ($data, $code) {
            $user = User::create([
                'name' => trim($data['name']), 'email' => trim($data['email']), 'phone' => trim($data['phone']),
                'company_name' => trim($data['company_name']), 'address' => trim($data['address'] ?? ''),
                'city' => trim($data['city']), 'country' => trim($data['country']), 'password' => $data['password'],
                'account_type' => 'vendor', 'email_verification_code' => Hash::make($code),
                'email_verification_expires_at' => now()->addMinutes(10),
            ]);
            $user->syncRoles(['Vendor']);
            Vendor::create([
                ...collect($data)->except(['password_confirmation'])->all(), 'user_id' => $user->id,
                'password' => Hash::make($data['password']), 'status' => 'pending_approval',
            ]);
        });
        Mail::raw("Your Quotation Global Solution Provider verification code is: {$code}\n\nThis code expires in 10 minutes.", fn ($mail) => $mail->to($data['email'], $data['name'])->subject('Verify your Solution Provider application'));
        return response()->json(['message' => 'Application received. Verify your email to submit it for approval.', 'email' => $data['email'], 'requires_verification' => true, 'verification_code' => app()->isLocal() ? $code : null], 201);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'username' => ['nullable', 'string', 'max:80', 'alpha_dash', 'unique:users,username'],
            'email' => ['required', 'email:rfc,dns', 'max:150'],
            'phone' => ['required', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:150'],
            'company_logo_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
            'address' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $existing = User::where('email', $data['email'])->first();
        if ($existing?->email_verified_at) throw ValidationException::withMessages(['email' => ['This email is already registered.']]);
        $code = (string) random_int(100000, 999999);
        $user = $existing ?: new User();
        $user->fill([...$data, 'account_type' => 'buyer', 'email_verification_code' => Hash::make($code), 'email_verification_expires_at' => now()->addMinutes(10)]);
        $user->save();
        $user->syncRoles(['Buyer']);
        Mail::raw("Your Quotation Global verification code is: {$code}\n\nThis code expires in 10 minutes.", fn ($mail) => $mail->to($user->email)->subject('Verify your Quotation Global account'));
        return response()->json([
            'message' => 'A verification code was sent to your email.',
            'email' => $user->email,
            'requires_verification' => true,
            'verification_code' => app()->isLocal() ? $code : null,
        ], 201);
    }

    public function verifyEmail(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'code' => ['required', 'digits:6']]);
        $user = User::where('email', $data['email'])->firstOrFail();
        if (! $user->email_verification_code || ! $user->email_verification_expires_at || $user->email_verification_expires_at->isPast() || ! Hash::check($data['code'], $user->email_verification_code)) {
            throw ValidationException::withMessages(['code' => ['The verification code is invalid or expired.']]);
        }
        $user->update(['email_verified_at' => now(), 'email_verification_code' => null, 'email_verification_expires_at' => null, 'last_login_at' => now()]);
        if ($user->account_type === 'vendor') {
            return response()->json(['message' => 'Email verified. Your application is now pending administrator approval.', 'pending_approval' => true]);
        }
        return response()->json($this->authenticationResponse($user));
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'login' => ['nullable', 'string', 'required_without:email'],
            'email' => ['nullable', 'string', 'required_without:login'],
            'password' => ['required', 'string'],
        ]);

        $login = trim($credentials['login'] ?? $credentials['email']);
        $user = User::where('email', $login)->orWhere('username', $login)->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Username/email or password is incorrect.'],
            ]);
        }
        if ($user->is_blocked) throw ValidationException::withMessages(['login' => ['Your account has been blocked. Please contact support.']]);
        if (in_array($user->account_type, ['buyer', 'vendor'], true) && ! $user->email_verified_at) throw ValidationException::withMessages(['login' => ['Verify your email before signing in.']]);
        if ($user->account_type === 'vendor' && $user->vendorProfile && $user->vendorProfile->status !== 'approved') {
            $message = $user->vendorProfile->status === 'suspended'
                ? 'Your Solution Provider account is inactive. Please contact support.'
                : 'Your Solution Provider application is awaiting administrator approval.';
            throw ValidationException::withMessages(['login' => [$message]]);
        }

        $user->update(['last_login_at' => now()]);

        $user->tokens()->delete();

        return response()->json($this->authenticationResponse($user));
    }

    public function user(Request $request)
    {
        return response()->json(['user' => $this->serializeUser($request->user())]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function impersonateVendor(Request $request, Vendor $vendor)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort_unless($request->user()->assignedVendors()->whereKey($vendor->id)->exists(), 403, 'This vendor is not assigned to you.');
        }
        abort_unless($vendor->status === 'approved', 422, 'Activate this vendor before logging in.');
        $vendorUser = $vendor->user;
        abort_unless($vendorUser && $vendorUser->account_type === 'vendor', 422, 'This vendor does not have a linked login account.');

        Log::info('Admin started vendor impersonation.', [
            'admin_user_id' => $request->user()->id,
            'vendor_id' => $vendor->id,
            'vendor_user_id' => $vendorUser->id,
        ]);

        return response()->json([
            'user' => $this->serializeUser($vendorUser),
            'token' => $vendorUser->createToken('admin-impersonation')->plainTextToken,
            'impersonated_by' => $request->user()->only(['id', 'name', 'email']),
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $user = User::where('email', $data['email'])->firstOrFail();
        $token = Password::createToken($user);
        $user->sendPasswordResetNotification($token);
        $resetUrl = url('/reset-password/'.$token).'?email='.urlencode($user->email);

        return response()->json([
            'message' => 'Password reset instructions have been sent.',
            'reset_url' => app()->isLocal() ? $resetUrl : null,
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
            ])->save();
            $user->tokens()->delete();
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'Password reset successfully. You can now sign in.',
        ]);
    }

    private function authenticationResponse(User $user): array
    {
        return [
            'user' => $this->serializeUser($user),
            'token' => $user->createToken('portal')->plainTextToken,
        ];
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'username' => ['nullable', 'string', 'max:80', 'alpha_dash', Rule::unique('users', 'username')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);
        $user->update($data);
        if ($user->account_type === 'vendor' && $user->vendorProfile) {
            $parts = preg_split('/\s+/', trim($data['name']), 2);
            $user->vendorProfile->update(['name' => $data['name'], 'first_name' => $parts[0] ?? '', 'last_name' => $parts[1] ?? '', 'phone' => $data['phone'] ?? $user->vendorProfile->phone]);
        }
        return response()->json(['message' => 'Profile updated successfully.', 'user' => $this->serializeUser($user->fresh())]);
    }

    public function updateCompany(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'company_name' => ['nullable', 'string', 'max:150'],
            'company_logo_data' => ['nullable', 'string', 'max:2800000', 'regex:#^data:image/(png|jpeg|webp);base64,#'],
            'address' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);
        DB::transaction(function () use ($user, $data) {
            $user->update($data);
            if ($user->account_type === 'vendor' && $user->vendorProfile) {
                $user->vendorProfile->update([
                    'company_name' => $data['company_name'] ?? null,
                    'logo_data' => $data['company_logo_data'] ?? null,
                    'address' => $data['address'] ?? null,
                    'city' => $data['city'] ?? null,
                    'country' => $data['country'] ?? null,
                ]);
            }
        });
        return response()->json(['message' => 'Company profile updated successfully.', 'user' => $this->serializeUser($user->fresh())]);
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['The current password is incorrect.']]);
        }
        $user->forceFill(['password' => $data['password'], 'remember_token' => Str::random(60)])->save();
        $currentTokenId = $user->currentAccessToken()?->id;
        $user->tokens()->when($currentTokenId, fn ($query) => $query->where('id', '!=', $currentTokenId))->delete();
        return response()->json(['message' => 'Password updated successfully. Other sessions have been signed out.']);
    }

    private function serializeUser(User $user): User
    {
        $user->load(['roles:id,name', 'vendorProfile']);
        if ($user->account_type === 'vendor' && $user->vendorProfile) {
            $user->setAttribute('vendor_id', $user->vendorProfile->id);
            foreach (['company_name', 'address', 'city', 'country'] as $field) {
                if (! $user->{$field}) $user->setAttribute($field, $user->vendorProfile->{$field});
            }
            if (! $user->company_logo_data) $user->setAttribute('company_logo_data', $user->vendorProfile->logo_data);
        }
        $permissions = $user->getAllPermissions()->pluck('name')->values();
        $user->unsetRelation('permissions')->unsetRelation('vendorProfile')->setAttribute('permissions', $permissions);
        return $user;
    }
}
