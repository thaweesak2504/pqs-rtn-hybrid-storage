import { useEffect, useRef } from 'react'

/**
 * Custom hook for avatar synchronization
 * Listens to global avatar update events and triggers refresh
 * 
 * Phase 1.2: Extracted from BaseLayout to reduce useEffect complexity
 */
export function useAvatarSync(
  userId: number | undefined,
  onAvatarUpdate: () => void
) {
  // Use ref to maintain stable reference
  const onUpdateRef = useRef(onAvatarUpdate)
  
  // Update ref on each render without triggering effect re-run
  useEffect(() => {
    onUpdateRef.current = onAvatarUpdate
  })

  useEffect(() => {
    if (!userId) return

    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent
      const { userId: eventUserId } = customEvent.detail
      
      if (Number(eventUserId) === Number(userId)) {
        onUpdateRef.current()
      }
    }

    window.addEventListener('avatarUpdated', handleEvent)
    
    return () => {
      window.removeEventListener('avatarUpdated', handleEvent)
    }
  }, [userId]) // Only re-run when userId changes
}
