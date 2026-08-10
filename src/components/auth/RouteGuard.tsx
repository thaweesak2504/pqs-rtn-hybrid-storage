import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import SessionLoadingState from './SessionLoadingState'

type AppRole = 'admin' | 'editor' | 'visitor'

interface RouteGuardProps {
  allowedRoles?: AppRole[]
}

const RouteGuard = ({ allowedRoles }: RouteGuardProps) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <SessionLoadingState label="กำลังตรวจสอบสิทธิ์ผู้ใช้" />
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
