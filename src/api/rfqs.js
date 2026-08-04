import { authHeaders } from '../auth/session'

export async function getQuoteRequests() {
  const response = await fetch('/api/quote-requests', { headers: { Accept: 'application/json', ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load quote requests.')
  return Array.isArray(data.data) ? data.data : []
}

async function post(id, action, payload) {
  const response = await fetch(`/api/quote-requests/${id}/${action}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to update this quote.')
  return data
}

export const sendVendorQuote = (id, payload) => post(id, 'send', payload)
export const respondToVendorQuote = (id, decision) => post(id, 'respond', { decision })
export const generatePurchaseOrder = (id) => post(id, 'purchase-order', {})
export const sendPurchaseOrder = (id) => post(id, 'purchase-order/send', {})
