const USER_KEY = 'quotation_portal_user'
const TOKEN_KEY = 'quotation_portal_token'
const ADMIN_USER_KEY = 'quotation_impersonator_user'
const ADMIN_TOKEN_KEY = 'quotation_impersonator_token'

function storageWithToken() {
  if (localStorage.getItem(TOKEN_KEY)) return localStorage
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage
  return null
}

export function readAuth() {
  const storage = storageWithToken()
  if (!storage) return { user: null, token: '' }

  try {
    return { user: JSON.parse(storage.getItem(USER_KEY)), token: storage.getItem(TOKEN_KEY) || '' }
  } catch {
    return { user: null, token: '' }
  }
}

export function saveAuth(user, token, remember = true) {
  const target = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  target.setItem(USER_KEY, JSON.stringify(user))
  target.setItem(TOKEN_KEY, token)
  other.removeItem(USER_KEY)
  other.removeItem(TOKEN_KEY)
}

export function clearAuth() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(USER_KEY)
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(ADMIN_USER_KEY)
    storage.removeItem(ADMIN_TOKEN_KEY)
  }
}

export function beginVendorImpersonation(user, token) {
  const admin = readAuth()
  if (!admin.user || !admin.token) throw new Error('Your admin session is no longer available.')
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin.user))
  localStorage.setItem(ADMIN_TOKEN_KEY, admin.token)
  saveAuth(user, token, true)
}

export function isImpersonating() {
  return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY))
}

export function restoreAdminAuth() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  const rawUser = localStorage.getItem(ADMIN_USER_KEY)
  if (!token || !rawUser) return false
  try {
    const user = JSON.parse(rawUser)
    localStorage.removeItem(ADMIN_USER_KEY)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    saveAuth(user, token, true)
    return true
  } catch {
    clearAuth()
    return false
  }
}

export function authHeaders() {
  const { token } = readAuth()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
