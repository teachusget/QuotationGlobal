import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, loginUser, logoutUser, registerUser, verifyEmailCode } from '../api/auth'
import { AuthContext } from './auth-context'
import { clearAuth, readAuth, saveAuth, saveCurrentUser } from './session'

export function AuthProvider({ children }) {
  const initial = readAuth()
  const [user, setUser] = useState(initial.user)
  const [loading, setLoading] = useState(Boolean(initial.token))

  useEffect(() => {
    if (!initial.token) return
    getCurrentUser()
      .then((response) => setUser(response.user))
      .catch(() => { clearAuth(); setUser(null) })
      .finally(() => setLoading(false))
  }, [initial.token])

  const login = useCallback(async ({ login, password, remember }) => {
    const response = await loginUser({ login, password })
    saveAuth(response.user, response.token, remember)
    setUser(response.user)
  }, [])

  const register = useCallback(async (payload) => {
    return registerUser(payload)
  }, [])

  const verifyEmail = useCallback(async (payload) => {
    const response = await verifyEmailCode(payload)
    saveAuth(response.user, response.token, true)
    setUser(response.user)
    return response
  }, [])

  const logout = useCallback(async () => {
    try { await logoutUser() } catch { /* Clear the local session even if the request fails. */ }
    clearAuth()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const response = await getCurrentUser()
    saveCurrentUser(response.user)
    setUser(response.user)
    return response.user
  }, [])

  const updateCurrentUser = useCallback((nextUser) => {
    saveCurrentUser(nextUser)
    setUser(nextUser)
  }, [])

  const can = useCallback((permission) => Boolean(user?.permissions?.includes(permission)), [user])
  const canAny = useCallback((permissions) => permissions.some(can), [can])
  const value = useMemo(() => ({ user, loading, isAuthenticated: Boolean(user), login, register, verifyEmail, logout, refreshUser, updateCurrentUser, can, canAny }), [user, loading, login, register, verifyEmail, logout, refreshUser, updateCurrentUser, can, canAny])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
