import { authHeaders } from '../auth/session'

export async function getDashboard() {
  const response = await fetch('/api/dashboard', { headers: { Accept: 'application/json', ...authHeaders() } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Unable to load dashboard.')
  return data
}
