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
        $user = User::where('email', $data['email'])->where('account_type', 'buyer')->firstOrFail();
        if (! $user->email_verification_code || ! $user->email_verification_expires_at || $user->email_verification_expires_at->isPast() || ! Hash::check($data['code'], $user->email_verification_code)) {
            throw ValidationException::withMessages(['code' => ['The verification code is invalid or expired.']]);
        }
        $user->update(['email_verified_at' => now(), 'email_verification_code' => null, 'email_verification_expires_at' => null, 'last_login_at' => now()]);
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
        if ($user->account_type === 'buyer' && ! $user->email_verified_at) throw ValidationException::withMessages(['login' => ['Verify your email before signing in.']]);

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
