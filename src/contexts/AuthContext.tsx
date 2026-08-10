import React, { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { tauriUserService, type TauriUser } from '../services/tauriService'
import { logger } from '../utils/logger';

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
  full_name?: string
  rank?: string
  is_active?: boolean
  /** True when the user must change password before any other action (seeded default admin). */
  must_change_password?: boolean
  created_at?: string
  updated_at?: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (credentials: { username_or_email: string; password: string }) => Promise<SignInResult>
  signOut: () => void
  checkAuthStatus: () => void
  updateAvatar: (avatar: string | null) => Promise<void> | void
  handleAvatarLoadError?: () => Promise<void> | void
  /**
   * Called by the ForceChangePasswordModal after the backend has successfully
   * changed the user's password. Clears `must_change_password` on the
   * in-memory user and persisted localStorage snapshot so the UI unblocks.
   */
  markPasswordChanged: () => void
}

export type SignInResult =
  | { success: true; user: User }
  | { success: false; reason: 'invalid_credentials' | 'system_error' }

export const LAST_SIGNED_IN_IDENTIFIER_KEY = 'pqs_last_sign_in_identifier'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const hydrateContextUser = async (tauriUser: TauriUser): Promise<User> => {
  const contextUser: User = {
    id: tauriUser.id?.toString() || '',
    username: tauriUser.username,
    email: tauriUser.email,
    name: tauriUser.full_name,
    role: tauriUser.role,
    full_name: tauriUser.full_name,
    rank: tauriUser.rank,
    is_active: tauriUser.is_active,
    must_change_password: tauriUser.must_change_password,
    avatar_path: tauriUser.avatar_path || null,
    avatar_updated_at: tauriUser.avatar_updated_at || null,
    avatar_mime: tauriUser.avatar_mime,
    avatar_size: tauriUser.avatar_size,
    created_at: tauriUser.created_at || '',
    updated_at: tauriUser.updated_at || ''
  }

  if (tauriUser.id) {
    try {
      const { hybridAvatarService } = await import('../services/hybridAvatarService')
      const avatarInfo = await hybridAvatarService.getAvatarInfo(tauriUser.id)
      if (avatarInfo.avatar_path && avatarInfo.file_exists) {
        contextUser.avatar = await hybridAvatarService.getAvatarBase64(avatarInfo.avatar_path)
      }
    } catch (error) {
      logger.warn('Error loading hybrid avatar:', error)
    }
  }

  return contextUser
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasChecked = useRef(false)

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('pqs_user')
    localStorage.removeItem('pqs_token')
    setUser(null)
  }, [])

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true)
    
    try {
      const savedToken = localStorage.getItem('pqs_token')

      if (savedToken) {
        try {
          const backendUser = await tauriUserService.validateAuthSession(savedToken)
          if (!backendUser?.is_active) {
            clearAuthData()
            return
          }

          const verifiedUser = await hydrateContextUser(backendUser)
          localStorage.setItem('pqs_user', JSON.stringify(verifiedUser))
          setUser(verifiedUser)
        } catch (error) {
          logger.warn('Failed to restore user session:', error)
          clearAuthData()
        }
      } else {
        clearAuthData()
      }

    } catch (error) {
      logger.error('Error checking auth status:', error)
      clearAuthData()
    } finally {
      setIsLoading(false)
    }
  }, [clearAuthData])

  // Check if user is authenticated on app load
  useEffect(() => {
    if (hasChecked.current) {
      // React Strict Mode replays effects in development. The first check is
      // still in flight, so do not expose a transient signed-out state here.
      return
    }
    
    hasChecked.current = true
    checkAuthStatus()
  }, [checkAuthStatus])

  const signIn = async (credentials: { username_or_email: string; password: string }): Promise<SignInResult> => {
    try {
      // Use Tauri authentication service
      const session = await tauriUserService.authenticateUser(credentials.username_or_email, credentials.password)
      
      if (session) {
        const contextUser = await hydrateContextUser(session.user)
        
        localStorage.setItem('pqs_user', JSON.stringify(contextUser))
        localStorage.setItem('pqs_token', session.token)
        localStorage.setItem(LAST_SIGNED_IN_IDENTIFIER_KEY, credentials.username_or_email.trim())
        setUser(contextUser)
        return { success: true, user: contextUser }
      }
      
      return { success: false, reason: 'invalid_credentials' }
      
    } catch (error) {
      logger.error('🔐 AuthContext: Sign in error:', error)
      return { success: false, reason: 'system_error' }
    }
  }



  const signOut = () => {
    const token = localStorage.getItem('pqs_token')
    if (token) {
      void tauriUserService.revokeAuthSession(token).catch(error => {
        logger.warn('Failed to revoke backend session:', error)
      })
    }
    clearAuthData()
    setIsLoading(false)
    window.location.hash = '/welcome'
  }

  // Update avatar using Tauri
  const updateAvatar = async (avatarDataUrl: string | null) => {
    if (!user?.id) return
    
    try {
      if (avatarDataUrl === null) {
        // Delete avatar
        // Delete hybrid avatar
        const { hybridAvatarService } = await import('../services/hybridAvatarService')
        await hybridAvatarService.deleteAvatar(Number(user.id))
        setUser(prev => prev ? { 
          ...prev, 
          avatar: undefined,
          avatar_path: null,
          avatar_updated_at: new Date().toISOString()
        } : prev)
      } else {
        // Save avatar
        // Convert data URL to Uint8Array
        const response = await fetch(avatarDataUrl)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Save hybrid avatar
        const { hybridAvatarService } = await import('../services/hybridAvatarService')
        await hybridAvatarService.saveAvatar(
          Number(user.id), 
          uint8Array, 
          blob.type
        )
        
        setUser(prev => prev ? { 
          ...prev, 
          avatar: avatarDataUrl,
          avatar_updated_at: new Date().toISOString()
        } : prev)
      }
    } catch (error) {
      logger.error('Error updating avatar:', error)
    }
  }

  const markPasswordChanged = useCallback(() => {
    setUser(prev => {
      if (!prev) return prev
      const next: User = { ...prev, must_change_password: false }
      try {
        localStorage.setItem('pqs_user', JSON.stringify(next))
      } catch (e) {
        logger.warn('Failed to persist cleared must_change_password flag:', e)
      }
      return next
    })
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
  checkAuthStatus,
  updateAvatar,
  markPasswordChanged,
  handleAvatarLoadError: async () => {
    if (!user?.id) return
    // Clear hybrid avatar
    try { 
      const { hybridAvatarService } = await import('../services/hybridAvatarService')
      await hybridAvatarService.deleteAvatar(Number(user.id))
      setUser(prev => prev ? { ...prev, avatar: undefined, avatar_path: null } : prev)
    } catch (error) {
      logger.warn('Error clearing hybrid avatar:', error)
    }
  }
  }

  // Integrity check: verify avatar exists in Tauri database
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user?.id) return
      
      // Skip avatar integrity check during initialization
      const isInitializationComplete = localStorage.getItem('pqs_initialization_completed')
      if (isInitializationComplete !== 'true') {
        return // Skip during initialization wizard
      }
      
      try {
        const { hybridAvatarService } = await import('../services/hybridAvatarService')
        const avatarInfo = await hybridAvatarService.getAvatarInfo(Number(user.id))
        if (!cancelled && (!avatarInfo.avatar_path || !avatarInfo.file_exists)) {
          // Avatar missing → clear from state
          setUser(prev => prev ? { ...prev, avatar: undefined, avatar_path: null } : prev)
        }
      } catch (error) {
        // Silently ignore errors during initialization
        if (isInitializationComplete === 'true') {
          logger.warn('Error checking avatar integrity:', error)
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
