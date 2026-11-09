import { authHeaders } from '../auth/session'

async function request(path, options = {}) {
  const response = await fetch(`/api/${path}`, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Request failed.')
  return data
}
const body = (method, payload) => ({ method, body: JSON.stringify(payload) })
export const getBlogPosts = (params = {}, endpoint = 'blog') => request(`${endpoint}${Object.keys(params).length ? `?${new URLSearchParams(Object.entries(params).filter(([, value]) => value))}` : ''}`)
export const getBlogCategories = (manage = false) => request(manage ? 'blog/categories/manage' : 'blog/categories')
export const createBlogCategory = (name) => request('blog/categories', body('POST', { name }))
export const updateBlogCategory = (id, payload) => request(`blog/categories/${id}`, body('PUT', payload))
export const deleteBlogCategory = (id) => request(`blog/categories/${id}`, { method: 'DELETE' })
export const getBlogPost = (slug, preview = false) => request(`blog/${slug}${preview ? '/preview' : ''}`)
export const getBlogComments = (slug, page = 1) => request(`blog/${slug}/comments?page=${page}`)
export const likeBlogPost = (slug, reaction) => request(`blog/${slug}/like`, body('POST', { reaction }))
export const addBlogComment = (slug, comment) => request(`blog/${slug}/comments`, body('POST', { body: comment }))
export const createBlogPost = (payload) => request('blog', body('POST', payload))
export const getBlogImages = () => request('blog/images')
export const deleteBlogImage = (filename) => request(`blog/images/${encodeURIComponent(filename)}`, { method: 'DELETE' })
export const uploadBlogImage = async (file) => {
  const form = new FormData(); form.append('file', file)
  const response = await fetch('/api/blog/images', { method: 'POST', headers: { Accept: 'application/json', ...authHeaders() }, body: form })
  const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Image upload failed.'); return data
}
export const importBlogImage = (url) => request('blog/images/import', body('POST', { url }))
export const updateBlogPost = (slug, payload) => request(`blog/${slug}`, body('PUT', payload))
export const deleteBlogPost = (slug) => request(`blog/${slug}`, { method: 'DELETE' })
