import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Chat request failed.')
    error.status = response.status
    throw error
  }
  return data
}

export const getChatConversations = () => request('/api/marketplace-chat/conversations')
export const createChatConversation = (payload) => request('/api/marketplace-chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const createSupportConversation = () => createChatConversation({ support: true })
export const getChatMessages = (id) => request(`/api/marketplace-chat/conversations/${id}/messages`)
export const sendChatMessage = (id, message, attachment = null) => {
  const body = new FormData()
  if (message) body.append('message', message)
  if (attachment) body.append('attachment', attachment)
  return request(`/api/marketplace-chat/conversations/${id}/messages`, { method: 'POST', body })
}
