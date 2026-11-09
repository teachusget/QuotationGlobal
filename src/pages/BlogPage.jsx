import { ArrowRight, CalendarDays, Check, ChevronLeft, Clock3, Copy, Edit3, ExternalLink, FileText, Grid2X2, Heart, LoaderCircle, Mail, MessageCircle, MessageSquare, Plus, Search, Send, Share2, Sparkles, ThumbsDown, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { addBlogComment, createBlogCategory, createBlogPost, deleteBlogCategory, deleteBlogImage, deleteBlogPost, getBlogCategories, getBlogComments, getBlogImages, getBlogPost, getBlogPosts, importBlogImage, likeBlogPost, updateBlogCategory, updateBlogPost, uploadBlogImage } from '../api/blog'
import { useAuth } from '../auth/useAuth'
import { compressImage } from '../utils/compressImage'

const emptyForm = { title: '', excerpt: '', content: '', cover_image_url: '', youtube_video_id: '', external_link: '', category: 'Insights', tags: '', status: 'draft' }
const categories = ['All', 'Insights', 'Buying guides', 'Technology', 'Business', 'Partner stories']
const date = (value) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Draft'
const readingTime = (content = '') => `${Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 180))} min read`
function dataUrlToFile(dataUrl) { const [meta, encoded] = dataUrl.split(','); const bytes = atob(encoded); const buffer = new Uint8Array(bytes.length); for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index); return new File([buffer], 'blog-cover.webp', { type: meta.match(/data:(.*?);/)?.[1] || 'image/webp' }) }
const normalizeImageUrl = (value = '') => value && !/^https?:\/\//i.test(value) ? `https://${value}` : value
const blogCoverPath = (value = '') => {
  if (typeof value !== 'string' || !value) return ''
  try {
    const url = new URL(value, window.location.origin)
    if (url.pathname.startsWith('/storage/blog/covers/') && (url.origin === window.location.origin || ['localhost', '127.0.0.1'].includes(url.hostname))) return `${url.pathname}${url.search}`
  } catch { /* Keep the original value for validation. */ }
  return value
}
const blogCoverPreviewUrl = (value = '') => {
  const path = blogCoverPath(value)
  return path.startsWith('/storage/blog/covers/') ? new URL(path, window.location.origin).href : path
}
const youtubeId = (value = '') => {
  const input = value.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input
  try {
    const url = new URL(input)
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0]
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : ''
    }
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      const id = url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] || ''
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : ''
    }
  } catch { /* The API will provide the validation message for an invalid value. */ }
  return ''
}
const youtubeEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`
function YoutubeVideo({ id, title = 'YouTube video' }) { return <iframe src={youtubeEmbedUrl(id)} title={title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> }
function BlogImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div role="img" aria-label={`${alt || 'Blog image'} unavailable`} className={`grid place-items-center bg-slate-100 text-xs text-slate-400 ${className}`}>Image unavailable</div>
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />
}
const contentUrlPattern = /(https?:\/\/[^\s]+)/g
function ArticleContent({ content = '' }) {
  return <div className="whitespace-pre-line text-[15px] leading-8 text-slate-700">{content.split('\n').map((line, lineIndex) => <span key={`line-${lineIndex}`}>{line.split(contentUrlPattern).map((part, partIndex) => /^https?:\/\//i.test(part) ? <a key={`link-${lineIndex}-${partIndex}`} href={part.replace(/[.,!?;:)]+$/, '')} target="_blank" rel="noreferrer" className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:text-blue-700">{part}</a> : part)}{lineIndex < content.split('\n').length - 1 && <br />}</span>)}</div>
}

function Cover({ post, large = false }) {
  if (post.youtube_video_id) return <div className="relative h-full"><BlogImage src={`https://img.youtube.com/vi/${post.youtube_video_id}/hqdefault.jpg`} alt={post.title || 'Blog video'} className={`h-full w-full object-cover ${large ? 'min-h-72' : 'min-h-48'}`} /><span className="absolute bottom-3 left-3 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white">Video</span></div>
  const coverUrl = post.cover_image_url || post.gallery_images?.[0]
  return coverUrl ? <BlogImage src={blogCoverPreviewUrl(coverUrl)} alt={post.title || 'Blog cover'} className={`h-full w-full ${large ? 'min-h-72 bg-slate-100 object-contain' : 'min-h-48 object-cover'}`} /> : <div className={`flex h-full min-h-48 flex-col justify-end bg-gradient-to-br from-[#072b63] via-primary to-cyan-500 p-6 ${large ? 'min-h-72' : ''}`}><Sparkles className="h-14 w-14 text-white/25" />{post.external_link && <span className="mt-2 flex items-center gap-1 text-[10px] font-bold text-white"><ExternalLink className="h-3.5 w-3.5" />Linked resource</span>}</div>
}

