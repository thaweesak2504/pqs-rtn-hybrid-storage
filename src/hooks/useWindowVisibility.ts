import { useEffect, useState, useCallback, useRef } from 'react'

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
 * 
 * Phase 1.1 Improvements:
 * - Stable references using useRef to prevent memory corruption
 * - Proper cleanup mechanism for all event listeners
 * - Mounted flag to prevent setState after unmount
 * - Re-enabled maximize listeners with safety measures
 */
export const useWindowVisibility = (options: WindowVisibilityOptions = {}) => {
  const {
    onVisibilityChange,
    onFocusChange,
    onResize,
    onMaximizeChange,
    debounceMs = 100
  } = options

  // ✅ Use refs to maintain stable references and prevent recreation
  const optionsRef = useRef({ onVisibilityChange, onFocusChange, onResize, onMaximizeChange })
  const mountedRef = useRef(true)
  const resizeTimerRef = useRef<number>()

  // ✅ Update options ref on each render without causing effect re-runs
  useEffect(() => {
    optionsRef.current = { onVisibilityChange, onFocusChange, onResize, onMaximizeChange }
  })

  // ✅ Track mounted state
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const [state, setState] = useState<WindowVisibilityState>({
    isVisible: !document.hidden,
    isFocused: document.hasFocus(),
    isMaximized: false,
    windowSize: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  })

  // ✅ Memoized handlers with stable references using optionsRef
  const handleVisibilityChange = useCallback(() => {
    if (!mountedRef.current) return

    const isVisible = !document.hidden
    setState(prev => ({ ...prev, isVisible }))
    
    const { onVisibilityChange } = optionsRef.current
    onVisibilityChange?.(isVisible)

    // Force re-render when becoming visible to fix display issues
    if (isVisible) {
      requestAnimationFrame(() => {
        if (mountedRef.current) {
          window.dispatchEvent(new Event('resize'))
        }
      })
    }
  }, []) // Empty deps - stable function

  const handleFocusChange = useCallback(() => {
    if (!mountedRef.current) return

    const isFocused = document.hasFocus()
    setState(prev => ({ ...prev, isFocused }))
    
    const { onFocusChange } = optionsRef.current
    onFocusChange?.(isFocused)

    // Force re-render when gaining focus to fix display issues
    if (isFocused) {
      requestAnimationFrame(() => {
        if (mountedRef.current) {
          window.dispatchEvent(new Event('resize'))
        }
      })
    }
  }, []) // Empty deps - stable function

  // ✅ Optimized resize handler with debouncing
  const handleResize = useCallback(() => {
    if (!mountedRef.current || typeof window === 'undefined' || !document.body) {
      return
    }

    // Clear previous timer
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current)
    }

    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      if (!mountedRef.current) return

      const width = window.innerWidth
      const height = window.innerHeight

      // Debounce state update
      resizeTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            windowSize: { width, height }
          }))
          
          const { onResize } = optionsRef.current
          onResize?.({ width, height })
        }
      }, debounceMs)
    })
  }, [debounceMs]) // Only depend on debounceMs

  // ✅ RE-ENABLED: Maximize/minimize handler with safety measures
  const handleMaximizeChange = useCallback(async (isMaximized: boolean) => {
    if (!mountedRef.current) return

    // Use requestIdleCallback for non-critical state updates
    requestIdleCallback(() => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isMaximized }))
        
        const { onMaximizeChange } = optionsRef.current
        onMaximizeChange?.(isMaximized)
      }
    })
  }, []) // Empty deps - stable function

  // ✅ Set up event listeners with comprehensive cleanup
  useEffect(() => {
    let cleanupFunctions: (() => void)[] = []

    // Browser event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocusChange)
    window.addEventListener('blur', handleFocusChange)
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    // Tauri window events with proper cleanup tracking
    if (typeof window !== 'undefined' && window.__TAURI__) {
      const setupTauriListeners = async () => {
        if (!mountedRef.current) return

        try {
          const { getCurrent } = await import('@tauri-apps/api/window')
          const currentWindow = getCurrent()

          // ✅ Resize listener with safety checks
          const unlistenResize = await currentWindow.listen('tauri://resize', () => {
            try {
              if (mountedRef.current && document.body) {
                // Throttle resize events
                requestAnimationFrame(() => {
                  if (mountedRef.current) {
                    handleResize()
                  }
                })
              }
            } catch (error) {
              console.warn('Error in Tauri resize listener:', error)
            }
          })

          cleanupFunctions.push(unlistenResize)

          // ✅ RE-ENABLED: Maximize listener with safety measures
          const unlistenMaximize = await currentWindow.listen('tauri://maximize', () => {
            try {
              if (mountedRef.current) {
                handleMaximizeChange(true)
              }
            } catch (error) {
              console.warn('Error in Tauri maximize listener:', error)
            }
          })

          cleanupFunctions.push(unlistenMaximize)

          // ✅ RE-ENABLED: Unmaximize listener with safety measures
          const unlistenUnmaximize = await currentWindow.listen('tauri://unmaximize', () => {
            try {
              if (mountedRef.current) {
                handleMaximizeChange(false)
              }
            } catch (error) {
              console.warn('Error in Tauri unmaximize listener:', error)
            }
          })

          cleanupFunctions.push(unlistenUnmaximize)

          // ✅ Check initial maximize state
          if (mountedRef.current) {
            try {
              const isMaximized = await currentWindow.isMaximized()
              if (mountedRef.current) {
                handleMaximizeChange(isMaximized)
              }
            } catch (error) {
              console.warn('Failed to check initial maximize state:', error)
            }
          }

        } catch (error) {
          console.warn('Failed to setup Tauri listeners:', error)
        }
      }

      setupTauriListeners()
    }

    // ✅ Comprehensive cleanup function
    return () => {
      // Clear resize timer
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
      }

      // Remove browser event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocusChange)
      window.removeEventListener('blur', handleFocusChange)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      
      // Cleanup all Tauri listeners
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.warn('Error during Tauri listener cleanup:', error)
        }
      })
      cleanupFunctions = []
    }
  }, [handleVisibilityChange, handleFocusChange, handleResize, handleMaximizeChange])

  // ✅ Force refresh function for manual trigger (optimized)
  const forceRefresh = useCallback(() => {
    if (!mountedRef.current) return

    // Use requestAnimationFrame for smooth refresh
    requestAnimationFrame(() => {
      if (mountedRef.current && document.body) {
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
