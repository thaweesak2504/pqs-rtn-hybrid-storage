import { createContext } from 'react'

export interface UserProfileContextType {
  isProfileOpen: boolean
  openProfile: () => void
  closeProfile: () => void
  toggleProfile: () => void
}

export const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)
