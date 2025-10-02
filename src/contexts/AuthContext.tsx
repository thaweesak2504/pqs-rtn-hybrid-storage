import React, { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { AuthContext, type AuthContextType, type User } from './authContextObject'
import { tauriUserService } from '../services/tauriService'

// Context is declared in authContextObject.ts

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasChecked = useRef(false)

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Just check for existing session in localStorage
      const savedUser = localStorage.getItem('pqs_user')
      const savedToken = localStorage.getItem('pqs_token')
      
      if (savedUser && savedToken) {
        try {
          const user = JSON.parse(savedUser)
          setUser(user)
        } catch (error) {
          console.warn('Failed to restore user session:', error)
          clearAuthData()
        }
      }

    } catch (error) {
      console.error('Error checking auth status:', error)
      clearAuthData()
    } finally {
      setIsLoading(false)
    }
  }, []) // Empty dependency array to prevent re-creation

  // Check if user is authenticated on app load
  useEffect(() => {
    if (hasChecked.current) {
      setIsLoading(false)
      return
    }
    
    hasChecked.current = true
    checkAuthStatus()
  }, [checkAuthStatus])

  const clearAuthData = () => {
    localStorage.removeItem('pqs_user')
    localStorage.removeItem('pqs_token')
    setUser(null)
  }

  const signIn = async (credentials: { username_or_email: string; password: string }): Promise<{ success: boolean; user?: User; token?: string }> => {
    setIsLoading(true)
    
    try {
      // Use Tauri authentication service
      const tauriUser = await tauriUserService.authenticateUser(credentials.username_or_email, credentials.password)
      
      if (tauriUser) {
        // Convert Tauri user to context user format
        const contextUser: User = {
          id: tauriUser.id?.toString() || '1',
          username: tauriUser.username,
          email: tauriUser.email,
          name: tauriUser.full_name,
          role: tauriUser.role,
          password_hash: tauriUser.password_hash,
          full_name: tauriUser.full_name,
          rank: tauriUser.rank,
          is_active: tauriUser.is_active,
          avatar: undefined,
          avatar_path: tauriUser.avatar_path || null,
          avatar_updated_at: tauriUser.avatar_updated_at || null,
          avatar_mime: tauriUser.avatar_mime,
          avatar_size: tauriUser.avatar_size,
          created_at: tauriUser.created_at || '',
          updated_at: tauriUser.updated_at || ''
        }
        
        // Load avatar from Hybrid Avatar System if available
        try {
          if (tauriUser.id) {
            const { hybridAvatarService } = await import('../services/hybridAvatarService')
            const avatarInfo = await hybridAvatarService.getAvatarInfo(tauriUser.id)
            if (avatarInfo.avatar_path && avatarInfo.file_exists) {
              const base64Data = await hybridAvatarService.getAvatarBase64(avatarInfo.avatar_path)
              contextUser.avatar = base64Data
            }
          }
        } catch (error) {
          console.warn('Error loading hybrid avatar:', error)
        }
        
        // Save to localStorage
        localStorage.setItem('pqs_user', JSON.stringify(contextUser))
        localStorage.setItem('pqs_token', 'tauri_token_' + Date.now())
        
        setUser(contextUser)
        return { success: true, user: contextUser, token: 'tauri_token_' + Date.now() }
      }
      
      return { success: false }
      
    } catch (error) {
      console.error('🔐 AuthContext: Sign in error:', error)
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }



  const signOut = () => {
    clearAuthData()
    setIsLoading(false) // Reset loading state
    // Navigate to home page after sign out
    window.location.href = '/home'
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
      console.error('Error updating avatar:', error)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
  checkAuthStatus,
  updateAvatar,
  handleAvatarLoadError: async () => {
    if (!user?.id) return
    // Clear hybrid avatar
    try { 
      const { hybridAvatarService } = await import('../services/hybridAvatarService')
      await hybridAvatarService.deleteAvatar(Number(user.id))
      setUser(prev => prev ? { ...prev, avatar: undefined, avatar_path: null } : prev)
    } catch (error) {
      console.warn('Error clearing hybrid avatar:', error)
    }
  }
  }

  // Integrity check: verify avatar exists in Tauri database
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user?.id) return
      try {
        const { hybridAvatarService } = await import('../services/hybridAvatarService')
        const avatarInfo = await hybridAvatarService.getAvatarInfo(Number(user.id))
        if (!cancelled && (!avatarInfo.avatar_path || !avatarInfo.file_exists)) {
          // Avatar missing → clear from state
          setUser(prev => prev ? { ...prev, avatar: undefined, avatar_path: null } : prev)
        }
      } catch (error) {
        console.warn('Error checking avatar integrity:', error)
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
