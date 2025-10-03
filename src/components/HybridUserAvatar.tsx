import React, { useState, useEffect } from 'react';
import { useHybridAvatar } from '../hooks/useHybridAvatar';
import { Avatar } from './ui/Avatar';

interface HybridUserAvatarProps {
  user: {
    id: number;
    full_name?: string;
    username?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onImageError?: () => void;
}

const HybridUserAvatar: React.FC<HybridUserAvatarProps> = ({ 
  user, 
  size = 'md', 
  className = '', 
  onImageError 
}) => {
  const { avatarInfo, getAvatarBase64 } = useHybridAvatar({ 
    userId: user.id,
    autoLoad: true
  });
  
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);

  // Load avatar base64 when avatar info changes
  useEffect(() => {
    const loadAvatarSrc = async () => {
      if (avatarInfo?.avatar_path && avatarInfo.file_exists) {
        try {
          const base64 = await getAvatarBase64();
          if (base64) {
            setAvatarSrc(base64);
          } else {
            setAvatarSrc(undefined);
          }
        } catch (error) {
          console.error('Failed to load avatar base64:', error);
          setAvatarSrc(undefined);
          onImageError?.();
        }
      } else {
        setAvatarSrc(undefined);
      }
    };

    loadAvatarSrc();
  }, [avatarInfo, getAvatarBase64, onImageError]);

  // Listen for global avatar update events with debouncing
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isComponentMounted = true;

    const handleAvatarUpdate = (event: CustomEvent) => {
      const { userId, forceRefresh } = event.detail;
      
      // Only handle events for this user
      if (userId === user.id) {
        // Clear any pending timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // If force refresh, clear immediately
        if (forceRefresh) {
          if (isComponentMounted) {
            setAvatarSrc(undefined);
          }
        } else {
          // Otherwise debounce to prevent multiple rapid updates
          timeoutId = setTimeout(() => {
            if (isComponentMounted) {
              setAvatarSrc(undefined);
            }
          }, 100);
        }
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    
    return () => {
      isComponentMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, [user.id]);

  return (
    <Avatar
      src={avatarSrc}
      name={user.full_name || user.username || 'User'}
      size={size}
      className={className}
      onImageError={onImageError}
    />
  );
};

export default HybridUserAvatar;
