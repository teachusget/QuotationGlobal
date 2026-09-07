<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditCoverageTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_and_vendor_create_delete_actions_are_persisted(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'audit-admin@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $admin->assignRole('Super Admin');
        Sanctum::actingAs($admin);

        $categoryId = $this->postJson('/api/categories', [
            'name' => 'Audit Category', 'details' => 'Coverage', 'type' => 'category',
        ])->assertCreated()->json('data.id');
        $this->deleteJson("/api/categories/{$categoryId}")->assertOk();

        $brandId = $this->postJson('/api/brands', [
            'name' => 'Audit Brand', 'details' => 'Coverage',
        ])->assertCreated()->json('data.id');
        $this->deleteJson("/api/brands/{$brandId}")->assertOk();

        $industryId = $this->postJson('/api/industries', [
            'name' => 'Audit Industry', 'description' => 'Coverage', 'status' => 'active',
        ])->assertCreated()->json('data.id');
        $this->deleteJson("/api/industries/{$industryId}")->assertOk();

        $specificationId = $this->postJson('/api/specifications', [
            'name' => 'Audit Specification', 'field_type' => 'text',
            'is_required' => false, 'is_comparable' => true,
        ])->assertCreated()->json('data.id');
        $this->deleteJson("/api/specifications/{$specificationId}")->assertOk();

        $vendorId = $this->postJson('/api/vendors', [
            'registration_type' => 'company', 'name' => 'Audit Vendor',
            'password' => 'password123', 'password_confirmation' => 'password123',
            'phone' => '+92 300 1234567', 'email' => 'audit-vendor@example.com',
            'country' => 'Pakistan', 'city' => 'Lahore', 'company_name' => 'Audit Vendor Ltd',
        ])->assertCreated()->json('data.id');
        $this->deleteJson("/api/vendors/{$vendorId}")->assertOk();

        foreach ([
            'category.created', 'category.deleted', 'brand.created', 'brand.deleted',
            'industry.created', 'industry.deleted', 'specification.created',
            'specification.deleted', 'vendor.created', 'vendor.deleted',
        ] as $action) {
            $this->assertDatabaseHas('audit_logs', ['actor_id' => $admin->id, 'action' => $action]);
        }
    }

    public function test_audit_payload_recursively_removes_secrets_and_binary_data(): void
    {
        $user = User::create(['name' => 'Actor', 'email' => 'audit-actor@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $request = Request::create('/audit-test', 'POST');
        $request->setUserResolver(fn () => $user);

        Audit::record($request, 'audit.redaction_test', $user, null, [
            'safe' => 'visible',
            'password' => 'secret',
            'nested' => ['token' => 'secret-token', 'logo_data' => 'data:image/png;base64,abc', 'safe' => 'nested-visible'],
        ]);

        $payload = AuditLog::where('action', 'audit.redaction_test')->firstOrFail()->after;
        $this->assertSame('visible', $payload['safe']);
        $this->assertSame('nested-visible', $payload['nested']['safe']);
        $this->assertArrayNotHasKey('password', $payload);
        $this->assertArrayNotHasKey('token', $payload['nested']);
        $this->assertArrayNotHasKey('logo_data', $payload['nested']);
    }

    public function test_every_mutating_api_request_records_user_time_route_and_result(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'request-audit@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $admin->assignRole('Super Admin');
        Sanctum::actingAs($admin);

        $this->postJson('/api/categories', ['name' => 'Request Audit', 'type' => 'category'])->assertCreated();
        $this->postJson('/api/categories', ['type' => 'category'])->assertUnprocessable();

        $logs = AuditLog::where('action', 'api.request')->where('actor_id', $admin->id)->orderBy('id')->get();
        $this->assertCount(2, $logs);
        $this->assertSame('/api/categories', $logs[0]->after['path']);
        $this->assertSame('POST', $logs[0]->after['method']);
        $this->assertSame(201, $logs[0]->after['status']);
        $this->assertTrue($logs[0]->after['succeeded']);
        $this->assertNotNull($logs[0]->created_at);
        $this->assertSame(422, $logs[1]->after['status']);
        $this->assertFalse($logs[1]->after['succeeded']);
        $this->assertNull($logs[1]->after['exception']);

        $this->getJson('/api/categories')->assertOk();
        $this->assertSame(2, AuditLog::where('action', 'api.request')->where('actor_id', $admin->id)->count());
    }
}
