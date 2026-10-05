import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const validation = data.errors ? Object.values(data.errors).flat().join(' ') : ''
    throw new Error(validation || data.message || `Request failed (${response.status}).`)
  }
  return data
}

export const getAdviceRequests = () => request('/api/advice-requests')
export const openAdviceAttachment = async (id) => {
  const response = await fetch(`/api/advice-requests/${id}/attachment`, { headers: { ...authHeaders() } })
  if (!response.ok) throw new Error('Unable to open this attachment.')
  const blob = await response.blob()
  return { url: URL.createObjectURL(blob), blob }
}
async function compressImage(file) {
  if (!(file instanceof File) || !file.type.startsWith('image/') || file.size <= 1.5 * 1024 * 1024) return file
  const bitmap = await createImageBitmap(file)
  const maxSide = 2200
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78))
  bitmap.close()
  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() })
}

export const createAdviceRequest = async (payload) => { const body = new FormData(); for (const [key, value] of Object.entries(payload)) { if (value === undefined || value === null || value === '') continue; body.append(key, key === 'attachment' ? await compressImage(value) : value) } return request('/api/advice-requests', { method: 'POST', body }) }
export const scheduleAdviceRequest = (id, meetingAt) => request(`/api/advice-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'scheduled', meeting_at: meetingAt }) })
export const getAdviceMessages = (id) => request(`/api/advice-requests/${id}/messages`)
export const sendAdviceMessage = (id, message) => request(`/api/advice-requests/${id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
