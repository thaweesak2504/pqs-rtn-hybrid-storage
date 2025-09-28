import { useEffect, useCallback, useRef, useState } from 'react'

interface AnimationOptions {
  duration?: number
  easing?: string
  delay?: number
  onStart?: () => void
  onComplete?: () => void
}

interface NavigationAnimations {
  slideIn: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  slideOut: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  fadeIn: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  fadeOut: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  scaleIn: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  scaleOut: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  bounceIn: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  shake: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  pulse: (element: HTMLElement, options?: AnimationOptions) => Promise<void>
  isAnimating: boolean
}

/**
 * Custom hook for navigation animations
 * Provides smooth transitions and visual feedback
 */
export const useNavigationAnimations = (): NavigationAnimations => {
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRefs = useRef<Map<HTMLElement, Animation>>(new Map())

  // Default animation options
  const defaultOptions: Required<AnimationOptions> = {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    delay: 0,
    onStart: () => {},
    onComplete: () => {}
  }

  // Create animation keyframes
  const createKeyframes = useCallback((type: string, direction: 'in' | 'out' = 'in') => {
    const keyframes: Keyframe[] = []
    
    switch (type) {
      case 'slide':
        if (direction === 'in') {
          keyframes.push(
            { transform: 'translateX(-100%)', opacity: 0 },
            { transform: 'translateX(0)', opacity: 1 }
          )
        } else {
          keyframes.push(
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(-100%)', opacity: 0 }
          )
        }
        break
        
      case 'fade':
        if (direction === 'in') {
          keyframes.push({ opacity: 0 }, { opacity: 1 })
        } else {
          keyframes.push({ opacity: 1 }, { opacity: 0 })
        }
        break
        
      case 'scale':
        if (direction === 'in') {
          keyframes.push(
            { transform: 'scale(0.8)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1 }
          )
        } else {
          keyframes.push(
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(0.8)', opacity: 0 }
          )
        }
        break
        
      case 'bounce':
        keyframes.push(
          { transform: 'scale(0.3)', opacity: 0 },
          { transform: 'scale(1.05)', opacity: 1 },
          { transform: 'scale(0.9)', opacity: 1 },
          { transform: 'scale(1)', opacity: 1 }
        )
        break
        
      case 'shake':
        keyframes.push(
          { transform: 'translateX(0)' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(10px)' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(10px)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(0)' }
        )
        break
        
      case 'pulse':
        keyframes.push(
          { transform: 'scale(1)' },
          { transform: 'scale(1.05)' },
          { transform: 'scale(1)' }
        )
        break
    }
    
    return keyframes
  }, [])

  // Execute animation
  const executeAnimation = useCallback(async (
    element: HTMLElement,
    keyframes: Keyframe[],
    options: Required<AnimationOptions>
  ): Promise<void> => {
    return new Promise((resolve) => {
      // Cancel existing animation
      const existingAnimation = animationRefs.current.get(element)
      if (existingAnimation) {
        existingAnimation.cancel()
      }

      // Set initial state
      element.style.willChange = 'transform, opacity'
      
      // Create animation
      const animation = element.animate(keyframes, {
        duration: options.duration,
        easing: options.easing,
        delay: options.delay,
        fill: 'forwards'
      })

      // Store animation reference
      animationRefs.current.set(element, animation)

      // Handle animation events
      animation.addEventListener('start', () => {
        setIsAnimating(true)
        options.onStart()
      })

      animation.addEventListener('finish', () => {
        setIsAnimating(false)
        element.style.willChange = 'auto'
        animationRefs.current.delete(element)
        options.onComplete()
        resolve()
      })

      animation.addEventListener('cancel', () => {
        setIsAnimating(false)
        element.style.willChange = 'auto'
        animationRefs.current.delete(element)
        resolve()
      })
    })
  }, [])

  // Slide in animation
  const slideIn = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options }
    const keyframes = createKeyframes('slide', 'in')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Slide out animation
  const slideOut = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options }
    const keyframes = createKeyframes('slide', 'out')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Fade in animation
  const fadeIn = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options }
    const keyframes = createKeyframes('fade', 'in')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Fade out animation
  const fadeOut = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options }
    const keyframes = createKeyframes('fade', 'out')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Scale in animation
  const scaleIn = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options }
    const keyframes = createKeyframes('scale', 'in')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Scale out animation
  const scaleOut = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options }
    const keyframes = createKeyframes('scale', 'out')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Bounce in animation
  const bounceIn = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options, duration: 600 }
    const keyframes = createKeyframes('bounce', 'in')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Shake animation
  const shake = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options, duration: 500 }
    const keyframes = createKeyframes('shake', 'in')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Pulse animation
  const pulse = useCallback(async (element: HTMLElement, options: AnimationOptions = {}) => {
    const mergedOptions = { ...defaultOptions, ...options, duration: 200 }
    const keyframes = createKeyframes('pulse', 'in')
    await executeAnimation(element, keyframes, mergedOptions)
  }, [createKeyframes, executeAnimation])

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      animationRefs.current.forEach((animation) => {
        animation.cancel()
      })
      animationRefs.current.clear()
    }
  }, [])

  return {
    slideIn,
    slideOut,
    fadeIn,
    fadeOut,
    scaleIn,
    scaleOut,
    bounceIn,
    shake,
    pulse,
    isAnimating
  }
}
