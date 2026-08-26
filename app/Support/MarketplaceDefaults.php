<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class MarketplaceDefaults
{
    public static function document(): array
    {
        $ids = fn (string $table) => DB::table($table)->orderBy('id')->pluck('id')->map(fn ($id) => (int) $id)->all();
        return [
            'schema_version' => 1,
            'theme' => ['preset' => 'neon-nexus', 'primary' => '#0B6FF4', 'secondary' => '#0797C6', 'canvas' => '#F6F8FC', 'surface' => '#FFFFFF', 'text' => '#0F172A', 'muted' => '#64748B', 'font' => 'Inter', 'radius' => 'rounded', 'container' => 'wide', 'section_spacing' => 'comfortable'],
            'seo' => ['title' => 'Quotation Global Marketplace', 'description' => 'Discover and compare verified technology solutions.', 'share_media_id' => null],
            'header' => ['brand_name' => 'QUOTATION GLOBAL', 'tagline' => 'Global Technology Marketplace', 'logo_media_id' => null, 'login_label' => 'Log In', 'signup_label' => 'Sign Up', 'nav' => [['id' => 'nav-categories', 'label' => 'Categories', 'kind' => 'catalog', 'target' => 'categories'], ['id' => 'nav-brands', 'label' => 'Brands', 'kind' => 'catalog', 'target' => 'brands'], ['id' => 'nav-industries', 'label' => 'Industries', 'kind' => 'catalog', 'target' => 'industries'], ['id' => 'nav-compare', 'label' => 'Compare', 'kind' => 'internal', 'target' => '/compare']], 'cta' => ['label' => 'Get Free Advice', 'target' => '#marketplace-products']],
            'sections' => [
                ['id' => 'hero', 'type' => 'hero', 'visible' => true, 'settings' => ['eyebrow' => 'Technology marketplace', 'title' => 'Find the right technology solution for your business.', 'description' => 'Discover verified software, hardware and professional services. Compare plans, request a demo or get a tailored quote.', 'search_placeholder' => 'Search software, services or vendors', 'background_media_id' => null, 'trust_points' => ['Verified vendors', 'Demo support', 'Transparent pricing'], 'featured_ads' => array_map(fn ($id) => ['service_id' => $id, 'duration_seconds' => 6], array_slice($ids('services'), 0, 5))]],
                ['id' => 'brand-marquee', 'type' => 'brand_grid', 'visible' => true, 'settings' => ['title' => '', 'display' => 'marquee', 'catalog_ids' => $ids('brands')]],
                ['id' => 'categories', 'type' => 'category_grid', 'visible' => true, 'settings' => ['eyebrow' => 'Browse by category', 'title' => 'Explore solutions for every business need', 'catalog_ids' => $ids('categories')]],
                ['id' => 'products', 'type' => 'product_grid', 'visible' => true, 'settings' => ['eyebrow' => 'Marketplace', 'title' => 'Featured solutions', 'description' => 'Compare plans, view product details and connect with the Solution Provider.', 'catalog_ids' => $ids('services'), 'show_filters' => true, 'columns' => 3]],
                ['id' => 'benefits', 'type' => 'feature_cards', 'visible' => true, 'settings' => ['items' => [['id' => 'verified', 'title' => 'Verified vendors', 'description' => 'Discover services from registered vendors and trusted partners.'], ['id' => 'demo', 'title' => 'Book a demo', 'description' => 'Choose a convenient time and send your request directly to the Solution Provider.'], ['id' => 'pricing', 'title' => 'Clear pricing', 'description' => 'See available billing plans, pricing and discounts before you decide.']]]],
            ],
            'footer' => ['description' => 'Your trusted marketplace to discover, compare and connect with the best technology solutions and partners.', 'columns' => [['id' => 'solutions', 'title' => 'Solutions', 'links' => [['id' => 'all-solutions', 'label' => 'View All', 'target' => '/marketplace']]], ['id' => 'support', 'title' => 'Support', 'links' => [['id' => 'help', 'label' => 'Help Center', 'target' => '#']]]], 'socials' => [], 'newsletter' => ['visible' => true, 'title' => 'Stay Updated', 'description' => 'Get the latest updates, product news and offers delivered to your inbox.', 'button_label' => 'Subscribe'], 'copyright' => '© '.date('Y').' Quotation Global. All rights reserved.'],
        ];
    }
}
