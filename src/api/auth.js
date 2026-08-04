import { authHeaders } from '../auth/session'

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...options?.headers },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const validationMessage = data.errors ? Object.values(data.errors).flat()[0] : null
    const error = new Error(validationMessage || data.message || 'Unable to complete the request.')
    error.status = response.status
    throw error
  }

  return data
}

export function loginUser(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
}

export function registerUser(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
export function verifyEmailCode(payload) { return request('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) }

export function getCurrentUser() {
  return request('/api/auth/user', { headers: authHeaders() })
}

export function logoutUser() {
  return request('/api/auth/logout', { method: 'POST', headers: authHeaders() })
}

function authenticatedPatch(path, payload) {
  return request(path, { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

export function updateMyProfile(payload) { return authenticatedPatch('/api/auth/profile', payload) }
export function updateMyCompany(payload) { return authenticatedPatch('/api/auth/company', payload) }
export function updateMyPassword(payload) { return authenticatedPatch('/api/auth/password', payload) }

export function requestPasswordReset(email) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(payload) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
