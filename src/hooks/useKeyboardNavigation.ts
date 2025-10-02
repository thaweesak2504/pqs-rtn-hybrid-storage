import { useEffect, useCallback, useRef } from 'react'
import { useNavigationState } from './useNavigationState'
import { useNavigationHandlers } from './useNavigationHandlers'

interface KeyboardNavigationOptions {
  enabled?: boolean
  onNavigate?: (path: string) => void
}

/**
 * Custom hook for keyboard navigation support
 * Provides arrow key navigation, Enter to select, Escape to close
 */
export const useKeyboardNavigation = (
  options: KeyboardNavigationOptions = {}
) => {
  const { enabled = true } = options
  const [navigationState, navigationActions] = useNavigationState()
  const navigationHandlers = useNavigationHandlers(navigationState, navigationActions)
  
  const menuRef = useRef<HTMLDivElement>(null)
  const activeElementRef = useRef<HTMLElement | null>(null)

  // Get all focusable menu items
  const getFocusableItems = useCallback(() => {
    if (!menuRef.current) return []
    
    const focusableSelectors = [
      '[role="menuitem"]',
      '[role="menuitemradio"]', 
      '[role="menuitemcheckbox"]',
      'button[tabindex="0"]',
      'a[tabindex="0"]'
    ].join(', ')
    
    return Array.from(menuRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[]
  }, [])

  // Find current focused element index
  const getCurrentIndex = useCallback(() => {
    const focusableItems = getFocusableItems()
    const activeElement = document.activeElement as HTMLElement
    
    if (!activeElement || !menuRef.current?.contains(activeElement)) {
      return -1
    }
    
    return focusableItems.indexOf(activeElement)
  }, [getFocusableItems])

  // Focus specific element by index
  const focusElement = useCallback((index: number) => {
    const focusableItems = getFocusableItems()
    
    if (index >= 0 && index < focusableItems.length) {
      const element = focusableItems[index]
      element.focus()
      activeElementRef.current = element
      
      // Scroll into view if needed
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      })
    }
  }, [getFocusableItems])

  // Handle arrow key navigation
  const handleArrowNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const currentIndex = getCurrentIndex()
    const focusableItems = getFocusableItems()
    
    if (focusableItems.length === 0) return
    
    let newIndex = currentIndex
    
    switch (direction) {
      case 'up':
        newIndex = currentIndex > 0 ? currentIndex - 1 : focusableItems.length - 1
        break
      case 'down':
        newIndex = currentIndex < focusableItems.length - 1 ? currentIndex + 1 : 0
        break
      case 'left':
        // For horizontal navigation (future use)
        newIndex = currentIndex > 0 ? currentIndex - 1 : focusableItems.length - 1
        break
      case 'right':
        // For horizontal navigation (future use)
        newIndex = currentIndex < focusableItems.length - 1 ? currentIndex + 1 : 0
        break
    }
    
    focusElement(newIndex)
  }, [getCurrentIndex, focusElement])

  // Handle Enter key
  const handleEnterKey = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement
    
    if (!activeElement || !menuRef.current?.contains(activeElement)) return
    
    // Check if it's a menu item with data attributes
    const itemId = activeElement.getAttribute('data-item-id')
    const subItemId = activeElement.getAttribute('data-sub-item-id')
    const parentId = activeElement.getAttribute('data-parent-id')
    
    if (itemId && subItemId && parentId) {
      // Handle submenu item click
      navigationHandlers.handleSubItemClick(parentId, subItemId)
    } else if (itemId) {
      // Handle main menu item click
      if (itemId === 'signout') {
        navigationHandlers.handleSignOut()
      } else {
        navigationHandlers.handleMenuClick(itemId)
      }
    } else {
      // Fallback: trigger click event
      activeElement.click()
    }
  }, [navigationHandlers])

  // Handle Escape key
  const handleEscapeKey = useCallback(() => {
    // Close all expanded menus
    navigationActions.setExpandedMenus([])
    
    // Focus on the menu container
    if (menuRef.current) {
      const firstFocusable = menuRef.current.querySelector('[tabindex="0"]') as HTMLElement
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }
  }, [navigationActions])

  // Handle Home key
  const handleHomeKey = useCallback(() => {
    focusElement(0)
  }, [focusElement])

  // Handle End key
  const handleEndKey = useCallback(() => {
    const focusableItems = getFocusableItems()
    focusElement(focusableItems.length - 1)
  }, [focusElement, getFocusableItems])

  // Main keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return
    
    // Only handle keyboard events when menu is focused
    if (!menuRef.current?.contains(document.activeElement)) return
    
    const { key, ctrlKey, altKey, metaKey } = event
    
    // Ignore if modifier keys are pressed (except for specific shortcuts)
    if (ctrlKey || altKey || metaKey) {
      // Allow Ctrl+Home, Ctrl+End for navigation
      if (ctrlKey && (key === 'Home' || key === 'End')) {
        event.preventDefault()
        if (key === 'Home') handleHomeKey()
        if (key === 'End') handleEndKey()
      }
      return
    }
    
    switch (key) {
      case 'ArrowUp':
        event.preventDefault()
        handleArrowNavigation('up')
        break
      case 'ArrowDown':
        event.preventDefault()
        handleArrowNavigation('down')
        break
      case 'ArrowLeft':
        event.preventDefault()
        handleArrowNavigation('left')
        break
      case 'ArrowRight':
        event.preventDefault()
        handleArrowNavigation('right')
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        handleEnterKey()
        break
      case 'Escape':
        event.preventDefault()
        handleEscapeKey()
        break
      case 'Home':
        event.preventDefault()
        handleHomeKey()
        break
      case 'End':
        event.preventDefault()
        handleEndKey()
        break
      case 'Tab':
        // Allow default Tab behavior for accessibility
        break
      default:
        // Handle letter navigation (first letter of menu items)
        if (key.length === 1 && /[a-zA-Z]/.test(key)) {
          event.preventDefault()
          const focusableItems = getFocusableItems()
          const targetLetter = key.toLowerCase()
          
          // Find first item starting with the letter
          for (let i = 0; i < focusableItems.length; i++) {
            const text = focusableItems[i].textContent?.toLowerCase() || ''
            if (text.startsWith(targetLetter)) {
              focusElement(i)
              break
            }
          }
        }
        break
    }
  }, [
    enabled,
    handleArrowNavigation,
    handleEnterKey,
    handleEscapeKey,
    handleHomeKey,
    handleEndKey,
    focusElement,
    getFocusableItems
  ])

  // Set up keyboard event listeners
  useEffect(() => {
    if (!enabled) return
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  // Auto-focus first item when menu opens
  useEffect(() => {
    if (navigationState.expandedMenus.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const focusableItems = getFocusableItems()
        if (focusableItems.length > 0) {
          focusElement(0)
        }
      }, 100)
    }
  }, [navigationState.expandedMenus, focusElement, getFocusableItems])

  return {
    menuRef,
    activeElementRef,
    focusElement,
    getFocusableItems,
    isKeyboardNavigationEnabled: enabled
  }
}
