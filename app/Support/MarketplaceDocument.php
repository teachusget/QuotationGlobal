<?php

namespace App\Support;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Industry;
use App\Models\MarketplaceMediaAsset;
use App\Models\Service;
use Illuminate\Validation\ValidationException;

class MarketplaceDocument
{
    public const BLOCK_TYPES = ['hero', 'heading', 'paragraph', 'rich_text', 'image', 'banner', 'button_group', 'trust_badges', 'feature_cards', 'category_grid', 'brand_grid', 'industry_grid', 'product_grid', 'row', 'spacer', 'divider'];

    public static function validate(array $document, bool $publishing = false): array
    {
        $errors = [];
        if (($document['schema_version'] ?? null) !== 1) $errors['document.schema_version'][] = 'Unsupported marketplace document version.';
        if (! is_array($document['theme'] ?? null)) $errors['document.theme'][] = 'Theme settings are required.';
        if (! is_array($document['header'] ?? null)) $errors['document.header'][] = 'Header settings are required.';
        if (! is_array($document['footer'] ?? null)) $errors['document.footer'][] = 'Footer settings are required.';
        if (! is_array($document['sections'] ?? null) || count($document['sections']) > 80) $errors['document.sections'][] = 'Sections must be an array containing at most 80 items.';
        foreach (['primary', 'secondary', 'canvas', 'surface', 'text'] as $color) {
            if (! preg_match('/^#[0-9a-fA-F]{6}$/', (string) data_get($document, "theme.$color"))) $errors["document.theme.$color"][] = 'Use a six-digit hex color.';
        }
        if (! in_array(data_get($document, 'theme.font'), ['Inter', 'System'], true)) $errors['document.theme.font'][] = 'Unsupported font.';
        if (! in_array(data_get($document, 'theme.radius'), ['square', 'soft', 'rounded'], true)) $errors['document.theme.radius'][] = 'Unsupported radius.';
        if (! in_array(data_get($document, 'theme.container'), ['compact', 'wide', 'full'], true)) $errors['document.theme.container'][] = 'Unsupported container width.';
        if (! in_array(data_get($document, 'theme.section_spacing', 'comfortable'), ['compact', 'comfortable', 'spacious'], true)) $errors['document.theme.section_spacing'][] = 'Unsupported section spacing.';
        if (! preg_match('/^[a-z0-9][a-z0-9-]{1,79}$/', (string) data_get($document, 'theme.preset', 'neon-nexus'))) $errors['document.theme.preset'][] = 'Theme preset must use a safe lowercase slug.';
        if (isset($document['theme']['muted']) && ! preg_match('/^#[0-9a-fA-F]{6}$/', (string) $document['theme']['muted'])) $errors['document.theme.muted'][] = 'Use a six-digit hex color.';
        if (mb_strlen((string) data_get($document, 'seo.title', '')) > 70) $errors['document.seo.title'][] = 'SEO title cannot exceed 70 characters.';
        if (mb_strlen((string) data_get($document, 'seo.description', '')) > 170) $errors['document.seo.description'][] = 'SEO description cannot exceed 170 characters.';
        foreach (['banner', 'catalog', 'footer'] as $placement) {
            $visible = data_get($document, "advertisements_visibility.$placement", true);
            if (! is_bool($visible)) $errors["document.advertisements_visibility.$placement"][] = 'Advertisement visibility must be true or false.';
        }

        $ids = [];
        self::walkBlocks($document['sections'] ?? [], $errors, $ids);
        self::walkLinks($document, $errors);
        self::rejectMarkup($document, $errors);
        self::validateMedia($document, $errors, $publishing);
        foreach (['center', 'footer'] as $placement) {
            $ads = data_get($document, "advertisements.$placement", []);
            if (! is_array($ads) || count($ads) > 20) $errors["document.advertisements.$placement"][] = 'Select no more than 20 advertisements per placement.';
            else {
                $serviceIds = [];
                foreach ($ads as $index => $ad) {
                    if (! is_array($ad)) {
                        $errors["document.advertisements.$placement.$index"][] = 'Advertisement settings must be an object.';
                        continue;
                    }
                    $serviceId = (int) ($ad['service_id'] ?? 0);
                    if ($serviceId < 1) $errors["document.advertisements.$placement.$index.service_id"][] = 'Select a valid solution.';
                    if ((int) ($ad['duration_seconds'] ?? 0) < 2 || (int) ($ad['duration_seconds'] ?? 0) > 120) $errors["document.advertisements.$placement.$index.duration_seconds"][] = 'Duration must be between 2 and 120 seconds.';
                    $serviceIds[] = $serviceId;
                }
                if (count($serviceIds) !== count(array_unique($serviceIds))) $errors["document.advertisements.$placement"][] = 'A solution can only appear once per placement.';
            }
        }
        if ($publishing) { self::validateCatalog($document, $errors); self::validateContrast($document, $errors); }
        if ($errors) throw ValidationException::withMessages($errors);
        return $document;
    }

