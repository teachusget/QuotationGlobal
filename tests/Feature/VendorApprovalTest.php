<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VendorApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_approve_a_pending_vendor(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $admin->assignRole('Super Admin');
        $vendor = Vendor::create(['registration_type' => 'company', 'name' => 'Vendor', 'phone' => '+92 300 0000000', 'email' => 'vendor@example.com', 'company_name' => 'Vendor Ltd', 'status' => 'pending_approval']);
        Sanctum::actingAs($admin);

        $this->postJson("/api/vendors/{$vendor->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertSame('approved', $vendor->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'vendor.approved', 'target_id' => $vendor->id]);
    }

    public function test_vendor_role_cannot_approve_a_vendor(): void
    {
        $user = User::create(['name' => 'Vendor', 'email' => 'vendor-user@example.com', 'password' => 'password123', 'account_type' => 'vendor']);
        $user->assignRole('Vendor');
        $vendor = Vendor::create(['registration_type' => 'company', 'name' => 'Pending', 'phone' => '+92 300 0000001', 'email' => 'pending@example.com', 'company_name' => 'Pending Ltd', 'status' => 'pending_approval']);
        Sanctum::actingAs($user);

        $this->postJson("/api/vendors/{$vendor->id}/approve")->assertForbidden();
        $this->assertSame('pending_approval', $vendor->fresh()->status);
    }

    public function test_super_admin_can_deactivate_and_reactivate_an_approved_vendor(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'status-admin@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $admin->assignRole('Super Admin');
        $user = User::create(['name' => 'Vendor', 'email' => 'active-vendor@example.com', 'password' => 'password123', 'account_type' => 'vendor']);
        $user->assignRole('Vendor');
        $token = $user->createToken('vendor-session');
        $vendor = Vendor::create(['user_id' => $user->id, 'registration_type' => 'company', 'name' => 'Vendor', 'phone' => '+92 300 0000002', 'email' => 'active-vendor@example.com', 'company_name' => 'Active Vendor Ltd', 'status' => 'approved']);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/vendors/{$vendor->id}/status", ['active' => false])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $this->assertSame('suspended', $vendor->fresh()->status);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'vendor.deactivated', 'target_id' => $vendor->id]);

        $this->patchJson("/api/vendors/{$vendor->id}/status", ['active' => true])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('audit_logs', ['action' => 'vendor.activated', 'target_id' => $vendor->id]);
    }
}
