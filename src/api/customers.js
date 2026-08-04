import { authHeaders } from '../auth/session'
export async function getCustomers() { const response = await fetch('/api/customers', { headers: { Accept: 'application/json', ...authHeaders() } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'Unable to load customers.'); return data.data || [] }

async function mutateCustomer(id, options) { const response = await fetch(`/api/customers/${id}${options.path || ''}`, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders() } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'Unable to update customer.'); return data }
export const setCustomerBlocked = (id, blocked) => mutateCustomer(id, { path: '/blocked', method: 'PATCH', body: JSON.stringify({ blocked }) })
export const deleteCustomer = (id) => mutateCustomer(id, { method: 'DELETE' })
