import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
export default function PermissionRoute({ permission, children }) { const { can } = useAuth(); const location = useLocation(); return can(permission) ? children : <Navigate to="/forbidden" replace state={{ from: location }}/> }
