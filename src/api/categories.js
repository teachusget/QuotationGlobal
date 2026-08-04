import { authHeaders } from '../auth/session'

const API_URL = '/api/categories'
let marketplaceCategoriesPromise
const MARKETPLACE_CATEGORIES_CACHE = 'marketplace-categories-v2'
const MARKETPLACE_CATEGORIES_TTL = 5 * 60 * 1000
function clearMarketplaceCategoryCache() { marketplaceCategoriesPromise = undefined; sessionStorage.removeItem(MARKETPLACE_CATEGORIES_CACHE) }

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...authHeaders(), ...options?.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Unable to complete the request.')
    error.status = response.status
    throw error
  }
  return data
}

export async function getCategories(type = 'category') {
  const response = await request(`${API_URL}?type=${type}`)
  const data = Array.isArray(response) ? response : response?.data
  if (!Array.isArray(data)) throw new Error('The server returned an invalid category list.')
  return { data }
}
export function getMarketplaceCategories() {
  if (marketplaceCategoriesPromise) return marketplaceCategoriesPromise
  try {
    const cached = JSON.parse(sessionStorage.getItem(MARKETPLACE_CATEGORIES_CACHE) || 'null')
    if (cached?.savedAt > Date.now() - MARKETPLACE_CATEGORIES_TTL && Array.isArray(cached.data)) return Promise.resolve(cached.data)
  } catch {
    sessionStorage.removeItem(MARKETPLACE_CATEGORIES_CACHE)
  }
  marketplaceCategoriesPromise = request('/api/marketplace/categories')
    .then((response) => {
      if (!Array.isArray(response?.data)) throw new Error('The server returned an invalid marketplace category list.')
      sessionStorage.setItem(MARKETPLACE_CATEGORIES_CACHE, JSON.stringify({ savedAt: Date.now(), data: response.data }))
      return response.data
    })
    .catch((error) => {
      marketplaceCategoriesPromise = undefined
      throw error
    })
  return marketplaceCategoriesPromise
}
async function serialize(formData) {
  const payload = Object.fromEntries(formData.entries())
  const logo = formData.get('logo')
  if (logo instanceof File && logo.size) payload.logo_data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(logo) })
  delete payload.logo
  return JSON.stringify(payload)
}

export async function createCategory(formData) { const response = await request(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await serialize(formData) }); clearMarketplaceCategoryCache(); return response }
export async function updateCategory(id, formData) { const response = await request(`${API_URL}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: await serialize(formData) }); clearMarketplaceCategoryCache(); return response }
export async function deleteCategory(id) { const response = await request(`${API_URL}/${id}`, { method: 'DELETE' }); clearMarketplaceCategoryCache(); return response }
