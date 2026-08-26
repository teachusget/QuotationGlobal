import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { BrandedLoader } from '../components/ui'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading && !isAuthenticated) return <BrandedLoader/>
  if (isAuthenticated) return <Outlet />
  if (location.pathname === '/') return <Navigate to="/marketplace" replace />
  return <Navigate to="/login" replace state={{ from: location }} />
}
