import { authHeaders } from '../auth/session'

export async function getMarketplaceServices() {
  const response = await fetch('/api/marketplace/services', { headers: { Accept: 'application/json', ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load marketplace services.')
  return data.data || []
}

export async function getMarketplaceService(id) {
  const response = await fetch(`/api/marketplace/services/${id}`, { headers: { Accept: 'application/json', ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load this product.')
  return data.data
}

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
