import { useState, useEffect } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'

export interface BreakpointConfig {
  mobile: number
  tablet: number
  desktop: number
  wide: number
}

const defaultConfig: BreakpointConfig = {
  mobile: 1024,  // Minimum desktop resolution
  tablet: 1280,  // HD resolution
  desktop: 1440, // Full HD resolution
  wide: 1920     // 2K resolution
}

export const useLayoutBreakpoint = (config: BreakpointConfig = defaultConfig): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      
      if (width < config.mobile) {
        setBreakpoint('mobile')
      } else if (width < config.tablet) {
        setBreakpoint('tablet')
      } else if (width < config.desktop) {
        setBreakpoint('desktop')
      } else {
        setBreakpoint('wide')
      }
    }

    // Set initial breakpoint
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [config])

  return breakpoint
}

export const useIsMobile = (): boolean => {
  // Desktop app - no mobile support
  return false
}

export const useIsTablet = (): boolean => {
  // Desktop app - treat tablet as desktop
  return false
}

export const useIsDesktop = (): boolean => {
  // Desktop app - always desktop
  return true
}

export const useIsWide = (): boolean => {
  const breakpoint = useLayoutBreakpoint()
  return breakpoint === 'wide'
}
