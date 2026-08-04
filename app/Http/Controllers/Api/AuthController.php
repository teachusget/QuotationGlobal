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
        $user->fill([...$data, 'role' => 'buyer', 'email_verification_code' => Hash::make($code), 'email_verification_expires_at' => now()->addMinutes(10)]);
        $user->save();
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
        $user = User::where('email', $data['email'])->where('role', 'buyer')->firstOrFail();
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
        if ($user->role === 'buyer' && ! $user->email_verified_at) throw ValidationException::withMessages(['login' => ['Verify your email before signing in.']]);

        $user->update(['last_login_at' => now()]);

        $user->tokens()->delete();

        return response()->json($this->authenticationResponse($user));
    }

    public function user(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function impersonateVendor(Request $request, Vendor $vendor)
    {
        $vendorUser = $vendor->user;
        abort_unless($vendorUser && $vendorUser->role === 'vendor', 422, 'This vendor does not have a linked login account.');

        Log::info('Admin started vendor impersonation.', [
            'admin_user_id' => $request->user()->id,
            'vendor_id' => $vendor->id,
            'vendor_user_id' => $vendorUser->id,
        ]);

        return response()->json([
            'user' => $vendorUser,
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
            'user' => $user,
            'token' => $user->createToken('portal')->plainTextToken,
        ];
    }
}
