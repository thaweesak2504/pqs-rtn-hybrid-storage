import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

type AppRole = 'admin' | 'editor' | 'visitor'

interface RouteGuardProps {
  allowedRoles?: AppRole[]
}

const RouteGuard = ({ allowedRoles }: RouteGuardProps) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-github-text-secondary">
        กำลังตรวจสอบสิทธิ์...
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role as AppRole)) {
    return <Navigate to="/welcome" replace />
  }

  return <Outlet />
}

export default RouteGuard
