import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Unable to complete the request.')
  return data
}

export const getServices = () => request('/api/services')
export const createService = (payload) => request('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const deleteService = (id) => request(`/api/services/${id}`, { method: 'DELETE' })
export const updateService = (id, payload) => request(`/api/services/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const updateServiceProduct = (id, payload) => request(`/api/services/${id}/product`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const deleteServiceProduct = (id) => request(`/api/services/${id}/product`, { method: 'DELETE' })
