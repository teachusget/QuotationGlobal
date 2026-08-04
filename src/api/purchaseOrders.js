import { authHeaders } from '../auth/session'
async function request(url, options = {}) { const response = await fetch(url, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders(), ...options.headers } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Unable to load purchase orders.'); return data }
export const getPurchaseOrders = async () => (await request('/api/purchase-orders')).data || []
export const assignPurchaseOrderVendor = (id, vendorId) => request(`/api/purchase-orders/${id}/assign-vendor`, { method: 'PATCH', body: JSON.stringify({ vendor_id: vendorId }) })
