import { useEffect, useCallback, useRef } from 'react'

interface WindowVisibilityRefreshOptions {
  onVisibilityChange?: (visible: boolean) => void
  onFocusChange?: (focused: boolean) => void
  forceRefresh: () => void
  refreshDelay?: number
}

/**
 * Custom hook for window visibility refresh management
 * Handles force refresh when window becomes visible or gains focus
 * 
 * Phase 1.2: Extracted from BaseLayout to reduce useEffect complexity
 * Uses stable references to prevent unnecessary re-subscriptions
 */
export function useWindowVisibilityRefresh(options: WindowVisibilityRefreshOptions) {
  const {
    onVisibilityChange,
    onFocusChange,
    forceRefresh,
    refreshDelay = 100
  } = options

  // Store callbacks in ref to maintain stable references
  const optionsRef = useRef({
    onVisibilityChange,
    onFocusChange,
    forceRefresh
  })

  // Update ref on each render without triggering effect re-run
  useEffect(() => {
    optionsRef.current = {
      onVisibilityChange,
      onFocusChange,
      forceRefresh
    }
  })

  // Memoized handlers with stable references
  const handleVisibilityChange = useCallback((visible: boolean) => {
    const { onVisibilityChange, forceRefresh } = optionsRef.current
    
    onVisibilityChange?.(visible)
    
    if (visible) {
      setTimeout(() => {
        forceRefresh()
      }, refreshDelay)
    }
  }, [refreshDelay])

  const handleFocusChange = useCallback((focused: boolean) => {
    const { onFocusChange, forceRefresh } = optionsRef.current
    
    onFocusChange?.(focused)
    
    if (focused) {
      setTimeout(() => {
        forceRefresh()
      }, refreshDelay)
    }
  }, [refreshDelay])

  return {
    handleVisibilityChange,
    handleFocusChange
  }
}
