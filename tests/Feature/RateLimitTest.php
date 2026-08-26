<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_api_requests_receive_the_token_scoped_limit(): void
    {
        $user = User::create(['name' => 'Rate User', 'email' => 'rate@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $token = $user->createToken('rate-test')->plainTextToken;

        $this->withToken($token)->getJson('/api/auth/user')
            ->assertOk()
            ->assertHeader('X-RateLimit-Limit', '300');
    }

    public function test_public_api_requests_receive_the_guest_limit(): void
    {
        $this->getJson('/api/marketplace/categories')
            ->assertOk()
            ->assertHeader('X-RateLimit-Limit', '120');
    }

    public function test_login_keeps_a_strict_credential_limit(): void
    {
        $this->postJson('/api/auth/login', ['login' => 'missing@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable()
            ->assertHeader('X-RateLimit-Limit', '10');
    }
}
