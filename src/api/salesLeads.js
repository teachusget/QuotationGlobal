import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || Object.values(data.errors || {}).flat()[0] || 'Unable to manage sales leads.')
  return data
}

export const getSalesLeads = (params = {}) => request(`/api/sales-leads?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))}`)
export const searchSalesLeadBuyers = (vendorId, search = '') => request(`/api/sales-leads/buyers/search?${new URLSearchParams({ vendor_id: vendorId, search })}`)
export const createSalesLead = (payload) => request('/api/sales-leads', { method: 'POST', body: JSON.stringify(payload) })
export const updateSalesLead = (id, payload) => request(`/api/sales-leads/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
