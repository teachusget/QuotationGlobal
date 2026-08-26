<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceMediaAsset;
use App\Models\MarketplacePage;
use App\Models\MarketplacePageVersion;
use App\Support\Audit;
use App\Support\MarketplaceDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class MarketplaceMediaController extends Controller
{
    public function show(MarketplaceMediaAsset $asset)
    {
        abort_if($asset->archived_at || ! Storage::disk($asset->disk)->exists($asset->path), 404);
        return Storage::disk($asset->disk)->response($asset->path, $asset->original_name, ['Content-Type' => $asset->mime_type, 'Cache-Control' => 'public, max-age=86400']);
    }

    public function index(Request $request)
    {
        $query = MarketplaceMediaAsset::whereNull('archived_at')->latest();
        if ($search = trim((string) $request->query('search'))) $query->where(fn ($builder) => $builder->where('original_name', 'like', "%$search%")->orWhere('alt_text', 'like', "%$search%"));
        $assets = $query->paginate(min(100, max(12, (int) $request->query('per_page', 60))));
        return response()->json(['data' => $assets->items(), 'meta' => ['current_page' => $assets->currentPage(), 'last_page' => $assets->lastPage(), 'total' => $assets->total()]]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['file' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:8192'], 'alt_text' => ['required', 'string', 'max:255']]);
        $file = $data['file'];
        $dimensions = getimagesize($file->getRealPath());
        if (! $dimensions) throw ValidationException::withMessages(['file' => ['The image dimensions could not be read.']]);
        $path = $file->store('marketplace/media', 'public');
        $asset = MarketplaceMediaAsset::create(['disk' => 'public', 'path' => $path, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'width' => $dimensions[0], 'height' => $dimensions[1], 'alt_text' => trim($data['alt_text']), 'uploaded_by' => $request->user()->id]);
        Audit::record($request, 'marketplace.media_uploaded', $asset, null, $asset->only(['id', 'original_name', 'mime_type', 'size', 'width', 'height', 'alt_text']));
        return response()->json(['message' => 'Media uploaded.', 'data' => $asset], 201);
    }

    public function update(Request $request, MarketplaceMediaAsset $asset)
    {
        $data = $request->validate(['alt_text' => ['required', 'string', 'max:255']]);
        $before = $asset->only(['alt_text']);
        $asset->update(['alt_text' => trim($data['alt_text'])]);
        Audit::record($request, 'marketplace.media_updated', $asset, $before, $asset->only(['alt_text']));
        return response()->json(['message' => 'Media details updated.', 'data' => $asset]);
    }

    public function archive(Request $request, MarketplaceMediaAsset $asset)
    {
        $needle = (string) $asset->id;
        $used = MarketplacePage::where('draft_document', 'like', "%$needle%")->cursor()->contains(fn ($page) => in_array($asset->id, MarketplaceDocument::mediaIds($page->draft_document), true))
            || MarketplacePageVersion::where('document', 'like', "%$needle%")->cursor()->contains(fn ($version) => in_array($asset->id, MarketplaceDocument::mediaIds($version->document), true));
        if ($used) throw ValidationException::withMessages(['media' => ['This asset is referenced by a draft or published version and cannot be archived.']]);
        $asset->update(['archived_at' => now()]);
        Audit::record($request, 'marketplace.media_archived', $asset, ['archived_at' => null], ['archived_at' => $asset->archived_at]);
        return response()->json(['message' => 'Media archived.']);
    }
}
