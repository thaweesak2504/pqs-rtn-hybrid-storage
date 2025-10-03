import { useState, useCallback, useEffect, useRef } from 'react';
import { hybridAvatarService, HybridAvatarInfo } from '../services/hybridAvatarService';

export interface UseHybridAvatarOptions {
  userId: number | undefined;
  autoLoad?: boolean;
}

export interface UseHybridAvatarReturn {
  avatar: string | null; // Base64 data URL for display
  avatarInfo: HybridAvatarInfo | null;
  isLoading: boolean;
  error: string | null;
  exists: boolean;
  loadAvatar: () => Promise<void>;
  saveAvatar: (fileData: Uint8Array, mimeType: string) => Promise<boolean>;
  deleteAvatar: () => Promise<boolean>;
  getAvatarBase64: () => Promise<string | null>;
  migrateAvatar: () => Promise<boolean>;
  refreshAvatar: () => Promise<void>;
}

export const useHybridAvatar = ({ 
  userId, 
  autoLoad = true 
}: UseHybridAvatarOptions): UseHybridAvatarReturn => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarInfo, setAvatarInfo] = useState<HybridAvatarInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const previousPathRef = useRef<string | null>(null);

  const loadAvatar = useCallback(async (forceReload = false) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const info = await hybridAvatarService.getAvatarInfo(userId);
      
      // Check if avatar_path changed - if not, skip reloading to prevent flash
      if (!forceReload && previousPathRef.current === info.avatar_path && info.avatar_path) {
        setIsLoading(false);
        return; // Avatar hasn't changed, no need to reload
      }
      
      previousPathRef.current = info.avatar_path;
      setAvatarInfo(info);
      setExists(info.file_exists && !!info.avatar_path);
      
      // Load avatar base64 data if file exists
      if (info.file_exists && info.avatar_path) {
        try {
          const base64Data = await hybridAvatarService.getAvatarBase64(info.avatar_path);
          setAvatar(base64Data);
        } catch (fileErr) {
          // File might have been deleted or is inaccessible
          console.warn('Failed to load avatar file:', fileErr);
          setAvatar(null);
          setExists(false);
        }
      } else {
        setAvatar(null);
      }
    } catch (err) {
      console.error('Failed to load hybrid avatar:', err);
      setError('Failed to load avatar');
      setAvatarInfo(null);
      setAvatar(null);
      setExists(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const saveAvatar = useCallback(async (fileData: Uint8Array, mimeType: string): Promise<boolean> => {
    if (!userId) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await hybridAvatarService.saveAvatar(userId, fileData, mimeType);
      setAvatarInfo(result);
      setExists(result.file_exists && !!result.avatar_path);
      // Load the avatar base64 data immediately after saving (like useHybridHighRankAvatar)
      if (result.file_exists && result.avatar_path) {
        const base64Data = await hybridAvatarService.getAvatarBase64(result.avatar_path);
        setAvatar(base64Data);
      } else {
        setAvatar(null);
      }
      return true;
    } catch (err) {
      console.error('Failed to save hybrid avatar:', err);
      setError('Failed to save avatar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await hybridAvatarService.deleteAvatar(userId);
      if (success) {
        setAvatarInfo(null);
        setAvatar(null);
        setExists(false);
      }
      return success;
    } catch (err) {
      console.error('Failed to delete hybrid avatar:', err);
      setError('Failed to delete avatar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const getAvatarBase64 = useCallback(async (): Promise<string | null> => {
    if (!avatarInfo?.avatar_path) return null;
    
    try {
      const base64 = await hybridAvatarService.getAvatarBase64(avatarInfo.avatar_path);
      return base64;
    } catch (err) {
      console.error('Failed to get avatar base64:', err);
      return null;
    }
  }, [avatarInfo?.avatar_path]);

  const migrateAvatar = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await hybridAvatarService.migrateUserAvatar(userId);
      if (success) {
        // Reload avatar after migration
        await loadAvatar();
      }
      return success;
    } catch (err) {
      console.error('Failed to migrate avatar:', err);
      setError('Failed to migrate avatar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadAvatar]);

  const refreshAvatar = useCallback(async () => {
    await loadAvatar();
  }, [loadAvatar]);

  // Auto-load avatar on mount or userId change
  useEffect(() => {
    if (autoLoad && userId) {
      loadAvatar();
    }
  }, [userId, autoLoad, loadAvatar]);

  // Listen for global avatar update events
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { userId: updatedUserId } = event.detail;
      if (updatedUserId === userId) {
        refreshAvatar();
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, [userId, refreshAvatar]);

  return {
    avatar,
    avatarInfo,
    isLoading,
    error,
    exists,
    loadAvatar,
    saveAvatar,
    deleteAvatar,
    getAvatarBase64,
    migrateAvatar,
    refreshAvatar,
  };
};
