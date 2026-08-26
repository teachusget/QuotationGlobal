import { authHeaders } from '../auth/session'
import { compressImage } from '../utils/compressImage'

const API_URL = '/api/industries'
let marketplaceIndustriesPromise
const MARKETPLACE_INDUSTRIES_CACHE = 'marketplace-industries-v1'
const MARKETPLACE_INDUSTRIES_TTL = 5 * 60 * 1000
function clearMarketplaceIndustryCache() { marketplaceIndustriesPromise = undefined; sessionStorage.removeItem(MARKETPLACE_INDUSTRIES_CACHE) }

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

async function serialize(formData) {
  const payload = {
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    status: String(formData.get('status') || 'active').trim(),
  }
  const logo = formData.get('logo')

  if (logo instanceof File && logo.size) {
    payload.logo_data = await compressImage(logo, { maxWidth: 800, maxHeight: 800, quality: 0.88 })
  }

  return JSON.stringify(payload)
}

export async function getIndustries() {
  const response = await request(API_URL)
  if (!Array.isArray(response?.data)) throw new Error('The server returned an invalid industry list.')
  return response.data
}
export function getMarketplaceIndustries() {
  if (marketplaceIndustriesPromise) return marketplaceIndustriesPromise
  try {
    const cached = JSON.parse(sessionStorage.getItem(MARKETPLACE_INDUSTRIES_CACHE) || 'null')
    if (cached?.savedAt > Date.now() - MARKETPLACE_INDUSTRIES_TTL && Array.isArray(cached.data)) return Promise.resolve(cached.data)
  } catch { sessionStorage.removeItem(MARKETPLACE_INDUSTRIES_CACHE) }
  marketplaceIndustriesPromise = request('/api/marketplace/industries').then((response) => {
    const data = Array.isArray(response?.data) ? response.data : []
    sessionStorage.setItem(MARKETPLACE_INDUSTRIES_CACHE, JSON.stringify({ savedAt: Date.now(), data }))
    return data
  }).catch((error) => { marketplaceIndustriesPromise = undefined; throw error })
  return marketplaceIndustriesPromise
}

export async function createIndustry(formData) {
  const response = await request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await serialize(formData),
  })
  clearMarketplaceIndustryCache()
  return response
}

export async function updateIndustry(id, formData) {
  const response = await request(`${API_URL}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: await serialize(formData) })
  clearMarketplaceIndustryCache()
  return response
}

export async function deleteIndustry(id) {
  const response = await request(`${API_URL}/${id}`, { method: 'DELETE' })
  clearMarketplaceIndustryCache()
  return response
}