    public static function mediaIds(array $document): array
    {
        $ids = [];
        $walk = function ($value, $key = null) use (&$walk, &$ids) {
            if (str_ends_with((string) $key, '_media_id') && is_numeric($value)) $ids[] = (int) $value;
            if (is_array($value)) foreach ($value as $childKey => $child) $walk($child, $childKey);
        };
        $walk($document);
        return array_values(array_unique($ids));
    }

    private static function walkBlocks(array $blocks, array &$errors, array &$ids, int $depth = 0): void
    {
        if ($depth > 4) { $errors['document.sections'][] = 'Block nesting cannot exceed four levels.'; return; }
        foreach ($blocks as $index => $block) {
            $path = "document.sections.$index";
            if (! is_array($block)) { $errors[$path][] = 'Every block must be an object.'; continue; }
            $id = (string) ($block['id'] ?? '');
            if (! preg_match('/^[A-Za-z0-9_-]{2,80}$/', $id)) $errors["$path.id"][] = 'Each block needs a valid ID.';
            if (isset($ids[$id])) $errors["$path.id"][] = 'Block IDs must be unique.';
            $ids[$id] = true;
            if (! in_array($block['type'] ?? '', self::BLOCK_TYPES, true)) $errors["$path.type"][] = 'Unsupported block type.';
            if (! is_array($block['settings'] ?? null)) $errors["$path.settings"][] = 'Block settings are required.';
            self::validateBlockSettings($block, $path, $errors);
            $children = data_get($block, 'settings.children', []);
            if ($children && is_array($children)) self::walkBlocks($children, $errors, $ids, $depth + 1);
        }
    }

    private static function validateBlockSettings(array $block, string $path, array &$errors): void
    {
        $type = $block['type'] ?? '';
        $settings = $block['settings'] ?? [];
        $catalog = ['category_grid', 'brand_grid', 'industry_grid', 'product_grid'];
        if (in_array($type, $catalog, true)) {
            $values = $settings['catalog_ids'] ?? null;
            if (! is_array($values) || count($values) > 200) $errors["$path.settings.catalog_ids"][] = 'Select no more than 200 catalog records.';
            elseif (count($values) !== count(array_unique(array_map('intval', $values)))) $errors["$path.settings.catalog_ids"][] = 'Catalog records cannot be duplicated.';
        }
        if ($type === 'hero') {
            $ads = $settings['featured_ads'] ?? [];
            if (! is_array($ads) || count($ads) > 20) $errors["$path.settings.featured_ads"][] = 'Select no more than 20 featured ads.';
            else {
                $serviceIds = [];
                foreach ($ads as $index => $ad) {
                    $serviceId = (int) ($ad['service_id'] ?? 0); $duration = (int) ($ad['duration_seconds'] ?? 0);
                    if ($serviceId < 1) $errors["$path.settings.featured_ads.$index.service_id"][] = 'Select a valid software.';
                    if ($duration < 2 || $duration > 120) $errors["$path.settings.featured_ads.$index.duration_seconds"][] = 'Duration must be between 2 and 120 seconds.';
                    $serviceIds[] = $serviceId;
                }
                if (count($serviceIds) !== count(array_unique($serviceIds))) $errors["$path.settings.featured_ads"][] = 'A software can only be featured once.';
            }
        }
        if ($type === 'row' && (! isset($settings['columns']) || ! in_array((int) $settings['columns'], [1, 2, 3, 4], true))) $errors["$path.settings.columns"][] = 'Rows support one to four columns.';
        if (in_array($type, ['feature_cards', 'trust_badges', 'button_group'], true) && count($settings['items'] ?? []) > 24) $errors["$path.settings.items"][] = 'A block can contain at most 24 items.';
        if ($type === 'rich_text') {
            $content = $settings['content'] ?? null;
            if (! is_array($content)) $errors["$path.settings.content"][] = 'Rich text must use structured content.';
            else foreach ($content as $index => $node) {
                if (! is_array($node) || ! in_array($node['type'] ?? '', ['paragraph', 'heading', 'bullet'], true)) $errors["$path.settings.content.$index"][] = 'Unsupported rich-text node.';
                if (mb_strlen((string) ($node['text'] ?? '')) > 2000) $errors["$path.settings.content.$index"][] = 'Rich-text nodes cannot exceed 2,000 characters.';
            }
        }
        foreach (['padding_top', 'padding_bottom'] as $key) if (isset($settings[$key]) && (! is_numeric($settings[$key]) || $settings[$key] < 0 || $settings[$key] > 160)) $errors["$path.settings.$key"][] = 'Section spacing must be between 0 and 160 pixels.';
        if (isset($settings['alignment']) && ! in_array($settings['alignment'], ['left', 'center', 'right'], true)) $errors["$path.settings.alignment"][] = 'Unsupported alignment.';
    }

