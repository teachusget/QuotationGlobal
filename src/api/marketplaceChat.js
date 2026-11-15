import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Chat request failed.')
  return data
}

export const getChatConversations = () => request('/api/marketplace-chat/conversations')
export const createChatConversation = (payload) => request('/api/marketplace-chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const getChatMessages = (id) => request(`/api/marketplace-chat/conversations/${id}/messages`)
export const sendChatMessage = (id, message) => request(`/api/marketplace-chat/conversations/${id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
