import { useEffect, useState, useCallback } from 'react'

interface WindowVisibilityState {
  isVisible: boolean
  isFocused: boolean
  isMaximized: boolean
  windowSize: { width: number; height: number }
}

interface WindowVisibilityOptions {
  onVisibilityChange?: (isVisible: boolean) => void
  onFocusChange?: (isFocused: boolean) => void
  onResize?: (size: { width: number; height: number }) => void
  onMaximizeChange?: (isMaximized: boolean) => void
  debounceMs?: number
}

/**
 * Custom hook for managing window visibility, focus, and resize events
 * Handles issues with display not showing full content after sleep/focus loss
 */
export const useWindowVisibility = (options: WindowVisibilityOptions = {}) => {
  const {
    onVisibilityChange,
    onFocusChange,
    onResize,
    onMaximizeChange,
    debounceMs = 16  // Reduced to 16ms (~60fps) for smooth resize
  } = options

  const [state, setState] = useState<WindowVisibilityState>({
    isVisible: !document.hidden,
    isFocused: document.hasFocus(),
    isMaximized: false,
    windowSize: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  })

  // Debounced resize handler
  const debouncedResize = useCallback(
    (() => {
      let timeoutId: number
      return (width: number, height: number) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          setState(prev => ({
            ...prev,
            windowSize: { width, height }
          }))
          onResize?.({ width, height })
        }, debounceMs)
      }
    })(),
    [onResize, debounceMs]
  )

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden
    setState(prev => ({ ...prev, isVisible }))
    onVisibilityChange?.(isVisible)

    // Force re-render when becoming visible to fix display issues
    if (isVisible) {
      // Trigger a resize event to force layout recalculation
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 50)
    }
  }, [onVisibilityChange])

  // Handle focus change
  const handleFocusChange = useCallback(() => {
    const isFocused = document.hasFocus()
    setState(prev => ({ ...prev, isFocused }))
    onFocusChange?.(isFocused)

    // Force re-render when gaining focus to fix display issues
    if (isFocused) {
      // Trigger a resize event to force layout recalculation
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 50)
    }
  }, [onFocusChange])

  // Handle resize with minimal debouncing for better responsiveness
  const handleResize = useCallback(() => {
    // Only update if window is actually resized and component is mounted
    if (typeof window !== 'undefined' && document.body) {
      const width = window.innerWidth
      const height = window.innerHeight
      debouncedResize(width, height)
    }
  }, [debouncedResize])

  // Handle window maximize/minimize (Tauri specific)
  const handleMaximizeChange = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        const isMaximized = await currentWindow.isMaximized()
        setState(prev => ({ ...prev, isMaximized }))
        onMaximizeChange?.(isMaximized)

        // Removed force re-render to prevent memory corruption
        // The UI will update naturally through React state changes
      }
    } catch (error) {
      console.warn('Failed to check maximize state:', error)
      // Don't crash the app, just log the error
    }
  }, [onMaximizeChange])

  // Set up event listeners
  useEffect(() => {
    // Visibility change events
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Focus events
    window.addEventListener('focus', handleFocusChange)
    window.addEventListener('blur', handleFocusChange)
    
    // Resize events
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    // Tauri window events
    let cleanupTauri: (() => void) | undefined

    if (typeof window !== 'undefined' && window.__TAURI__) {
      // Listen for window state changes
      const setupTauriListeners = async () => {
        try {
          const { getCurrent } = await import('@tauri-apps/api/window')
          const currentWindow = getCurrent()

          // Listen for window state changes with error handling
          const unlistenResize = await currentWindow.listen('tauri://resize', () => {
            try {
              // Use requestAnimationFrame for smooth updates during resize
              requestAnimationFrame(() => {
                if (document.body) { // Check if component is still mounted
                  handleResize()
                }
              })
            } catch (error) {
              console.warn('Error in resize listener:', error)
            }
          })

          const unlistenMaximize = await currentWindow.listen('tauri://maximize', () => {
            try {
              handleMaximizeChange()
            } catch (error) {
              console.warn('Error in maximize listener:', error)
            }
          })

          const unlistenUnmaximize = await currentWindow.listen('tauri://unmaximize', () => {
            try {
              handleMaximizeChange()
            } catch (error) {
              console.warn('Error in unmaximize listener:', error)
            }
          })

          cleanupTauri = () => {
            try {
              unlistenResize()
              unlistenMaximize()
              unlistenUnmaximize()
            } catch (error) {
              console.warn('Error cleaning up Tauri listeners:', error)
            }
          }
        } catch (error) {
          console.warn('Failed to setup Tauri listeners:', error)
        }
      }

      setupTauriListeners()
    }

    // Initial state check
    handleMaximizeChange()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocusChange)
      window.removeEventListener('blur', handleFocusChange)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      
      // Cleanup Tauri listeners
      if (cleanupTauri) {
        cleanupTauri()
      }
    }
  }, [handleVisibilityChange, handleFocusChange, handleResize, handleMaximizeChange])

  // Force refresh function for manual trigger (optimized)
  const forceRefresh = useCallback(() => {
    // Use requestAnimationFrame for smooth refresh
    requestAnimationFrame(() => {
      if (document.body) {
        // Only trigger resize event, avoid orientationchange during resize
        window.dispatchEvent(new Event('resize'))
      }
    })
  }, [])

  return {
    ...state,
    forceRefresh
  }
}
