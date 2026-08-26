import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || Object.values(data.errors || {}).flat()[0] || 'Unable to manage projects.')
  return data
}

export const getProjects = (params = {}) => request(`/api/projects?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))}`)
export const createProject = (payload) => request('/api/projects', { method: 'POST', body: JSON.stringify(payload) })
export const updateProject = (id, payload) => request(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
