import React, { createContext, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import UserProfilePanel from '../components/UserProfilePanel'

declare global {
  interface Window {
    openUserProfile?: () => void
  }
}

export interface UserProfileContextType {
  isProfileOpen: boolean
  openProfile: () => void
  closeProfile: () => void
  toggleProfile: () => void
}

export const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

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

// eslint-disable-next-line react-hooks/exhaustive-deps
  const toggleProfile = () => {
    setIsProfileOpen(prev => !prev)
  }

  // Expose toggleProfile to global scope for Avatar to use
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openUserProfile = toggleProfile
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

