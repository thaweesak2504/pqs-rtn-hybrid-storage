import { useState, useEffect, useCallback } from 'react'
import { getAvatarFromDatabase, saveAvatarToDatabase, removeAvatarFromDatabase, type AvatarData } from '../services/avatarDatabaseService'

export interface UseAvatarDatabaseOptions {
  userId: number
  autoLoad?: boolean
}

export interface UseAvatarDatabaseReturn {
  avatar: AvatarData | null
  isLoading: boolean
  error: string | null
  saveAvatar: (dataUrl: string) => Promise<boolean>
  removeAvatar: () => Promise<boolean>
  refreshAvatar: () => Promise<void>
  exists: boolean
}

export const useAvatarDatabase = ({ userId, autoLoad = true }: UseAvatarDatabaseOptions): UseAvatarDatabaseReturn => {
  const [avatar, setAvatar] = useState<AvatarData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exists, setExists] = useState(false)

  const loadAvatar = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const avatarData = await getAvatarFromDatabase(userId)
      setAvatar(avatarData)
      setExists(!!avatarData)
    } catch (err) {
      console.error('Failed to load avatar:', err)
      setError('Failed to load avatar')
      setAvatar(null)
      setExists(false)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const saveAvatar = useCallback(async (dataUrl: string): Promise<boolean> => {
    if (!userId) return false
    
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await saveAvatarToDatabase(userId, dataUrl)
      if (success) {
        // Reload avatar after saving
        await loadAvatar()
      }
      return success
    } catch (err) {
      console.error('Failed to save avatar:', err)
      setError('Failed to save avatar')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [userId, loadAvatar])

  const removeAvatar = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await removeAvatarFromDatabase(userId)
      if (success) {
        setAvatar(null)
        setExists(false)
      }
      return success
    } catch (err) {
      console.error('Failed to remove avatar:', err)
      setError('Failed to remove avatar')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const refreshAvatar = useCallback(async () => {
    await loadAvatar()
  }, [loadAvatar, userId])

  // Auto-load avatar on mount and when userId changes
  useEffect(() => {
    if (autoLoad) {
      loadAvatar()
    }
  }, [loadAvatar, autoLoad])

  return {
    avatar,
    isLoading,
    error,
    saveAvatar,
    removeAvatar,
    refreshAvatar,
    exists
  }
}
