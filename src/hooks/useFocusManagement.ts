import { useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'

interface FocusManagementOptions {
  restoreFocusOnRouteChange?: boolean
  trapFocusInModal?: boolean
  focusFirstElementOnMount?: boolean
}

/**
 * Custom hook for advanced focus management
 * Provides focus restoration, focus trapping, and accessibility features
 */
export const useFocusManagement = (options: FocusManagementOptions = {}) => {
  const {
    restoreFocusOnRouteChange = true,
    trapFocusInModal = false,
    focusFirstElementOnMount = false
  } = options

  const location = useLocation()
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const focusableElementsRef = useRef<HTMLElement[]>([])
  const containerRef = useRef<HTMLElement | null>(null)

  // Get all focusable elements within a container
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'details > summary',
      'audio[controls]',
      'video[controls]',
      '[role="button"]:not([disabled])',
      '[role="menuitem"]',
      '[role="menuitemradio"]',
      '[role="menuitemcheckbox"]',
      '[role="tab"]',
      '[role="option"]'
    ].join(', ')

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[]
  }, [])

  // Check if element is visible and focusable
  const isElementFocusable = useCallback((element: HTMLElement): boolean => {
    if (!element) return false
    
    // Check if element is hidden
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false
    }
    
    // Check if element is in viewport
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return false
    }
    
    return true
  }, [])

  // Focus first focusable element
  const focusFirstElement = useCallback((container?: HTMLElement) => {
    const targetContainer = container || containerRef.current
    if (!targetContainer) return false
    
    const focusableElements = getFocusableElements(targetContainer)
    const visibleElements = focusableElements.filter(isElementFocusable)
    
    if (visibleElements.length > 0) {
      visibleElements[0].focus()
      return true
    }
    
    return false
  }, [getFocusableElements, isElementFocusable])

  // Focus last focusable element
  const focusLastElement = useCallback((container?: HTMLElement) => {
    const targetContainer = container || containerRef.current
    if (!targetContainer) return false
    
    const focusableElements = getFocusableElements(targetContainer)
    const visibleElements = focusableElements.filter(isElementFocusable)
    
    if (visibleElements.length > 0) {
      visibleElements[visibleElements.length - 1].focus()
      return true
    }
    
    return false
  }, [getFocusableElements, isElementFocusable])

  // Focus next element
  const focusNextElement = useCallback((currentElement?: HTMLElement) => {
    const targetContainer = containerRef.current
    if (!targetContainer) return false
    
    const focusableElements = getFocusableElements(targetContainer)
    const visibleElements = focusableElements.filter(isElementFocusable)
    
    if (visibleElements.length === 0) return false
    
    const current = currentElement || document.activeElement as HTMLElement
    const currentIndex = visibleElements.indexOf(current)
    
    if (currentIndex === -1) {
      // Current element not found, focus first
      return focusFirstElement(targetContainer)
    }
    
    const nextIndex = (currentIndex + 1) % visibleElements.length
    visibleElements[nextIndex].focus()
    return true
  }, [getFocusableElements, isElementFocusable, focusFirstElement])

  // Focus previous element
  const focusPreviousElement = useCallback((currentElement?: HTMLElement) => {
    const targetContainer = containerRef.current
    if (!targetContainer) return false
    
    const focusableElements = getFocusableElements(targetContainer)
    const visibleElements = focusableElements.filter(isElementFocusable)
    
    if (visibleElements.length === 0) return false
    
    const current = currentElement || document.activeElement as HTMLElement
    const currentIndex = visibleElements.indexOf(current)
    
    if (currentIndex === -1) {
      // Current element not found, focus last
      return focusLastElement(targetContainer)
    }
    
    const prevIndex = currentIndex === 0 ? visibleElements.length - 1 : currentIndex - 1
    visibleElements[prevIndex].focus()
    return true
  }, [getFocusableElements, isElementFocusable, focusLastElement])

  // Store current focus before route change
  const storeCurrentFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement !== document.body) {
      previousFocusRef.current = activeElement
    }
  }, [])

  // Restore focus after route change
  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && isElementFocusable(previousFocusRef.current)) {
      previousFocusRef.current.focus()
      return true
    }
    
    // Fallback: focus first element in container
    return focusFirstElement()
  }, [isElementFocusable, focusFirstElement])

  // Focus trap for modals
  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (!trapFocusInModal || !containerRef.current) return
    
    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements(containerRef.current)
      const visibleElements = focusableElements.filter(isElementFocusable)
      
      if (visibleElements.length === 0) return
      
      const firstElement = visibleElements[0]
      const lastElement = visibleElements[visibleElements.length - 1]
      const activeElement = document.activeElement as HTMLElement
      
      if (event.shiftKey) {
        // Shift + Tab: focus last element if currently on first
        if (activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: focus first element if currently on last
        if (activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }
  }, [trapFocusInModal, getFocusableElements, isElementFocusable])

  // Set up focus trap event listener
  useEffect(() => {
    if (!trapFocusInModal) return
    
    document.addEventListener('keydown', trapFocus)
    
    return () => {
      document.removeEventListener('keydown', trapFocus)
    }
  }, [trapFocusInModal, trapFocus])

  // Handle route changes
  useEffect(() => {
    if (!restoreFocusOnRouteChange) return
    
    // Store focus before route change
    storeCurrentFocus()
    
    // Restore focus after route change
    const timer = setTimeout(() => {
      restoreFocus()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [location.pathname, restoreFocusOnRouteChange, storeCurrentFocus, restoreFocus])

  // Focus first element on mount
  useEffect(() => {
    if (focusFirstElementOnMount) {
      const timer = setTimeout(() => {
        focusFirstElement()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [focusFirstElementOnMount, focusFirstElement])

  // Update focusable elements when container changes
  useEffect(() => {
    if (containerRef.current) {
      focusableElementsRef.current = getFocusableElements(containerRef.current)
    }
  }, [getFocusableElements])

  return {
    containerRef,
    focusFirstElement,
    focusLastElement,
    focusNextElement,
    focusPreviousElement,
    storeCurrentFocus,
    restoreFocus,
    getFocusableElements,
    isElementFocusable,
    focusableElements: focusableElementsRef.current
  }
}
