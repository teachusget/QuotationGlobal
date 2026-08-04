import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading portal...</div>
  if (isAuthenticated) return <Outlet />
  if (location.pathname === '/') return <Navigate to="/marketplace" replace />
  return <Navigate to="/login" replace state={{ from: location }} />
}
