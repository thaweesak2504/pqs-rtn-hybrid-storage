import { useState, useCallback, useEffect, useRef } from 'react';
import { hybridHighRankAvatarService, HybridHighRankAvatarInfo } from '../services/hybridHighRankAvatarService';
import { logger } from '../utils/logger';

export interface UseHybridHighRankAvatarOptions {
  officerId: number | undefined;
  autoLoad?: boolean;
}

export interface UseHybridHighRankAvatarReturn {
  avatar: string | null; // Base64 data URL for display
  avatarInfo: HybridHighRankAvatarInfo | null;
  isLoading: boolean;
  error: string | null;
  exists: boolean;
  loadAvatar: () => Promise<void>;
  saveAvatar: (fileData: Uint8Array, mimeType: string) => Promise<boolean>;
  deleteAvatar: () => Promise<boolean>;
  getAvatarBase64: () => Promise<string | null>;
  refreshAvatar: () => Promise<void>;
}

export const useHybridHighRankAvatar = ({ 
  officerId, 
  autoLoad = true 
}: UseHybridHighRankAvatarOptions): UseHybridHighRankAvatarReturn => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarInfo, setAvatarInfo] = useState<HybridHighRankAvatarInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const previousPathRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const loadAvatar = useCallback(async () => {
    if (!officerId || loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const info = await hybridHighRankAvatarService.getAvatarInfo(officerId);
      
      // Skip if path hasn't changed
      if (previousPathRef.current === info.avatar_path && info.avatar_path) {
        setIsLoading(false);
        loadingRef.current = false;
        return;
      }
      
      previousPathRef.current = info.avatar_path;
      setAvatarInfo(info);
      setExists(info.file_exists && !!info.avatar_path);
      
      // Load avatar base64 data if file exists
      if (info.file_exists && info.avatar_path) {
        const base64Data = await hybridHighRankAvatarService.getAvatarBase64(info.avatar_path);
        setAvatar(base64Data);
      } else {
        setAvatar(null);
      }
    } catch (err) {
      logger.error('Failed to load high rank avatar:', err);
      setError('Failed to load avatar');
      setAvatarInfo(null);
      setAvatar(null);
      setExists(false);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [officerId]);

  const saveAvatar = useCallback(async (fileData: Uint8Array, mimeType: string): Promise<boolean> => {
    if (!officerId) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await hybridHighRankAvatarService.saveAvatar(officerId, fileData, mimeType);
      setAvatarInfo(result);
      setExists(result.file_exists && !!result.avatar_path);
      if (result.file_exists && result.avatar_path) {
        const base64Data = await hybridHighRankAvatarService.getAvatarBase64(result.avatar_path);
        setAvatar(base64Data);
      } else {
        setAvatar(null);
      }
      return true;
    } catch (err: any) {
      logger.error('Failed to save high rank avatar:', err);
      setError(err.toString());
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [officerId]);

  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    if (!officerId) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await hybridHighRankAvatarService.deleteAvatar(officerId);
      if (success) {
        setAvatarInfo(null);
        setAvatar(null);
        setExists(false);
      }
      return success;
    } catch (err: any) {
      logger.error('Failed to delete high rank avatar:', err);
      setError(err.toString());
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [officerId]);

  const getAvatarBase64 = useCallback(async (): Promise<string | null> => {
    if (!officerId || !avatarInfo?.avatar_path) return null;
    try {
      return await hybridHighRankAvatarService.getAvatarBase64(avatarInfo.avatar_path);
    } catch (err) {
      logger.error('Failed to get high rank avatar base64:', err);
      setError('Failed to get avatar base64');
      return null;
    }
  }, [officerId, avatarInfo]);

  const refreshAvatar = useCallback(async () => {
    await loadAvatar();
  }, [loadAvatar]);

  useEffect(() => {
    if (autoLoad && officerId) {
      loadAvatar();
    }
  }, [officerId, autoLoad, loadAvatar]);

  // Listen for global high rank avatar update events
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { officerId: updatedOfficerId } = event.detail;
      if (Number(updatedOfficerId) === Number(officerId)) {
        refreshAvatar();
      }
    };

    window.addEventListener('highRankAvatarUpdated', handleAvatarUpdate as EventListener);
    return () => {
      window.removeEventListener('highRankAvatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, [officerId, refreshAvatar]);

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
    refreshAvatar,
  };
};
