import React from 'react'
import Avatar from './ui/Avatar'
import { useHybridAvatar } from '../hooks/useHybridAvatar'
import type { User as UserType } from '../types/user'

interface UserAvatarProps {
  user: UserType
  size?: 'sm' | 'md' | 'lg'
  className?: string
  version?: string | null
  onImageError?: () => void
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'md', 
  className = '', 
  version,
  onImageError
}) => {
  const { avatar: hybridAvatar, refreshAvatar } = useHybridAvatar({ 
    userId: user.id ? Number(user.id) : 0,
    autoLoad: !!user.id
  })

  // Listen for global avatar update events
  React.useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { userId } = event.detail
      if (Number(userId) === Number(user.id)) {
        refreshAvatar()
      }
    }

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    }
  }, [user.id, refreshAvatar])

  return (
    <Avatar
      src={hybridAvatar || undefined}
      name={user.full_name || user.username}
      size={size}
      className={className}
      version={version || (user as any)?.avatar_updated_at || null}
      onImageError={onImageError}
    />
  )
}

export default UserAvatar
