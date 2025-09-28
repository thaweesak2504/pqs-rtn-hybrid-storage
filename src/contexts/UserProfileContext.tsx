import React, { useState } from 'react'
import { UserProfileContext } from './userProfileContextObject'
import { useAuth } from '../hooks/useAuth'
import UserProfilePanel from '../components/UserProfilePanel'

interface UserProfileProviderProps {
  children: React.ReactNode
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  const openProfile = () => {
    setIsProfileOpen(true)
  }

  const closeProfile = () => {
    setIsProfileOpen(false)
  }

  const toggleProfile = () => {
    setIsProfileOpen(prev => !prev)
  }

  // Expose toggleProfile to global scope for Avatar to use
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).openUserProfile = toggleProfile
    }
  }, [toggleProfile])

  return (
    <UserProfileContext.Provider value={{ 
      isProfileOpen, 
      openProfile, 
      closeProfile, 
      toggleProfile 
    }}>
      {children}
      {/* Right Slide Panel - User Profile */}
      {isAuthenticated && (
        <UserProfilePanel
          isOpen={isProfileOpen}
          onClose={closeProfile}
        />
      )}
    </UserProfileContext.Provider>
  )
}
