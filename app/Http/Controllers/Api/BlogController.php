<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\BlogCategory;
use App\Models\BlogComment;
use App\Models\BlogLike;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    public function images()
    {
        $files = Storage::disk('public')->files('blog/covers');
        $images = array_values(array_map(fn ($path) => '/storage/'.ltrim($path, '/'), array_filter($files, fn ($path) => preg_match('/\.(jpe?g|png|webp)$/i', $path))));
        return response()->json(['data' => $images]);
    }

    public function uploadImage(Request $request)
    {
        $data = $request->validate(['file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192']]);
        $path = $data['file']->store('blog/covers', 'public');
        return response()->json(['message' => 'Image uploaded.', 'url' => '/storage/'.ltrim($path, '/')], 201);
    }

    public function deleteImage(Request $request, string $filename)
    {
        abort_unless(preg_match('/^[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$/i', $filename), 404);
        $path = 'blog/covers/'.$filename;
        abort_unless(Storage::disk('public')->exists($path), 404);
        $urlPath = '/storage/'.$path;
        $updatedPosts = DB::transaction(function () use ($request, $path, $urlPath) {
            $updated = 0;
            foreach (BlogPost::query()->lockForUpdate()->get() as $post) {
                $coverMatches = $post->cover_image_url && parse_url($post->cover_image_url, PHP_URL_PATH) === $urlPath;
                $gallery = $post->gallery_images ?? [];
                $remaining = array_values(array_filter($gallery, fn ($image) => parse_url($image, PHP_URL_PATH) !== $urlPath));
                if (!$coverMatches && count($gallery) === count($remaining)) continue;

                $before = $post->toArray();
                $post->update([
                    'cover_image_url' => $coverMatches ? null : $post->cover_image_url,
                    'gallery_images' => $remaining,
                ]);
                Audit::record($request, 'blog.post_updated', $post, $before, $post->fresh()->toArray());
                $updated++;
            }
            abort_unless(Storage::disk('public')->delete($path), 500, 'The image file could not be removed.');
            return $updated;
        });
        return response()->json(['message' => 'Image removed from gallery and blog posts.', 'updated_posts' => $updatedPosts]);
    }

    public function importImage(Request $request)
    {
        $url = $request->validate(['url' => ['required', 'url', 'max:2000']])['url'];
        $response = Http::timeout(20)->withHeaders(['User-Agent' => 'Quotation Global Blog Image Importer'])->get($url);
        abort_unless($response->successful(), 422, 'The image URL could not be downloaded.');
        $contentType = strtolower((string) $response->header('Content-Type'));
        abort_unless(in_array($contentType, ['image/jpeg', 'image/png', 'image/webp'], true), 422, 'The URL must point directly to a JPG, PNG or WebP image.');
        $body = $response->body(); abort_if(strlen($body) > 8 * 1024 * 1024, 422, 'The image is larger than 8 MB.');
        $extension = match ($contentType) { 'image/png' => 'png', 'image/webp' => 'webp', default => 'jpg' };
        $path = 'blog/covers/'.Str::random(40).'.'.$extension; Storage::disk('public')->put($path, $body);
        return response()->json(['message' => 'Image imported.', 'url' => '/storage/'.ltrim($path, '/')], 201);
    }

    public function categories(Request $request)
    {
        $query = BlogCategory::query();
        if (!$request->user() || !$request->user()->can('blog.manage')) $query->where('is_active', true);
        return response()->json(['data' => $query->orderBy('name')->get()]);
    }

    public function storeCategory(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:80', 'unique:blog_categories,name']]);
        $category = BlogCategory::create($data); Audit::record($request, 'blog.category_created', $category);
        return response()->json(['message' => 'Category created.', 'data' => $category], 201);
    }

    public function updateCategory(Request $request, BlogCategory $blogCategory)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:80', 'unique:blog_categories,name,'.$blogCategory->id], 'is_active' => ['required', 'boolean']]);
        $before = $blogCategory->toArray(); $blogCategory->update($data); Audit::record($request, 'blog.category_updated', $blogCategory, $before, $blogCategory->fresh()->toArray());
        return response()->json(['message' => 'Category updated.', 'data' => $blogCategory->fresh()]);
    }

    public function destroyCategory(Request $request, BlogCategory $blogCategory)
    {
        abort_if(BlogPost::where('category', $blogCategory->name)->exists(), 422, 'This category is used by a blog post. Deactivate it instead.');
        $blogCategory->delete(); Audit::record($request, 'blog.category_deleted', $blogCategory); return response()->json(['message' => 'Category deleted.']);
    }

    public function index(Request $request)
    {
        $isPublicList = ! $request->user();
        $query = BlogPost::query()
            ->when($isPublicList, fn ($q) => $q->select([
                'id', 'author_id', 'title', 'slug', 'excerpt', 'cover_image_url',
                'youtube_video_id', 'external_link', 'gallery_images', 'category',
                'status', 'published_at', 'created_at', 'updated_at',
            ]))
            ->with('author:id,name')->when($isPublicList, fn ($q) => $q->where('status', 'published')->whereNotNull('published_at'))
            ->when($request->routeIs('blog.editor'), fn ($q) => $q->where(fn ($x) => $x->where('status', 'published')->whereNotNull('published_at')->orWhere('author_id', $request->user()->id)))
            ->when($request->user() && !$request->routeIs('blog.editor') && !$request->user()->can('blog.manage'), fn ($q) => $q->where('status', 'published')->whereNotNull('published_at'))
            ->when($request->string('category')->trim()->value(), fn ($q, $v) => $q->where('category', $v))
            ->when($request->string('search')->trim()->value(), fn ($q, $v) => $q->where(fn ($x) => $x->where('title', 'like', "%{$v}%")->orWhere('excerpt', 'like', "%{$v}%")));
        return response()->json(['data' => $query->latest('published_at')->latest()->paginate(12)]);
    }

    public function show(BlogPost $blogPost)
    {
        abort_if($blogPost->status !== 'published' || !$blogPost->published_at, 404);
        return response()->json(['data' => $blogPost->load('author:id,name')]);
    }

    public function comments(BlogPost $blogPost)
    {
        abort_if($blogPost->status !== 'published' || !$blogPost->published_at, 404);
        return response()->json([
            'data' => BlogComment::where('blog_post_id', $blogPost->id)->with('user:id,name')->latest()->get(),
            'likes_count' => BlogLike::where('blog_post_id', $blogPost->id)->where('reaction', 'like')->count(),
            'dislikes_count' => BlogLike::where('blog_post_id', $blogPost->id)->where('reaction', 'dislike')->count(),
        ]);
    }

    public function like(Request $request, BlogPost $blogPost)
    {
        abort_if($blogPost->status !== 'published' || !$blogPost->published_at, 404);
        $reaction = $request->validate(['reaction' => ['required', 'in:like,dislike']])['reaction'];
        $existing = BlogLike::where('blog_post_id', $blogPost->id)->where('user_id', $request->user()->id)->first();
        $currentReaction = $existing?->reaction === $reaction ? null : $reaction;
        if ($existing?->reaction === $reaction) $existing->delete();
        elseif ($existing) $existing->update(['reaction' => $reaction]);
        else BlogLike::create(['blog_post_id' => $blogPost->id, 'user_id' => $request->user()->id, 'reaction' => $reaction]);
        return response()->json([
            'reaction' => $currentReaction,
            'likes_count' => BlogLike::where('blog_post_id', $blogPost->id)->where('reaction', 'like')->count(),
            'dislikes_count' => BlogLike::where('blog_post_id', $blogPost->id)->where('reaction', 'dislike')->count(),
        ]);
    }

    public function comment(Request $request, BlogPost $blogPost)
    {
        abort_if($blogPost->status !== 'published' || !$blogPost->published_at, 404);
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $comment = BlogComment::create(['blog_post_id' => $blogPost->id, 'user_id' => $request->user()->id, 'body' => trim($data['body'])]);
        Audit::record($request, 'blog.comment_created', $comment);
        return response()->json(['message' => 'Comment added.', 'data' => $comment->load('user:id,name')], 201);
    }

    public function preview(Request $request, BlogPost $blogPost)
    {
        abort_unless($blogPost->status === 'published' && $blogPost->published_at
            || $request->user()->can('blog.manage')
            || $blogPost->author_id === $request->user()->id, 404);
        return response()->json(['data' => $blogPost->load('author:id,name')]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request); $data['author_id'] = $request->user()->id; $data['slug'] = BlogPost::makeSlug($data['title']);
        if ($data['status'] === 'published') $data['published_at'] = now();
        $post = BlogPost::create($data); Audit::record($request, 'blog.post_created', $post);
        return response()->json(['message' => 'Blog post created.', 'data' => $post->load('author:id,name')], 201);
    }

    public function update(Request $request, BlogPost $blogPost)
    {
        $data = $this->validated($request); $data['slug'] = BlogPost::makeSlug($data['title'], $blogPost->id);
        if ($data['status'] === 'published' && !$blogPost->published_at) $data['published_at'] = now();
        if ($data['status'] === 'draft') $data['published_at'] = null;
        $before = $blogPost->toArray(); $blogPost->update($data); Audit::record($request, 'blog.post_updated', $blogPost, $before, $blogPost->fresh()->toArray());
        return response()->json(['message' => 'Blog post updated.', 'data' => $blogPost->fresh()->load('author:id,name')]);
    }

    public function destroy(Request $request, BlogPost $blogPost)
    {
        $blogPost->delete(); Audit::record($request, 'blog.post_deleted', $blogPost); return response()->json(['message' => 'Blog post deleted.']);
    }

    private function validated(Request $request): array
    {
        $imageRule = function ($attribute, $value, $fail) {
            if (str_starts_with($value, '/storage/blog/covers/')) {
                $path = substr($value, strlen('/storage/'));
                if (!preg_match('/^blog\/covers\/[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$/i', $path) || !Storage::disk('public')->exists($path)) {
                    $fail('The selected image could not be found in the blog gallery.');
                }
            } elseif (!filter_var($value, FILTER_VALIDATE_URL)) {
                $fail('The image must be a valid URL or a saved blog image.');
            }
        };

        return $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['required', 'string'],
            'cover_image_url' => ['nullable', 'string', 'max:1000', $imageRule],
            'youtube_video_id' => ['nullable', 'string', 'regex:/^[A-Za-z0-9_-]{11}$/'],
            'external_link' => ['nullable', 'string', 'max:2000', 'url', 'regex:/^https?:\/\//i'],
            'gallery_images' => ['nullable', 'array', 'max:12'],
            'gallery_images.*' => ['required', 'string', 'max:1000', $imageRule],
            'category' => ['required', 'string', 'max:80'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:40'],
            'status' => ['required', 'in:draft,published'],
        ]);
    }
}