    private static function walkLinks(array $document, array &$errors): void
    {
        $walk = function ($value, $key = null) use (&$walk, &$errors) {
            if (in_array($key, ['target', 'href'], true) && is_string($value) && $value !== '' && ! in_array($value, ['categories', 'brands', 'industries'], true) && ! preg_match('~^(https://|/|\#|mailto:|tel:)~i', $value)) $errors['document.links'][] = "Unsafe link target: $value";
            if (is_array($value)) foreach ($value as $childKey => $child) $walk($child, $childKey);
        };
        $walk($document);
    }

    private static function rejectMarkup(array $document, array &$errors): void
    {
        $walk = function ($value) use (&$walk, &$errors) {
            if (is_string($value) && preg_match('/<\s*(script|iframe|object|embed|style)|on\w+\s*=|javascript:/i', $value)) $errors['document.content'][] = 'Scripts, embedded HTML, and event handlers are not allowed.';
            if (is_string($value) && mb_strlen($value) > 10000) $errors['document.content'][] = 'A content value exceeds the 10,000 character limit.';
            if (is_array($value)) foreach ($value as $child) $walk($child);
        };
        $walk($document);
    }

    private static function validateMedia(array $document, array &$errors, bool $publishing): void
    {
        $ids = self::mediaIds($document);
        if (! $ids) return;
        $assets = MarketplaceMediaAsset::whereIn('id', $ids)->whereNull('archived_at')->get()->keyBy('id');
        foreach ($ids as $id) {
            if (! $assets->has($id)) $errors['document.media'][] = "Media asset $id is unavailable.";
            elseif ($publishing && trim($assets[$id]->alt_text) === '') $errors['document.media'][] = "Media asset $id requires alt text before publishing.";
        }
    }

    private static function validateCatalog(array $document, array &$errors): void
    {
        $map = ['category_grid' => [Category::class, null], 'brand_grid' => [Brand::class, 'approved'], 'industry_grid' => [Industry::class, 'active'], 'product_grid' => [Service::class, null]];
        $walk = function (array $blocks) use (&$walk, &$errors, $map) {
            foreach ($blocks as $block) {
                if (($block['type'] ?? '') === 'hero') {
                    $ids = array_map('intval', array_column(data_get($block, 'settings.featured_ads', []), 'service_id'));
                    $found = Service::whereIn('id', $ids)->pluck('id')->map(fn ($id) => (int) $id)->all();
                    foreach (array_diff($ids, $found) as $missing) $errors['document.catalog'][] = "Featured software record $missing is unavailable.";
                }
                if (isset($map[$block['type'] ?? ''])) {
                    [$model, $status] = $map[$block['type']];
                    $ids = array_values(array_unique(array_map('intval', data_get($block, 'settings.catalog_ids', []))));
                    $query = $model::query()->whereIn('id', $ids);
                    if ($status) $query->where('status', $status);
                    $found = $query->pluck('id')->map(fn ($id) => (int) $id)->all();
                    foreach (array_diff($ids, $found) as $missing) $errors['document.catalog'][] = ucfirst(str_replace('_grid', '', $block['type']))." record $missing is unavailable.";
                }
                $children = data_get($block, 'settings.children', []);
                if (is_array($children)) $walk($children);
            }
        };
        $walk($document['sections'] ?? []);
        foreach (['center', 'footer'] as $placement) {
            $ids = array_map('intval', array_column(data_get($document, "advertisements.$placement", []), 'service_id'));
            $found = Service::whereIn('id', $ids)->pluck('id')->map(fn ($id) => (int) $id)->all();
            foreach (array_diff($ids, $found) as $missing) $errors['document.catalog'][] = ucfirst($placement)." advertisement solution $missing is unavailable.";
        }
    }

    private static function validateContrast(array $document, array &$errors): void
    {
        $theme = $document['theme'];
        foreach ([['text', 'canvas'], ['text', 'surface']] as [$foreground, $background]) {
            if (self::contrast($theme[$foreground], $theme[$background]) < 4.5) $errors['document.theme'][] = ucfirst($foreground)." and $background colors must meet WCAG AA contrast.";
        }
    }

    private static function contrast(string $first, string $second): float
    {
        $luminance = function (string $hex): float {
            $channels = [substr($hex, 1, 2), substr($hex, 3, 2), substr($hex, 5, 2)];
            $channels = array_map(function ($value) { $channel = hexdec($value) / 255; return $channel <= .03928 ? $channel / 12.92 : (($channel + .055) / 1.055) ** 2.4; }, $channels);
            return .2126 * $channels[0] + .7152 * $channels[1] + .0722 * $channels[2];
        };
        [$light, $dark] = [$luminance($first), $luminance($second)];
        return (max($light, $dark) + .05) / (min($light, $dark) + .05);
    }
}
