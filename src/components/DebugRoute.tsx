import React, { useEffect } from 'react'
import { useLocation, Navigate } from 'react-router-dom'

const DebugRoute: React.FC = () => {
  const location = useLocation()
  
  useEffect(() => {
    // Debug route - redirect to home
  }, [location.pathname])
  
  return <Navigate to="/home" replace />
}

export default DebugRoute
