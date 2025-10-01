import React from 'react'
import BaseLayout from './BaseLayout'
import { useAuth } from '../hooks/useAuth'

const UnifiedLayout: React.FC = () => {
  const { user } = useAuth()
  
  // Use pqs layout for all routes
  const layoutType = 'pqs'
  
  // Show right panel when user is authenticated (can be opened anywhere)
  const showRightPanel = !!user
  
  return (
    <BaseLayout 
      layoutType={layoutType}
      showRightPanel={showRightPanel}
    />
  )
}

export default UnifiedLayout
