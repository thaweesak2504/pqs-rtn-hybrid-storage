import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import UserProfilePanel from './UserProfilePanel'

const UserProfileProvider: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { isProfileOpen, closeProfile, toggleProfile } = useUserProfile()

  // Expose toggleProfile to global scope for Avatar to use
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).openUserProfile = toggleProfile
    }
  }, [toggleProfile])

  if (!isAuthenticated) {
    return null
  }

  return (
    <UserProfilePanel
      isOpen={isProfileOpen}
      onClose={closeProfile}
    />
  )
}

export default UserProfileProvider
