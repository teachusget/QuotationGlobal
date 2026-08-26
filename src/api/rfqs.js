import { authHeaders } from '../auth/session'

export async function downloadBuyerAttachment(request) {
  const response = await fetch(`/api/quote-requests/${request.id}/buyer-attachment`, { headers: authHeaders() })
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || 'Unable to download attachment.') }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a'); link.href = url; link.download = request.buyer_attachment_name || 'attachment'; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function getBuyerAttachmentPreviewUrl(request) {
  const response = await fetch(`/api/quote-requests/${request.id}/buyer-attachment`, { headers: authHeaders() })
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || 'Unable to open attachment.') }
  return URL.createObjectURL(await response.blob())
}

export async function downloadVendorQuoteAttachment(request) {
  const response = await fetch(`/api/quote-requests/${request.id}/vendor-attachment`, { headers: authHeaders() })
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || 'Unable to download quotation attachment.') }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a'); link.href = url; link.download = request.vendor_quote_attachment_name || 'quotation-attachment'; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

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

export async function getQuotations(params = {}) {
  const query = new URLSearchParams({ quotation_only: '1' })
  Object.entries(params).forEach(([key, value]) => { if (value !== '' && value !== null && value !== undefined) query.set(key, value) })
  const response = await fetch(`/api/quote-requests?${query}`, { headers: { Accept: 'application/json', ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load quotations.')
  return { data: data.data || [], meta: data.meta || {} }
}

async function postQuote(id, payload) {
  const form = new FormData()
  const append = (value, key) => {
    if (value === null || value === undefined) return
    if (value instanceof File) { form.append(key, value); return }
    if (Array.isArray(value)) { value.forEach((item, index) => append(item, `${key}[${index}]`)); return }
    if (typeof value === 'object') { Object.entries(value).forEach(([child, item]) => append(item, `${key}[${child}]`)); return }
    form.append(key, String(value))
  }
  Object.entries(payload).forEach(([key, value]) => append(value, key))
  const response = await fetch(`/api/quote-requests/${id}/send`, { method: 'POST', headers: { Accept: 'application/json', ...authHeaders() }, body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || Object.values(data.errors || {}).flat()[0] || 'Unable to send quotation.')
  return data
}

export const sendVendorQuote = (id, payload) => postQuote(id, payload)
export const respondToVendorQuote = (id, decision) => post(id, 'respond', { decision })
export const generatePurchaseOrder = (id) => post(id, 'purchase-order', {})
export const sendPurchaseOrder = (id) => post(id, 'purchase-order/send', {})
