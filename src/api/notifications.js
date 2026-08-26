import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to update notifications.')
  return data
}

export const getNotificationStates = () => request('/api/notification-states')
export const markNotificationsRead = (keys) => request('/api/notification-states/read', { method: 'POST', body: JSON.stringify({ keys }) })
export const clearNotifications = (keys) => request('/api/notification-states/clear', { method: 'POST', body: JSON.stringify({ keys }) })
