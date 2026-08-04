import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Unable to complete the request.')
  return data
}

export const getSpecifications = (filters = {}) => request(`/api/specifications?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value))}`)
export const createSpecification = (payload) => request('/api/specifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const updateSpecification = (id, payload) => request(`/api/specifications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const deleteSpecification = (id) => request(`/api/specifications/${id}`, { method: 'DELETE' })
