import { authHeaders } from '../auth/session'

let servicesPromise
const productRequests = new Map()

export async function getMarketplaceServices() {
  if (servicesPromise) return servicesPromise
  servicesPromise = loadMarketplaceServices().catch((error) => { servicesPromise = undefined; throw error })
  return servicesPromise
}

export async function getMarketplaceSellingCountries() {
  const response = await fetch('/api/marketplace/selling-countries', { headers: { Accept: 'application/json' } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load marketplace countries.')
  return data.data?.allowed_countries || []
}

async function loadMarketplaceServices() {
  const response = await fetch('/api/marketplace/services', { headers: { Accept: 'application/json', ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load marketplace services.')
  return data.data || []
}

export async function getMarketplaceService(id) {
  const key = String(id)
  if (productRequests.has(key)) return productRequests.get(key)
  const promise = loadMarketplaceService(key).catch((error) => { productRequests.delete(key); throw error })
  productRequests.set(key, promise)
  return promise
}

async function loadMarketplaceService(id) {
  const response = await fetch(`/api/marketplace/services/${id}`, { headers: { Accept: 'application/json', ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load this product.')
  return data.data
}

export function prefetchMarketplaceService(id) { return getMarketplaceService(id).catch(() => null) }

export async function getServiceRatings(id) {
  const response = await fetch(`/api/marketplace/services/${id}/ratings`, { headers: { Accept: 'application/json' } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load product ratings.')
  return data.data
}

export async function rateService(id, payload) {
  const response = await fetch(`/api/marketplace/services/${id}/ratings`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Unable to save your rating.')
  return data
}
