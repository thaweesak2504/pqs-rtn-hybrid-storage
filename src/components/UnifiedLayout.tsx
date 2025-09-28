import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import BaseLayout from './BaseLayout'
import { useAuth } from '../hooks/useAuth'

const UnifiedLayout: React.FC = () => {
  const location = useLocation()
  const { user } = useAuth()
  
  // Use pqs layout for all routes
  const layoutType = 'pqs'
  
  // Show right panel when user is authenticated (can be opened anywhere)
  const showRightPanel = !!user
  
  return (
    <BaseLayout 
      layoutType={layoutType}
      showRightPanel={showRightPanel}
    >
      <Outlet />
    </BaseLayout>
  )
}

export default UnifiedLayout
