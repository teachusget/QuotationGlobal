import { authHeaders } from '../auth/session'
import { compressImage } from '../utils/compressImage'

const API_URL = '/api/brands'
let marketplaceBrandsPromise
const MARKETPLACE_BRANDS_CACHE = 'marketplace-brands-v1'
const MARKETPLACE_BRANDS_TTL = 5 * 60 * 1000
function clearMarketplaceBrandCache() { marketplaceBrandsPromise = undefined; sessionStorage.removeItem(MARKETPLACE_BRANDS_CACHE) }

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...authHeaders(), ...options?.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(data.message || 'Unable to complete the request.'); error.status = response.status; throw error }
  return data
}

async function serialize(formData) {
  const payload = Object.fromEntries(formData.entries())
  const logo = formData.get('logo')
  if (logo instanceof File && logo.size) payload.logo_data = await compressImage(logo, { maxWidth: 800, maxHeight: 800, quality: 0.88 })
  delete payload.logo
  return JSON.stringify(payload)
}

export async function getBrands() { const response = await request(API_URL); return { data: Array.isArray(response?.data) ? response.data : [] } }
export function getMarketplaceBrands() {
  if (marketplaceBrandsPromise) return marketplaceBrandsPromise
  try {
    const cached = JSON.parse(sessionStorage.getItem(MARKETPLACE_BRANDS_CACHE) || 'null')
    if (cached?.savedAt > Date.now() - MARKETPLACE_BRANDS_TTL && Array.isArray(cached.data)) return Promise.resolve(cached.data)
  } catch {
    sessionStorage.removeItem(MARKETPLACE_BRANDS_CACHE)
  }
  marketplaceBrandsPromise = request('/api/marketplace/brands')
    .then((response) => {
      const data = Array.isArray(response?.data) ? response.data : []
      sessionStorage.setItem(MARKETPLACE_BRANDS_CACHE, JSON.stringify({ savedAt: Date.now(), data }))
      return data
    })
    .catch((error) => {
      marketplaceBrandsPromise = undefined
      throw error
    })
  return marketplaceBrandsPromise
}
export async function createBrand(data) { const response = await request(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await serialize(data) }); clearMarketplaceBrandCache(); return response }
export async function updateBrand(id, data) { const response = await request(`${API_URL}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: await serialize(data) }); clearMarketplaceBrandCache(); return response }
export async function deleteBrand(id) { const response = await request(`${API_URL}/${id}`, { method: 'DELETE' }); clearMarketplaceBrandCache(); return response }
export async function approveBrand(id) { const response = await request(`${API_URL}/${id}/approve`, { method: 'POST' }); clearMarketplaceBrandCache(); return response }