/* eslint-disable no-unused-vars */
function EditorWithUrl({ post, categories: blogCategories, onClose, onSaved }) {
  const [form, setForm] = useState(post ? { ...emptyForm, ...post, tags: (post.tags || []).join(', ') } : { ...emptyForm, category: blogCategories[0]?.name || 'Insights' })
  const [saving, setSaving] = useState(false); const [imageFile, setImageFile] = useState(null); const [compressing, setCompressing] = useState(false); const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const selectImage = async (event) => { const file = event.target.files?.[0]; if (!file) return; setCompressing(true); try { const dataUrl = await compressImage(file, { maxWidth: 1600, maxHeight: 900, quality: 0.88 }); setImageFile(dataUrlToFile(dataUrl)); setForm((current) => ({ ...current, cover_image_url: dataUrl })) } catch (error) { Swal.fire({ icon: 'error', title: 'Could not process image', text: error.message }) } finally { setCompressing(false) } }
  const submit = async (event) => { event.preventDefault(); setSaving(true); try { let coverUrl = form.cover_image_url?.startsWith('data:') ? '' : normalizeImageUrl(form.cover_image_url); if (imageFile) coverUrl = (await uploadBlogImage(imageFile)).url; else if (coverUrl) coverUrl = (await importBlogImage(coverUrl)).url; const payload = { ...form, cover_image_url: coverUrl, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) }; const response = post ? await updateBlogPost(post.slug, payload) : await createBlogPost(payload); await Swal.fire({ icon: 'success', title: 'Saved', text: response.message, timer: 1300, showConfirmButton: false }); onSaved(response.data) } catch (error) { Swal.fire({ icon: 'error', title: 'Could not save post', text: error.message }) } finally { setSaving(false) } }
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><div className="mx-auto my-6 max-w-3xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Editorial workspace</p><h2 className="mt-1 text-lg font-bold">{post ? 'Edit blog post' : 'Create blog post'}</h2></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><form onSubmit={submit} className="grid gap-4 p-5"><label className="text-xs font-semibold">Title<input required name="title" value={form.title} onChange={change} className="mt-1.5 w-full rounded-lg border px-3" placeholder="A useful, specific headline" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Category<select name="category" value={form.category} onChange={change} className="mt-1.5 w-full rounded-lg border px-3">{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-xs font-semibold">Status<select name="status" value={form.status} onChange={change} className="mt-1.5 w-full rounded-lg border px-3"><option value="draft">Draft</option><option value="published">Published</option></select></label></div><label className="text-xs font-semibold">Cover image URL<span className="ml-1 font-normal text-slate-400">(optional)</span><input type="url" name="cover_image_url" value={form.cover_image_url} onChange={change} className="mt-1.5 w-full rounded-lg border px-3" placeholder="https://…" /></label><label className="text-xs font-semibold">Short summary<textarea required name="excerpt" value={form.excerpt} onChange={change} rows="2" className="mt-1.5 w-full rounded-lg border px-3" placeholder="What will readers learn?" /></label><label className="text-xs font-semibold">Article content<textarea required name="content" value={form.content} onChange={change} rows="12" className="mt-1.5 w-full rounded-lg border px-3 leading-6" placeholder="Write the article here…" /></label><label className="text-xs font-semibold">Tags<span className="ml-1 font-normal text-slate-400">comma separated</span><input name="tags" value={form.tags} onChange={change} className="mt-1.5 w-full rounded-lg border px-3" placeholder="cloud, procurement, ERP" /></label><div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{post ? 'Save changes' : 'Create post'}</button></div></form></div></div>
}

