<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Industry;
use App\Models\Service;
use App\Models\User;
use App\Models\Vendor;
use App\Support\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendor_documents_require_an_authorized_owner(): void
    {
        $owner = User::create(['name' => 'Vendor Owner', 'email' => 'owner@example.com', 'password' => 'password123', 'account_type' => 'vendor']);
        $owner->assignRole('Vendor');
        $vendor = Vendor::create([
            'user_id' => $owner->id, 'registration_type' => 'company', 'name' => 'Private Vendor',
            'phone' => '+92 300 0000001', 'email' => 'private@example.com', 'company_name' => 'Private Ltd',
            'status' => 'approved', 'document_data' => 'data:application/pdf;base64,'.base64_encode('%PDF-1.4 private'),
        ]);

        $this->getJson("/api/vendors/{$vendor->id}/document")->assertUnauthorized();

        $other = User::create(['name' => 'Other Vendor', 'email' => 'other@example.com', 'password' => 'password123', 'account_type' => 'vendor']);
        $other->assignRole('Vendor');
        Vendor::create(['user_id' => $other->id, 'registration_type' => 'company', 'name' => 'Other', 'phone' => '+92 300 0000002', 'email' => 'other-vendor@example.com', 'company_name' => 'Other Ltd', 'status' => 'approved']);
        Sanctum::actingAs($other);
        $this->get("/api/vendors/{$vendor->id}/document")->assertForbidden();

        Sanctum::actingAs($owner);
        $this->get("/api/vendors/{$vendor->id}/document")
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('Content-Disposition');
    }

    public function test_limited_staff_only_sees_and_manages_assigned_vendor_services(): void
    {
        $staff = User::create(['name' => 'Limited Staff', 'email' => 'staff@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $staff->givePermissionTo(['services.view', 'services.update']);
        $assigned = Vendor::create(['registration_type' => 'company', 'name' => 'Assigned', 'phone' => '1', 'email' => 'assigned@example.com', 'company_name' => 'Assigned']);
        $other = Vendor::create(['registration_type' => 'company', 'name' => 'Other', 'phone' => '2', 'email' => 'outside@example.com', 'company_name' => 'Outside']);
        $staff->assignedVendors()->attach($assigned);
        $category = Category::create(['name' => 'Security', 'slug' => 'security']);
        $subcategory = Category::create(['parent_id' => $category->id, 'name' => 'Hardening', 'slug' => 'hardening']);
        $industry = Industry::create(['name' => 'Technology', 'slug' => 'security-technology']);
        $catalog = ['category_id' => $category->id, 'subcategory_id' => $subcategory->id, 'industry_id' => $industry->id];
        $visible = Service::create([...$catalog, 'vendor_id' => $assigned->id, 'name' => 'Visible', 'service_type' => 'software', 'billing_cycle' => 'monthly']);
        $hidden = Service::create([...$catalog, 'vendor_id' => $other->id, 'name' => 'Hidden', 'service_type' => 'software', 'billing_cycle' => 'monthly']);
        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/services')->assertOk();
        $this->assertSame([$visible->id], collect($response->json('data'))->pluck('id')->all());
        $this->patchJson("/api/services/{$hidden->id}", ['monthly_price' => 10, 'discount_percent' => 0])->assertForbidden();
    }

    public function test_sensitive_auth_fields_are_removed_from_request_audits(): void
    {
        $actor = User::create(['name' => 'Actor', 'email' => 'actor@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $request = Request::create('/api/auth/password', 'PATCH', [
            'current_password' => 'old-secret', 'password' => 'new-secret',
            'password_confirmation' => 'new-secret', 'code' => '123456', 'safe' => 'visible',
        ]);
        $request->setUserResolver(fn () => $actor);
        Audit::recordRequest($request, 200, true);

        $input = AuditLog::latest('id')->firstOrFail()->after['input'];
        $this->assertSame(['safe' => 'visible'], $input);
    }

    public function test_unverified_registration_cannot_overwrite_existing_credentials(): void
    {
        Mail::fake();
        $user = User::create([
            'name' => 'Original Buyer', 'email' => 'pending-security@gmail.com', 'phone' => '123', 'country' => 'PK',
            'password' => 'original-password', 'account_type' => 'buyer',
            'email_verification_code' => Hash::make('123456'), 'email_verification_expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/auth/register', [
            'name' => 'Attacker Changed Name', 'email' => $user->email, 'phone' => '999', 'country' => 'PK',
            'password' => 'attacker-password', 'password_confirmation' => 'attacker-password',
        ])->assertCreated();

        $user->refresh();
        $this->assertSame('Original Buyer', $user->name);
        $this->assertSame('123', $user->phone);
        $this->assertTrue(Hash::check('original-password', $user->password));
        Mail::assertNothingSent();
    }

    public function test_unknown_password_reset_is_generic_and_security_headers_are_present(): void
    {
        Mail::fake();
        $this->postJson('/api/auth/forgot-password', ['email' => 'unknown@example.com'])
            ->assertOk()
            ->assertJsonPath('message', 'Password reset instructions have been sent.');
        Mail::assertNothingSent();

        $this->get('/')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Content-Security-Policy')
            ->assertHeaderMissing('X-Powered-By');
        $this->assertSame(480, config('sanctum.expiration'));
    }

    public function test_cors_only_allows_configured_frontend_origins(): void
    {
        config(['cors.allowed_origins' => ['https://quotationdigital.com']]);

        $blocked = $this->options('/api/marketplace/categories', [], ['Origin' => 'https://evil.example', 'Access-Control-Request-Method' => 'GET']);
        $this->assertNotSame('https://evil.example', $blocked->headers->get('Access-Control-Allow-Origin'));
        $this->options('/api/marketplace/categories', [], ['Origin' => 'https://quotationdigital.com', 'Access-Control-Request-Method' => 'GET'])
            ->assertHeader('Access-Control-Allow-Origin', 'https://quotationdigital.com');
    }
}
