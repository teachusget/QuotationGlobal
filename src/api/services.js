import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Unable to complete the request.')
  return data
}

let servicesRequest
let servicesResponse
let servicesResponseAt = 0
const invalidateServices = () => { servicesRequest = null; servicesResponse = null; servicesResponseAt = 0 }
export const getServices = () => {
  if (servicesResponse && Date.now() - servicesResponseAt < 5000) return Promise.resolve(servicesResponse)
  if (servicesRequest) return servicesRequest
  servicesRequest = request('/api/services').then((response) => {
    servicesResponse = response
    servicesResponseAt = Date.now()
    return response
  }).finally(() => { servicesRequest = null })
  return servicesRequest
}
const mutateServices = async (...args) => { const response = await request(...args); invalidateServices(); return response }
export const createService = (payload) => mutateServices('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const deleteService = (id) => mutateServices(`/api/services/${id}`, { method: 'DELETE' })
export const updateService = (id, payload) => mutateServices(`/api/services/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const updateServiceProduct = (id, payload) => mutateServices(`/api/services/${id}/product`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const deleteServiceProduct = (id) => mutateServices(`/api/services/${id}/product`, { method: 'DELETE' })
