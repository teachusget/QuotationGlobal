<?php

namespace Tests\Feature;

use App\Models\MarketplacePage;
use App\Models\MarketplaceTemplate;
use App\Models\MarketplaceTemplateBackup;
use App\Models\Category;
use App\Models\Industry;
use App\Models\Service;
use App\Models\User;
use App\Models\Vendor;
use App\Support\MarketplaceDefaults;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketplaceBuilderTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        $user = User::create(['name' => 'CMS Admin', 'email' => 'cms@example.com', 'password' => 'password123', 'account_type' => 'staff']);
        $user->assignRole('Super Admin');
        Sanctum::actingAs($user);
        return $user;
    }

    private function draftPayload(array $document, ?int $lockVersion = null): array
    {
        return ['document' => $document, 'lock_version' => $lockVersion ?? MarketplacePage::where('slug', 'home')->value('lock_version')];
    }

    public function test_public_endpoint_returns_seeded_published_marketplace(): void
    {
        $this->getJson('/api/marketplace/page')->assertOk()->assertJsonPath('data.version', 1)->assertJsonPath('data.document.schema_version', 1);
    }

    public function test_draft_does_not_change_public_page_until_publish(): void
    {
        $this->superAdmin();
        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['sections'][0]['settings']['title'] = 'Draft-only headline';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertOk();
        $this->getJson('/api/marketplace/page')->assertOk()->assertJsonMissing(['title' => 'Draft-only headline']);
        $this->postJson('/api/marketplace-builder/publish')->assertOk();
        $this->getJson('/api/marketplace/page')->assertOk()->assertJsonFragment(['title' => 'Draft-only headline'])->assertJsonPath('data.version', 2);
    }

    public function test_admin_featured_ad_selection_is_published_with_its_software(): void
    {
        $this->superAdmin();
        $category = Category::create(['name' => 'Software', 'slug' => 'featured-software']);
        $subcategory = Category::create(['parent_id' => $category->id, 'name' => 'ERP', 'slug' => 'featured-erp']);
        $industry = Industry::create(['name' => 'Technology', 'slug' => 'featured-technology']);
        $vendor = Vendor::create(['registration_type' => 'company', 'phone' => '+1 555 0100', 'email' => 'featured@example.com', 'company_name' => 'Featured Vendor']);
        $serviceId = Service::create(['vendor_id' => $vendor->id, 'category_id' => $category->id, 'subcategory_id' => $subcategory->id, 'industry_id' => $industry->id, 'name' => 'Featured ERP', 'service_type' => 'software'])->id;

        $this->getJson('/api/marketplace-builder/catalog')->assertOk()->assertJsonPath('data.services.0.id', $serviceId);

        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['sections'][0]['settings']['featured_ads'] = [['service_id' => $serviceId, 'duration_seconds' => 9]];

        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertOk();
        $this->postJson('/api/marketplace-builder/publish', ['name' => 'Featured banner ads'])->assertOk();
        $this->getJson('/api/marketplace/page')
            ->assertOk()
            ->assertJsonPath('data.document.sections.0.settings.featured_ads.0.service_id', $serviceId)
            ->assertJsonPath('data.document.sections.0.settings.featured_ads.0.duration_seconds', 9)
            ->assertJsonPath('data.catalog.services.0.id', $serviceId);
    }

    public function test_centre_and_footer_advertisements_are_published_with_their_solutions(): void
    {
        $this->superAdmin();
        $category = Category::create(['name' => 'Ads', 'slug' => 'advertisement-solutions']);
        $subcategory = Category::create(['parent_id' => $category->id, 'name' => 'Promoted', 'slug' => 'promoted-solutions']);
        $industry = Industry::create(['name' => 'Advertising', 'slug' => 'advertising']);
        $vendor = Vendor::create(['registration_type' => 'company', 'phone' => '+1 555 0199', 'email' => 'ads@example.com', 'company_name' => 'Ads Vendor']);
        $centre = Service::create(['vendor_id' => $vendor->id, 'category_id' => $category->id, 'subcategory_id' => $subcategory->id, 'industry_id' => $industry->id, 'name' => 'Centre Solution', 'service_type' => 'software']);
        $footer = Service::create(['vendor_id' => $vendor->id, 'category_id' => $category->id, 'subcategory_id' => $subcategory->id, 'industry_id' => $industry->id, 'name' => 'Footer Solution', 'service_type' => 'services']);

        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['advertisements'] = [
            'center' => [['service_id' => $centre->id, 'duration_seconds' => 8]],
            'footer' => [['service_id' => $footer->id, 'duration_seconds' => 12]],
        ];
        $document['advertisements_visibility'] = ['banner' => false, 'catalog' => true, 'footer' => false];

        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertOk();
        $this->postJson('/api/marketplace-builder/publish', ['name' => 'Advertisement placements'])->assertOk();
        $this->getJson('/api/marketplace/page')
            ->assertOk()
            ->assertJsonPath('data.document.advertisements.center.0.service_id', $centre->id)
            ->assertJsonPath('data.document.advertisements.footer.0.service_id', $footer->id)
            ->assertJsonPath('data.document.advertisements_visibility.banner', false)
            ->assertJsonPath('data.document.advertisements_visibility.catalog', true)
            ->assertJsonPath('data.document.advertisements_visibility.footer', false)
            ->assertJsonFragment(['name' => 'Centre Solution'])
            ->assertJsonFragment(['name' => 'Footer Solution']);
    }

    public function test_builder_rejects_malformed_advertisement_placements(): void
    {
        $this->superAdmin();
        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['advertisements'] = ['center' => ['invalid'], 'footer' => []];

        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('document.advertisements.center.0');
    }

    public function test_builder_rejects_non_boolean_advertisement_visibility(): void
    {
        $this->superAdmin();
        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['advertisements_visibility'] = ['banner' => 'yes', 'catalog' => true, 'footer' => false];

        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('document.advertisements_visibility.banner');
    }

    public function test_super_admin_has_full_advertisement_management_permissions(): void
    {
        $admin = $this->superAdmin();

        $this->assertTrue($admin->can('marketplace_builder.view'));
        $this->assertTrue($admin->can('marketplace_builder.update'));
        $this->assertTrue($admin->can('marketplace_builder.publish'));
        $this->getJson('/api/marketplace-builder')->assertOk();
    }

    public function test_builder_rejects_unsafe_links(): void
    {
        $this->superAdmin();
        $document = MarketplaceDefaults::document();
        $document['header']['cta']['target'] = 'javascript:alert(1)';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertUnprocessable()->assertJsonValidationErrors('document.links');
    }

    public function test_buyer_cannot_access_builder(): void
    {
        $buyer = User::create(['name' => 'Buyer', 'email' => 'buyer-cms@example.com', 'password' => 'password123', 'account_type' => 'buyer']);
        $buyer->assignRole('Buyer');
        Sanctum::actingAs($buyer);
        $this->getJson('/api/marketplace-builder')->assertForbidden();
    }

    public function test_restore_copies_version_into_draft_without_publishing_it(): void
    {
        $this->superAdmin();
        $page = MarketplacePage::where('slug', 'home')->with('publishedVersion')->firstOrFail();
        $document = $page->draft_document; $document['footer']['copyright'] = 'Changed draft';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertOk();
        $this->postJson("/api/marketplace-builder/versions/{$page->publishedVersion->id}/restore")->assertOk();
        $this->assertNotSame('Changed draft', MarketplacePage::whereKey($page->id)->first()->draft_document['footer']['copyright']);
        $this->assertSame(1, MarketplacePage::whereKey($page->id)->first()->publishedVersion->version_number);
    }

    public function test_original_template_reset_restores_protected_snapshot_without_publishing(): void
    {
        $this->superAdmin();
        $page = MarketplacePage::where('slug', 'home')->with('publishedVersion')->firstOrFail();
        $original = $page->default_template_document;
        $changed = $page->draft_document;
        $changed['sections'][0]['settings']['title'] = 'Temporary custom headline';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($changed))->assertOk();
        $page->refresh();

        $this->postJson('/api/marketplace-builder/templates/default/reset', ['lock_version' => $page->lock_version])
            ->assertOk()
            ->assertJsonPath('data.draft_document.sections.0.settings.title', $original['sections'][0]['settings']['title']);

        $page->refresh();
        $this->assertSame($original, $page->draft_document);
        $this->assertSame(1, $page->publishedVersion->version_number);
    }

    public function test_template_reset_rejects_a_stale_builder_session(): void
    {
        $this->superAdmin();
        $page = MarketplacePage::where('slug', 'home')->firstOrFail();
        $staleLock = $page->lock_version;
        $document = $page->draft_document;
        $document['footer']['description'] = 'Another administrator changed this draft.';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document, $staleLock))->assertOk();

        $this->postJson('/api/marketplace-builder/templates/default/reset', ['lock_version' => $staleLock])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lock_version');
    }

    public function test_referenced_media_cannot_be_archived(): void
    {
        Storage::fake('public');
        $this->superAdmin();
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
        $upload = $this->post('/api/marketplace-builder/media', ['file' => UploadedFile::fake()->createWithContent('hero.png', $png), 'alt_text' => 'Marketplace hero background'], ['Accept' => 'application/json']);
        $upload->assertCreated();
        $assetId = $upload->json('data.id');
        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['sections'][0]['settings']['background_media_id'] = $assetId;
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertOk();
        $this->deleteJson("/api/marketplace-builder/media/$assetId")->assertUnprocessable()->assertJsonValidationErrors('media');
    }

    public function test_publish_rejects_inaccessible_theme_contrast(): void
    {
        $this->superAdmin();
        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['theme']['text'] = '#FFFFFF';
        $document['theme']['surface'] = '#FFFFFF';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertOk();
        $this->postJson('/api/marketplace-builder/publish')->assertUnprocessable()->assertJsonValidationErrors('document.theme');
    }

    public function test_stale_builder_session_cannot_overwrite_a_newer_draft(): void
    {
        $this->superAdmin();
        $page = MarketplacePage::where('slug', 'home')->firstOrFail();
        $staleVersion = $page->lock_version;
        $document = $page->draft_document;
        $document['sections'][0]['settings']['title'] = 'First editor';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document, $staleVersion))->assertOk();
        $document['sections'][0]['settings']['title'] = 'Stale editor';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document, $staleVersion))->assertUnprocessable()->assertJsonValidationErrors('lock_version');
    }

    public function test_catalog_validation_applies_to_nested_blocks(): void
    {
        $this->superAdmin();
        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['sections'][] = ['id' => 'nested-row', 'type' => 'row', 'visible' => true, 'settings' => ['columns' => 2, 'children' => [['id' => 'nested-products', 'type' => 'product_grid', 'visible' => true, 'settings' => ['catalog_ids' => [999999], 'columns' => 2]]]]];
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertOk();
        $this->postJson('/api/marketplace-builder/publish')->assertUnprocessable()->assertJsonValidationErrors('document.catalog');
    }

    public function test_scheduled_version_activates_only_after_its_publish_time(): void
    {
        $this->superAdmin();
        $document = MarketplacePage::where('slug', 'home')->firstOrFail()->draft_document;
        $document['sections'][0]['settings']['title'] = 'Scheduled headline';
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($document))->assertOk();
        $this->postJson('/api/marketplace-builder/schedule', ['scheduled_for' => now()->addHour()->toIso8601String(), 'name' => 'Campaign launch'])->assertOk();
        $this->getJson('/api/marketplace/page')->assertJsonPath('data.version', 1)->assertJsonMissing(['title' => 'Scheduled headline']);
        $this->travel(2)->hours();
        $this->getJson('/api/marketplace/page')->assertJsonPath('data.version', 2)->assertJsonFragment(['title' => 'Scheduled headline']);
    }

    public function test_theme_library_lists_the_protected_neon_theme(): void
    {
        $this->superAdmin();

        $this->getJson('/api/marketplace-builder/templates')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'neon-nexus-marketplace')
            ->assertJsonPath('data.0.is_active', true)
            ->assertJsonPath('data.0.is_draft', true);
    }

    public function test_applying_a_theme_backs_up_draft_preserves_live_content_and_does_not_publish(): void
    {
        $this->superAdmin();
        $page = MarketplacePage::where('slug', 'home')->firstOrFail();
        $liveVersionId = $page->published_version_id;
        $current = $page->draft_document;
        $current['sections'][0]['settings']['featured_ads'] = [['service_id' => 999, 'duration_seconds' => 9]];
        $this->putJson('/api/marketplace-builder/draft', $this->draftPayload($current))->assertOk();
        $page->refresh();

        $themeDocument = MarketplaceDefaults::document();
        $themeDocument['theme']['preset'] = 'modern-test-theme';
        $themeDocument['sections'][0]['settings']['title'] = 'Theme structure headline';
        $themeDocument['sections'][0]['settings']['featured_ads'] = [];
        $theme = MarketplaceTemplate::create([
            'name' => 'Modern Test Theme',
            'slug' => 'modern-test-theme',
            'status' => 'active',
            'document' => $themeDocument,
            'design_tokens' => $themeDocument['theme'],
            'variants' => ['hero' => 'modern-test'],
        ]);

        $this->postJson("/api/marketplace-builder/templates/{$theme->id}/apply", ['lock_version' => $page->lock_version])
            ->assertOk()
            ->assertJsonPath('data.draft_template_id', $theme->id)
            ->assertJsonPath('data.draft_document.sections.0.settings.title', 'Theme structure headline')
            ->assertJsonPath('data.draft_document.sections.0.settings.featured_ads.0.service_id', 999)
            ->assertJsonPath('data.draft_document.sections.0.settings.featured_ads.0.duration_seconds', 9);

        $page->refresh();
        $this->assertSame($liveVersionId, $page->published_version_id);
        $this->assertNotSame($theme->id, $page->active_template_id);
        $this->assertDatabaseCount('marketplace_template_backups', 1);
        $this->assertSame(999, MarketplaceTemplateBackup::firstOrFail()->document['sections'][0]['settings']['featured_ads'][0]['service_id']);
    }

    public function test_publishing_promotes_the_draft_theme_to_active(): void
    {
        $this->superAdmin();
        $page = MarketplacePage::where('slug', 'home')->firstOrFail();
        $theme = MarketplaceTemplate::where('slug', 'neon-nexus-marketplace')->firstOrFail()->replicate();
        $theme->fill(['name' => 'Publish Test Theme', 'slug' => 'publish-test-theme'])->save();

        $this->postJson("/api/marketplace-builder/templates/{$theme->id}/apply", ['lock_version' => $page->lock_version])->assertOk();
        $this->postJson('/api/marketplace-builder/publish')->assertOk();

        $page->refresh();
        $this->assertSame($theme->id, $page->active_template_id);
        $this->assertSame($theme->id, $page->publishedVersion->marketplace_template_id);
    }
}
