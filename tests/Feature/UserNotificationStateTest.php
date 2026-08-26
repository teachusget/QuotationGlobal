<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserNotificationStateTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_state_is_scoped_to_authenticated_user(): void
    {
        $first = $this->user('first@example.test');
        $second = $this->user('second@example.test');

        Sanctum::actingAs($first);
        $this->postJson('/api/notification-states/read', ['keys' => ['rfq:12:pending:created']])
            ->assertOk();
        $this->postJson('/api/notification-states/clear', ['keys' => ['rfq:13:quoted:updated']])
            ->assertOk();
        $this->getJson('/api/notification-states')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['notification_key' => 'rfq:12:pending:created']);

        Sanctum::actingAs($second);
        $this->getJson('/api/notification-states')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_notification_keys_are_validated(): void
    {
        Sanctum::actingAs($this->user('validation@example.test'));

        $this->postJson('/api/notification-states/clear', ['keys' => ['invalid key']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('keys.0');
    }

    private function user(string $email): User
    {
        return User::create(['name' => 'Notification User', 'email' => $email, 'password' => Hash::make('password')]);
    }
}
