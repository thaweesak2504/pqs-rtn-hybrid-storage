import { createContext } from 'react'

export interface User {
  id: string
  username: string
  email: string
  name: string
  role: string
  avatar?: string
  avatar_path?: string | null
  avatar_updated_at?: string | null
  avatar_mime?: string
  avatar_size?: number
  password_hash?: string
  full_name?: string
  rank?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (credentials: { username_or_email: string; password: string }) => Promise<{ success: boolean; user?: User; token?: string }>
  signOut: () => void
  checkAuthStatus: () => void
  updateAvatar: (avatar: string | null) => Promise<void> | void
  handleAvatarLoadError?: () => Promise<void> | void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
