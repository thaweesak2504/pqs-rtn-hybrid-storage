import { useContext } from 'react'
import { UserProfileContext, type UserProfileContextType } from '../contexts/userProfileContextObject'

export const useUserProfile = (): UserProfileContextType => {
  const context = useContext(UserProfileContext)
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}
