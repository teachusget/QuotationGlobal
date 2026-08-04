<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function authenticatedUser(): User
    {
        $user = User::create([
            'name' => 'Original Name',
            'email' => 'account@example.com',
            'password' => 'password123',
            'account_type' => 'staff',
        ]);
        Sanctum::actingAs($user);
        return $user;
    }

    public function test_authenticated_user_can_update_personal_and_company_profiles(): void
    {
        $user = $this->authenticatedUser();
        $this->patchJson('/api/auth/profile', ['name' => 'Updated Name', 'username' => 'updated_user', 'phone' => '+92 300 1234567'])
            ->assertOk()->assertJsonPath('user.name', 'Updated Name');
        $this->patchJson('/api/auth/company', ['company_name' => 'Acme Systems', 'country' => 'Pakistan', 'city' => 'Lahore', 'address' => 'Main Boulevard'])
            ->assertOk()->assertJsonPath('user.company_name', 'Acme Systems');
        $this->assertSame('updated_user', $user->fresh()->username);
    }

    public function test_password_change_requires_the_current_password(): void
    {
        $this->authenticatedUser();
        $this->patchJson('/api/auth/password', ['current_password' => 'wrong-password', 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
    }

    public function test_authenticated_user_can_change_password(): void
    {
        $user = $this->authenticatedUser();
        $this->patchJson('/api/auth/password', ['current_password' => 'password123', 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123'])
            ->assertOk();
        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }
}
