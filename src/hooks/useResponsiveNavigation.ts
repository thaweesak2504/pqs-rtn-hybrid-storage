import { useState, useEffect, useCallback, useRef } from 'react'

export interface BreakpointConfig {
  mobile: number
  tablet: number
  desktop: number
}

export interface ResponsiveNavigation {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  isTouchDevice: boolean
  isReducedMotion: boolean
  isHighContrast: boolean
  isDarkMode: boolean
  getBreakpoint: () => 'mobile' | 'tablet' | 'desktop'
  addResizeListener: (callback: (width: number, height: number) => void) => () => void
  addOrientationListener: (callback: (orientation: 'portrait' | 'landscape') => void) => () => void
}

/**
 * Custom hook for responsive navigation
 * Provides device detection and responsive behavior
 */
export const useResponsiveNavigation = (
  breakpoints: BreakpointConfig = {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  }
): ResponsiveNavigation => {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)
  const [screenHeight, setScreenHeight] = useState(window.innerHeight)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  )
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const resizeListeners = useRef<Set<(width: number, height: number) => void>>(new Set())
  const orientationListeners = useRef<Set<(orientation: 'portrait' | 'landscape') => void>>(new Set())

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      )
    }

    checkTouchDevice()
  }, [])

  // Detect reduced motion preference
  useEffect(() => {
    const checkReducedMotion = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setIsReducedMotion(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setIsReducedMotion(e.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    checkReducedMotion()
  }, [])

  // Detect high contrast preference
  useEffect(() => {
    const checkHighContrast = () => {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)')
      setIsHighContrast(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setIsHighContrast(e.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    checkHighContrast()
  }, [])

  // Detect dark mode preference
  useEffect(() => {
    const checkDarkMode = () => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      setIsDarkMode(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    checkDarkMode()
  }, [])

  // Handle window resize
  const handleResize = useCallback(() => {
    const newWidth = window.innerWidth
    const newHeight = window.innerHeight
    const newOrientation = newHeight > newWidth ? 'portrait' : 'landscape'

    setScreenWidth(newWidth)
    setScreenHeight(newHeight)
    setOrientation(newOrientation)

    // Notify resize listeners
    resizeListeners.current.forEach(callback => {
      try {
        callback(newWidth, newHeight)
      } catch (error) {
        console.error('Resize listener error:', error)
      }
    })

    // Notify orientation listeners if orientation changed
    if (orientation !== newOrientation) {
      orientationListeners.current.forEach(callback => {
        try {
          callback(newOrientation)
        } catch (error) {
          console.error('Orientation listener error:', error)
        }
      })
    }
  }, [orientation])

  // Set up resize listener
  useEffect(() => {
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [handleResize])

  // Calculate breakpoint
  const getBreakpoint = useCallback((): 'mobile' | 'tablet' | 'desktop' => {
    if (screenWidth < breakpoints.mobile) {
      return 'mobile'
    } else if (screenWidth < breakpoints.tablet) {
      return 'tablet'
    } else {
      return 'desktop'
    }
  }, [screenWidth, breakpoints])

  // Add resize listener
  const addResizeListener = useCallback((callback: (width: number, height: number) => void) => {
    resizeListeners.current.add(callback)

    // Return cleanup function
    return () => {
      resizeListeners.current.delete(callback)
    }
  }, [])

  // Add orientation listener
  const addOrientationListener = useCallback((callback: (orientation: 'portrait' | 'landscape') => void) => {
    orientationListeners.current.add(callback)

    // Return cleanup function
    return () => {
      orientationListeners.current.delete(callback)
    }
  }, [])

  // Calculate responsive states
  const currentBreakpoint = getBreakpoint()
  const isMobile = currentBreakpoint === 'mobile'
  const isTablet = currentBreakpoint === 'tablet'
  const isDesktop = currentBreakpoint === 'desktop'

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    screenHeight,
    orientation,
    isTouchDevice,
    isReducedMotion,
    isHighContrast,
    isDarkMode,
    getBreakpoint,
    addResizeListener,
    addOrientationListener
  }
}
