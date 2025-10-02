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
    debounceMs = 100
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

  // Handle window resize
  const handleResize = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    debouncedResize(width, height)
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

        // Force re-render when maximize state changes
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'))
        }, 50)
      }
    } catch (error) {
      console.warn('Failed to check maximize state:', error)
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
    if (typeof window !== 'undefined' && window.__TAURI__) {
      // Listen for window state changes
      const setupTauriListeners = async () => {
        try {
          const { getCurrent } = await import('@tauri-apps/api/window')
          const currentWindow = getCurrent()
          
          // Listen for window state changes
          const unlisten = await currentWindow.listen('tauri://resize', () => {
            handleResize()
          })
          
          const unlistenMaximize = await currentWindow.listen('tauri://maximize', () => {
            handleMaximizeChange()
          })
          
          const unlistenUnmaximize = await currentWindow.listen('tauri://unmaximize', () => {
            handleMaximizeChange()
          })

          return () => {
            unlisten()
            unlistenMaximize()
            unlistenUnmaximize()
          }
        } catch (error) {
          console.warn('Failed to setup Tauri listeners:', error)
          return () => {}
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
    }
  }, [handleVisibilityChange, handleFocusChange, handleResize, handleMaximizeChange])

  // Force refresh function for manual trigger
  const forceRefresh = useCallback(() => {
    // Force a complete re-render by triggering multiple events
    window.dispatchEvent(new Event('resize'))
    setTimeout(() => {
      window.dispatchEvent(new Event('orientationchange'))
    }, 10)
  }, [])

  return {
    ...state,
    forceRefresh
  }
}