function Editor({ post, categories: blogCategories, canDeleteImages, onClose, onSaved, onMediaChanged }) {
  const [form, setForm] = useState(post ? { ...emptyForm, ...post, cover_image_url: post.cover_image_url || '', youtube_video_id: post.youtube_video_id || '', external_link: post.external_link || '', tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''), gallery_images: Array.isArray(post.gallery_images) ? post.gallery_images : [] } : { ...emptyForm, category: blogCategories[0]?.name || 'Insights', gallery_images: [], youtube_video_id: '' })
  const [library, setLibrary] = useState([])
  const [libraryUploading, setLibraryUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (post) getBlogImages().then((response) => {
      const images = response.data || []
      const usedImages = new Set([post.cover_image_url, ...(post.gallery_images || [])].filter(Boolean).map(blogCoverPath))
      const postImages = images.filter((image) => usedImages.has(blogCoverPath(image)))
      setLibrary(postImages)
    }).catch(() => {})
  }, [post])

  const change = (event) => {
    if (event.target.name === 'cover_image_url') setImageError(false)
    const value = event.target.name === 'cover_image_url' && /\./.test(event.target.value) ? normalizeImageUrl(event.target.value) : event.target.value
    setForm((current) => ({ ...current, [event.target.name]: value }))
  }

  const addFromLibrary = (url) => {
    if (form.gallery_images.includes(url)) return
    if (form.gallery_images.length >= 12) return
    setForm((current) => ({ ...current, gallery_images: [...current.gallery_images, url] }))
  }

  const uploadToLibrary = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    const remainingSlots = 12 - form.gallery_images.length
    if (files.length > remainingSlots) {
      Swal.fire({ icon: 'warning', title: 'Gallery limit', text: `You can add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'} to this post.` })
      return
    }
    setLibraryUploading(true)
    try {
      const uploadedImages = []
      for (const file of files) {
        const dataUrl = await compressImage(file, { maxWidth: 1600, maxHeight: 900, quality: 0.88 })
        const uploaded = await uploadBlogImage(dataUrlToFile(dataUrl))
        uploadedImages.push(uploaded.url)
      }
      setLibrary((current) => [...current, ...uploadedImages])
      setForm((current) => ({
        ...current,
        cover_image_url: current.cover_image_url || uploadedImages[0],
        gallery_images: [...current.gallery_images, ...uploadedImages],
      }))
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Could not add image', text: error.message })
    } finally { setLibraryUploading(false) }
  }

  const removeFromLibrary = async (url) => {
    const result = await Swal.fire({ title: 'Remove this saved image?', text: 'This will also remove it from the cover or gallery of every blog post using it. The file will be deleted.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Remove image' })
    if (!result.isConfirmed) return
    try {
      await deleteBlogImage(url.split('/').pop())
      setLibrary((current) => current.filter((item) => item !== url))
      setForm((current) => ({ ...current, cover_image_url: blogCoverPath(current.cover_image_url) === url ? '' : current.cover_image_url, gallery_images: current.gallery_images.filter((image) => blogCoverPath(image) !== url) }))
      setImageError(false)
      onMediaChanged()
      Swal.fire({ icon: 'success', title: 'Image removed', timer: 1100, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Could not remove image', text: error.message })
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      let coverUrl = form.cover_image_url?.startsWith('data:') ? '' : blogCoverPath(form.cover_image_url)
      const payload = {
        ...form,
        cover_image_url: coverUrl,
        youtube_video_id: youtubeId(form.youtube_video_id),
        external_link: form.external_link?.trim() || '',
        gallery_images: form.gallery_images.map(blogCoverPath),
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      }
      const response = post ? await updateBlogPost(post.slug, payload) : await createBlogPost(payload)
      await Swal.fire({ icon: 'success', title: 'Saved', text: response.message, timer: 1300, showConfirmButton: false })
      onSaved(response.data)
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Could not save post', text: error.message })
    } finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-slate-950/60 p-4 backdrop-blur-sm">
    <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Editorial workspace</p><h2 className="mt-1 text-lg font-bold">{post ? 'Edit blog post' : 'Create blog post'}</h2></div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close editor"><X className="h-5 w-5" /></button>
      </div>
      <form onSubmit={submit} className="grid gap-4 p-5">
        <label className="text-xs font-semibold">Title<input required name="title" value={form.title} onChange={change} className="mt-1.5 w-full rounded-lg border px-3" placeholder="A useful, specific headline" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Category<select name="category" value={form.category} onChange={change} className="mt-1.5 w-full rounded-lg border px-3">{blogCategories.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold">Status<select name="status" value={form.status} onChange={change} className="mt-1.5 w-full rounded-lg border px-3"><option value="draft">Draft</option><option value="published">Published</option></select></label>
        </div>
        {form.cover_image_url && !imageError && <div><p className="text-xs font-semibold">Current cover image</p><img src={blogCoverPreviewUrl(form.cover_image_url)} alt="Cover preview" onError={() => setImageError(true)} className="mt-1.5 h-36 w-full rounded-lg bg-slate-100 object-contain" /><button type="button" onClick={() => setForm((current) => ({ ...current, cover_image_url: '' }))} className="mt-1.5 text-[11px] font-semibold text-red-600 hover:underline">Remove cover image</button></div>}
        {imageError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">Cover image could not be loaded. Select an image from the gallery or upload it again.</p>}
        <label className="text-xs font-semibold">YouTube video <span className="font-normal text-slate-400">(optional; paste video URL or 11-character ID)</span><input name="youtube_video_id" value={form.youtube_video_id || ''} onChange={change} className="mt-1.5 w-full rounded-lg border px-3" placeholder="https://youtu.be/... or video ID" /></label>
        {form.youtube_video_id && youtubeId(form.youtube_video_id) && <div className="aspect-video overflow-hidden rounded-lg bg-slate-100"><YoutubeVideo id={youtubeId(form.youtube_video_id)} title="YouTube video preview" /></div>}
        <label className="text-xs font-semibold">Product / website link <span className="font-normal text-slate-400">(optional; any HTTPS website link)</span><input type="url" name="external_link" value={form.external_link || ''} onChange={change} className="mt-1.5 w-full rounded-lg border px-3" placeholder="https://example.com/product" /></label>
        <section className="rounded-xl border p-3">
          {(form.gallery_images.length > 0) && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {form.gallery_images.map((url) => <div key={url} className="relative rounded-lg bg-slate-100"><BlogImage src={blogCoverPreviewUrl(url)} alt="Gallery image" className="h-24 w-full rounded-lg object-contain" /><button type="button" onClick={() => setForm((current) => ({ ...current, gallery_images: current.gallery_images.filter((item) => item !== url) }))} className="absolute right-1 top-1 rounded bg-white px-2 py-1 text-xs font-bold text-red-600" aria-label="Remove gallery image">×</button></div>)}
          </div>}
          <label className="block text-xs font-semibold">Upload images <span className="font-normal text-slate-400">(first image becomes the cover; all are added to this post)</span><input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={libraryUploading} onChange={uploadToLibrary} className="mt-2 w-full rounded-lg border px-3 py-2 text-xs disabled:opacity-50" /></label>
          {libraryUploading && <p className="mt-2 text-xs text-primary">Uploading images to gallery…</p>}
          <p className="mt-3 text-xs font-semibold">Images used in this post</p>
          <div className="mt-2 grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
            {library.map((url) => <div key={url} className="relative"><BlogImage src={blogCoverPreviewUrl(url)} alt="Saved image" className="h-20 w-full rounded-lg bg-slate-100 object-contain" /><div className="mt-1 flex gap-1"><button type="button" onClick={() => { setImageError(false); setForm((current) => ({ ...current, cover_image_url: url })) }} className="flex-1 rounded border px-1 py-1 text-[10px]">Cover</button><button type="button" disabled={form.gallery_images.includes(url) || form.gallery_images.length >= 12} onClick={() => addFromLibrary(url)} className="flex-1 rounded border px-1 py-1 text-[10px] disabled:opacity-40">Add</button></div>{canDeleteImages && <button type="button" onClick={() => removeFromLibrary(url)} className="mt-1 w-full rounded border border-red-200 px-1 py-1 text-[10px] text-red-600">Remove from gallery</button>}</div>)}
          </div>
          {library.length === 0 && <p className="mt-2 text-[11px] text-slate-500">No images are attached to this post yet.</p>}
        </section>
        <label className="text-xs font-semibold">Short summary<textarea required name="excerpt" value={form.excerpt} onChange={change} rows="2" className="mt-1.5 w-full rounded-lg border px-3" placeholder="What will readers learn?" /></label>
        <label className="text-xs font-semibold">Article content<textarea required name="content" value={form.content} onChange={change} rows="12" className="mt-1.5 w-full rounded-lg border px-3 leading-6" placeholder="Write the article here…" /></label>
        <label className="text-xs font-semibold">Tags<span className="ml-1 font-normal text-slate-400">comma separated</span><input name="tags" value={form.tags} onChange={change} className="mt-1.5 w-full rounded-lg border px-3" placeholder="cloud, procurement, ERP" /></label>
        <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancel</button><button disabled={saving || compressing || libraryUploading || imageError} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{post ? 'Save changes' : 'Create post'}</button></div>
      </form>
    </div>
  </div>
}

function PostCard({ post }) { return <Link to={`/blog/${post.slug}`} className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-floating"><div className="h-52 overflow-hidden bg-slate-100"><Cover post={post} /></div><div className="p-5 sm:p-6"><div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[.12em] text-primary"><span className="truncate">{post.category}</span><span className="flex shrink-0 items-center gap-1 text-slate-400 normal-case tracking-normal"><Clock3 className="h-3.5 w-3.5" />{readingTime(post.content || post.excerpt)}</span></div><h3 className="mt-3 line-clamp-2 text-lg font-bold leading-6 text-slate-950 group-hover:text-primary">{post.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{post.excerpt}</p><div className="mt-5 flex items-center justify-between border-t pt-4 text-[11px] text-slate-400"><span>{date(post.published_at)}</span><span className="flex items-center gap-1 font-bold text-primary">Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span></div></div></Link> }

function ArticleEngagement({ article }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [reaction, setReaction] = useState(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const loadComments = useCallback(async () => {
    try { const response = await getBlogComments(article.slug); setComments(response.data || []); setLikes(response.likes_count || 0); setDislikes(response.dislikes_count || 0) } catch { /* Engagement is optional and should not block the article. */ }
  }, [article.slug])
  useEffect(() => { loadComments() }, [loadComments])

  const promptAuth = (action) => Swal.fire({ icon: 'info', title: 'Login required', text: `Please sign in or sign up to ${action}.`, showCancelButton: true, confirmButtonText: 'Sign in', cancelButtonText: 'Sign up', reverseButtons: true }).then((result) => {
    if (result.isConfirmed) navigate('/login')
    else if (result.dismiss === Swal.DismissReason.cancel) navigate('/register')
  })

  const toggleReaction = async (nextReaction) => {
    if (!user) return promptAuth('like or dislike this article')
    try { const response = await likeBlogPost(article.slug, nextReaction); setReaction(response.reaction || null); setLikes(response.likes_count); setDislikes(response.dislikes_count) } catch (error) { Swal.fire({ icon: 'error', title: 'Could not update reaction', text: error.message }) }
  }
  const submitComment = async (event) => {
    event.preventDefault()
    if (!user) return promptAuth('comment')
    if (!comment.trim()) return
    setSaving(true)
    try { const response = await addBlogComment(article.slug, comment.trim()); setComments((items) => [response.data, ...items]); setComment('') } catch (error) { Swal.fire({ icon: 'error', title: 'Could not add comment', text: error.message }) } finally { setSaving(false) }
  }

  return <section className="border-b px-6 py-5 sm:px-10">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => toggleReaction('like')} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${reaction === 'like' ? 'border-rose-200 bg-rose-50 text-rose-600' : 'text-slate-600 hover:border-rose-200 hover:text-rose-600'}`}><Heart className={`h-4 w-4 ${reaction === 'like' ? 'fill-current' : ''}`} />{likes} Like{likes === 1 ? '' : 's'}</button>
      <button type="button" onClick={() => toggleReaction('dislike')} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${reaction === 'dislike' ? 'border-slate-300 bg-slate-100 text-slate-800' : 'text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}><ThumbsDown className={`h-4 w-4 ${reaction === 'dislike' ? 'fill-current' : ''}`} />{dislikes} Dislike{dislikes === 1 ? '' : 's'}</button>
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><MessageSquare className="h-4 w-4" />{comments.length} Comment{comments.length === 1 ? '' : 's'}</span>
    </div>
    <form onSubmit={submitComment} className="mt-5 flex flex-col gap-2 sm:flex-row"><input value={comment} onChange={(event) => setComment(event.target.value)} onFocus={() => !user && promptAuth('comment')} placeholder={user ? 'Write a comment...' : 'Sign in to write a comment'} className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-xs" disabled={saving} /><button disabled={saving || !comment.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Posting...' : 'Comment'}</button></form>
    {comments.length > 0 && <div className="mt-5 space-y-3">{comments.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-bold text-slate-800">{item.user?.name || 'User'} <span className="ml-2 font-normal text-slate-400">{date(item.created_at)}</span></p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{item.body}</p></div>)}</div>}
  </section>
}

function ArticleSharing({ article }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = `${article.title} — ${article.excerpt}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      Swal.fire({ icon: 'error', title: 'Could not copy link', text: 'Please copy the URL from your browser.' })
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) return
    try { await navigator.share({ title: article.title, text: shareText, url: shareUrl }); setOpen(false) } catch { /* User cancelled the share sheet. */ }
  }

  const handleShare = () => navigator.share ? nativeShare() : setOpen((value) => !value)

  return <div className="relative ml-auto">
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleShare} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-blue-700" aria-label="Share article">
        <Share2 className="h-4 w-4" />Share
      </button>
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-primary" aria-expanded={open}>
        <Send className="h-4 w-4" />Send
      </button>
    </div>
    {open && <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-xl border bg-white p-1.5 shadow-xl">
      <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Share this article</p>
      {navigator.share && <button type="button" onClick={nativeShare} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><Share2 className="h-4 w-4 text-primary" />More sharing options</button>}
      <button type="button" onClick={copyLink} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-primary" />}{copied ? 'Link copied' : 'Copy link'}</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><MessageCircle className="h-4 w-4 text-emerald-600" />Send on WhatsApp</a>
      <a href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Mail className="h-4 w-4 text-slate-500" />Send by email</a>
    </div>}
  </div>
}

/* eslint-enable no-unused-vars */
function CategoryManager({ items, onClose, onChanged }) {
  const [name, setName] = useState(''); const [editing, setEditing] = useState(null); const [value, setValue] = useState('');
  const save = async () => { if (!name.trim()) return; try { await createBlogCategory(name.trim()); setName(''); onChanged() } catch (error) { Swal.fire({ icon: 'error', title: 'Could not add category', text: error.message }) } }
  const rename = async (item) => { if (!value.trim()) return; try { await updateBlogCategory(item.id, { name: value.trim(), is_active: item.is_active }); setEditing(null); onChanged() } catch (error) { Swal.fire({ icon: 'error', title: 'Could not rename category', text: error.message }) } }
  const remove = async (item) => { try { await deleteBlogCategory(item.id); onChanged() } catch (error) { Swal.fire({ icon: 'error', title: 'Category cannot be deleted', text: error.message }) } }
  return <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Blog settings</p><h2 className="mt-1 text-lg font-bold">Manage categories</h2></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="p-5"><div className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && save()} className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-xs" placeholder="New category name" /><button onClick={save} className="rounded-lg bg-primary px-3 text-xs font-bold text-white">Add</button></div><div className="mt-5 divide-y rounded-xl border">{items.map((item) => <div key={item.id} className="flex items-center gap-3 px-3 py-3">{editing === item.id ? <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} className="min-w-0 flex-1 rounded border px-2 py-1 text-xs" /> : <span className={`min-w-0 flex-1 text-xs font-semibold ${!item.is_active ? 'text-slate-400 line-through' : ''}`}>{item.name}</span>}{editing === item.id ? <button onClick={() => rename(item)} className="text-xs font-bold text-emerald-600">Save</button> : <button onClick={() => { setEditing(item.id); setValue(item.name) }} className="text-xs font-bold text-primary">Rename</button>}<button onClick={async () => { try { await updateBlogCategory(item.id, { name: item.name, is_active: !item.is_active }); onChanged() } catch (error) { Swal.fire({ icon: 'error', title: 'Could not update category', text: error.message }) } }} className="text-xs font-bold text-slate-500">{item.is_active ? 'Disable' : 'Enable'}</button><button onClick={() => remove(item)} className="text-xs font-bold text-red-600">Delete</button></div>)}</div><p className="mt-3 text-[11px] leading-5 text-slate-500">Used categories cannot be deleted; disable them instead. Disabled categories will not appear in new posts.</p></div></section></div>
}

export default function BlogPage() {
  const { slug } = useParams(); const navigate = useNavigate(); const { can } = useAuth(); const [posts, setPosts] = useState([]); const [article, setArticle] = useState(null); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(''); const [category, setCategory] = useState('All'); const [page, setPage] = useState(1); const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 }); const [editor, setEditor] = useState(null); const [categoryManager, setCategoryManager] = useState(false); const [blogCategories, setBlogCategories] = useState([])
  const canWrite = can('blog.create'); const canManage = can('blog.manage')
  const loadCategories = useCallback(async () => { try { setBlogCategories((await getBlogCategories(canManage)).data || []) } catch { /* The article list can still render if category loading fails. */ } }, [canManage])
  const load = useCallback(async () => { setLoading(true); try { if (slug) setArticle((await getBlogPost(slug, canManage || canWrite)).data); else { const endpoint = canManage ? 'blog/manage' : canWrite ? 'blog/editor' : 'blog'; const response = await getBlogPosts({ page, ...(query.trim() ? { search: query.trim() } : {}), ...(category !== 'All' ? { category } : {}) }, endpoint); setPosts(response.data?.data || []); setPagination({ current_page: response.data?.current_page || page, last_page: response.data?.last_page || 1, total: response.data?.total || 0 }) } } catch { if (slug) navigate('/blog', { replace: true }) } finally { setLoading(false) } }, [category, canManage, canWrite, navigate, page, query, slug])
  useEffect(() => { load(); loadCategories() }, [load, loadCategories])
  const changeCategory = (value) => { setCategory(value); setPage(1) }
  const changeQuery = (value) => { setQuery(value); setPage(1) }
  const remove = async (post) => { const result = await Swal.fire({ title: 'Delete this post?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Delete' }); if (!result.isConfirmed) return; try { await deleteBlogPost(post.slug); setPosts((items) => items.filter((item) => item.id !== post.id)); Swal.fire({ icon: 'success', title: 'Deleted', timer: 1000, showConfirmButton: false }) } catch (error) { Swal.fire({ icon: 'error', title: 'Could not delete', text: error.message }) } }
  if (slug) return <main className="mx-auto max-w-4xl">{loading ? <div className="h-96 animate-pulse rounded-3xl bg-slate-100" /> : article && <><Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-primary"><ChevronLeft className="h-4 w-4" />All articles</Link><article className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="h-72 bg-slate-100 sm:h-96">{article.youtube_video_id ? <YoutubeVideo id={article.youtube_video_id} title={article.title} /> : <Cover post={article} large />}</div><ArticleEngagement article={article} /><div className="p-6 sm:p-10"><div className="flex flex-wrap items-center gap-3 text-xs font-bold text-primary"><span className="rounded-full bg-blue-50 px-3 py-1">{article.category}</span><span className="flex items-center gap-1 text-slate-400"><CalendarDays className="h-4 w-4" />{date(article.published_at)}</span><span className="flex items-center gap-1 text-slate-400"><Clock3 className="h-4 w-4" />{readingTime(article.content)}</span><ArticleSharing article={article} /></div><h1 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">{article.title}</h1><p className="mt-5 text-base leading-7 text-slate-500">{article.excerpt}</p>{article.external_link && <a href={article.external_link} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"><ArrowRight className="h-4 w-4" />View product / website</a>}<div className="my-8 border-t" /><ArticleContent content={article.content} />{article.gallery_images?.length > 0 && <div className="mt-8 grid gap-3 sm:grid-cols-2">{article.gallery_images.map((url, index) => <a key={`${url}-${index}`} href={blogCoverPreviewUrl(url)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-slate-100"><BlogImage src={blogCoverPreviewUrl(url)} alt={`${article.title} gallery image ${index + 1}`} className="h-64 w-full object-contain" /></a>)}</div>}{article.tags?.length > 0 && <div className="mt-10 flex flex-wrap gap-2 border-t pt-5">{article.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">#{tag}</span>)}</div>}</div></article></>}</main>
  return <main className="mx-auto max-w-6xl pb-10"><section className="relative overflow-hidden rounded-3xl bg-[#071f49] px-5 py-10 text-white shadow-xl sm:px-12 sm:py-16"><div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" /><div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" /><div className="relative max-w-3xl"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-cyan-300"><Sparkles className="h-4 w-4" />Quotation Global Journal</p><h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.05] sm:text-6xl">Ideas for smarter business decisions.</h1><p className="mt-5 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Practical insights on technology, procurement and building a more connected digital workplace.</p><div className="mt-7 flex flex-wrap gap-2 text-[11px] font-semibold text-blue-100"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{pagination.total} articles</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{blogCategories.length} topics</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Expert insights</span></div></div></section><div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto pb-1">{['All', ...blogCategories.map((item) => item.name)].map((item) => <button key={item} onClick={() => changeCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${category === item ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-primary'}`}>{item}</button>)}</div><div className="flex flex-wrap items-center gap-2">{canManage && <button onClick={() => setCategoryManager(true)} className="rounded-lg border bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-primary">Manage categories</button>}{canWrite && <button onClick={() => setEditor({})} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Write a post</button>}{<label className="relative block w-full sm:w-auto"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Search articles" className="h-10 w-full rounded-lg border bg-slate-50 pl-9 pr-3 text-xs focus:bg-white sm:w-60" /></label>}</div></div></div>{canManage && <div className="mt-5 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs"><span className="flex items-center gap-2 font-bold text-primary"><Grid2X2 className="h-4 w-4" />Editorial dashboard <span className="font-normal text-slate-500">{pagination.total} posts</span></span><span className="text-slate-500">Drafts and published posts are visible to you</span></div>}{loading ? <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-96 animate-pulse rounded-2xl bg-slate-100" />)}</div> : posts.length ? <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <div key={post.id} className="relative">{canManage && <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-lg bg-white/90 p-1 shadow"><button onClick={() => setEditor(post)} className="rounded p-2 text-slate-500 hover:bg-blue-50 hover:text-primary" aria-label="Edit post"><Edit3 className="h-4 w-4" /></button><button onClick={() => remove(post)} className="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete post"><Trash2 className="h-4 w-4" /></button></div>}<PostCard post={post} /></div>)}</div> : <div className="mt-8 rounded-2xl border border-dashed bg-white py-20 text-center"><FileText className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-bold">No articles found</h2><p className="mt-1 text-xs text-slate-500">Try another search or category.</p></div>}{pagination.last_page > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Blog pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-4 py-2 text-xs font-bold disabled:opacity-40">Previous</button><span className="text-xs font-semibold text-slate-500">Page {pagination.current_page} of {pagination.last_page}</span><button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-4 py-2 text-xs font-bold disabled:opacity-40">Next</button></nav>}{editor && <Editor post={editor.title ? editor : null} categories={blogCategories} canDeleteImages={canManage} onMediaChanged={load} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); loadCategories() }} />}{categoryManager && <CategoryManager items={blogCategories} onClose={() => setCategoryManager(false)} onChanged={loadCategories} />}</main>
}
