import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigationState } from './useNavigationState'

export interface ShortcutConfig {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  category: 'navigation' | 'menu' | 'utility'
}

interface NavigationShortcuts {
  shortcuts: ShortcutConfig[]
  addShortcut: (shortcut: ShortcutConfig) => void
  removeShortcut: (key: string) => void
  clearShortcuts: () => void
  isShortcutEnabled: boolean
  setShortcutEnabled: (enabled: boolean) => void
}

/**
 * Custom hook for navigation shortcuts and hotkeys
 * Provides keyboard shortcuts for common navigation actions
 */
export const useNavigationShortcuts = (): NavigationShortcuts => {
  const navigate = useNavigate()
  const [navigationState, navigationActions] = useNavigationState()
  // navigationHandlers removed - using direct navigationActions instead
  
  const shortcutsRef = useRef<ShortcutConfig[]>([])
  const isEnabledRef = useRef(true)

  // Default shortcuts
  const defaultShortcuts: ShortcutConfig[] = [
    {
      key: 'h',
      ctrlKey: true,
      action: () => navigate('/home'),
      description: 'Go to Home',
      category: 'navigation'
    },
    {
      key: 't',
      ctrlKey: true,
      action: () => navigate('/team'),
      description: 'Go to Team',
      category: 'navigation'
    },
    {
      key: 'y',
      ctrlKey: true,
      action: () => navigate('/history'),
      description: 'Go to History',
      category: 'navigation'
    },
    {
      key: 'c',
      ctrlKey: true,
      action: () => navigate('/contact'),
      description: 'Go to Contact',
      category: 'navigation'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => navigate('/signin'),
      description: 'Go to Sign In',
      category: 'navigation'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => navigate('/register'),
      description: 'Go to Registration',
      category: 'navigation'
    },
    {
      key: 'w',
      ctrlKey: true,
      action: () => {
        // Toggle Welcome menu
        const isExpanded = navigationState.expandedMenus.includes('welcome')
        if (isExpanded) {
          navigationActions.setExpandedMenus([])
        } else {
          navigationActions.setExpandedMenus(['welcome'])
        }
      },
      description: 'Toggle Welcome Menu',
      category: 'menu'
    },
    {
      key: 'Escape',
      action: () => {
        // Close all menus
        navigationActions.setExpandedMenus([])
      },
      description: 'Close All Menus',
      category: 'menu'
    },
    {
      key: '?',
      action: () => {
        // Show shortcuts help (can be implemented later)
      },
      description: 'Show Shortcuts Help',
      category: 'utility'
    }
  ]

  // Initialize shortcuts
  useEffect(() => {
    shortcutsRef.current = [...defaultShortcuts]
  }, [])

  // Add custom shortcut
  const addShortcut = useCallback((shortcut: ShortcutConfig) => {
    shortcutsRef.current = [...shortcutsRef.current, shortcut]
  }, [])

  // Remove shortcut
  const removeShortcut = useCallback((key: string) => {
    shortcutsRef.current = shortcutsRef.current.filter(shortcut => shortcut.key !== key)
  }, [])

  // Clear all shortcuts
  const clearShortcuts = useCallback(() => {
    shortcutsRef.current = []
  }, [])

  // Set shortcut enabled state
  const setShortcutEnabled = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled
  }, [])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabledRef.current) return

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      return shortcut.key === event.key &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.metaKey === event.metaKey
    })

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      
      try {
        matchingShortcut.action()
      } catch (error) {
        console.error('Shortcut action error:', error)
      }
    }
  }, [])

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return {
    shortcuts: shortcutsRef.current,
    addShortcut,
    removeShortcut,
    clearShortcuts,
    isShortcutEnabled: isEnabledRef.current,
    setShortcutEnabled
  }
}
