<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_customer_login_token_remains_valid_for_current_user_request(): void
    {
        $customer = User::create([
            'name' => 'Customer Session',
            'email' => 'customer-session@example.com',
            'password' => 'password123',
            'account_type' => 'buyer',
            'email_verified_at' => now(),
        ]);
        $customer->assignRole('Buyer');

        $login = $this->postJson('/api/auth/login', ['login' => $customer->email, 'password' => 'password123']);
        $login->assertOk()->assertJsonPath('user.account_type', 'buyer')->assertJsonPath('user.roles.0.name', 'Buyer');

        $this->withToken($login->json('token'))->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('user.id', $customer->id)
            ->assertJsonPath('user.account_type', 'buyer');

        $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $customer->id]);
    }

    public function test_vendor_login_token_restores_vendor_workspace_permissions(): void
    {
        $vendor = User::create([
            'name' => 'Vendor Session',
            'email' => 'vendor-session@example.com',
            'password' => 'password123',
            'account_type' => 'vendor',
            'email_verified_at' => now(),
        ]);
        $vendor->assignRole('Vendor');

        $login = $this->postJson('/api/auth/login', ['login' => $vendor->email, 'password' => 'password123']);
        $login->assertOk()
            ->assertJsonPath('user.account_type', 'vendor')
            ->assertJsonFragment(['name' => 'Vendor'])
            ->assertJsonFragment(['services.view']);

        $this->withToken($login->json('token'))->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('user.id', $vendor->id)
            ->assertJsonPath('user.account_type', 'vendor')
            ->assertJsonFragment(['vendors.view'])
            ->assertJsonFragment(['services.view']);

        $this->withToken($login->json('token'))->getJson('/api/users')->assertForbidden();
    }
}
