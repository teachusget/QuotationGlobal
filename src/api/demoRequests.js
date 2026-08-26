import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to send request.')
  return data
}

export const createDemoRequest = (payload) => { const body = new FormData(); Object.entries(payload).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') body.append(key, value) }); return request('/api/demo-requests', { method: 'POST', body }) }
export const getDemoRequests = () => request('/api/demo-requests')
export const updateDemoRequest = (id, status, rejectionReason = '') => request(`/api/demo-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, ...(status === 'rejected' ? { rejection_reason: rejectionReason } : {}) }) })
export const getDemoMessages = (id) => request(`/api/demo-requests/${id}/messages`)
export const sendDemoMessage = (id, payload) => request(`/api/demo-requests/${id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(typeof payload === 'string' ? { message: payload } : payload) })
export const moderateDemoChat = (id, participant, blocked) => request(`/api/demo-requests/${id}/moderation`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participant, blocked }) })
export const markDemoNotificationsRead = () => request('/api/demo-notifications/read', { method: 'POST' })
