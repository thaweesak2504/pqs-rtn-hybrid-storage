import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSlideBar } from './useSlideBar'
import { useAuth } from './useAuth'
import { 
  getRouteForItem, 
  isAdminSubItem,
  isStandaloneItem,
  type NavigationState,
  type NavigationStateActions 
} from '../config/navigationConfig'

interface NavigationHandlers {
  handleMenuClick: (itemId: string) => void
  handleSubItemClick: (itemId: string, subItemId: string) => void
  handleSignOut: () => void
}

/**
 * Custom hook for creating navigation event handlers
 * Centralizes navigation logic and provides consistent behavior
 */
export const useNavigationHandlers = (
  state: NavigationState,
  actions: NavigationStateActions
): NavigationHandlers => {
  const navigate = useNavigate()
  const { closeSlideBar } = useSlideBar()
  const { signOut } = useAuth()

  const handleMenuClick = useCallback((itemId: string) => {
    try {
      if (itemId === 'signout') {
        // Handle Sign Out specifically
        signOut()
        navigate('/home')
      } else if (isStandaloneItem(itemId)) {
        // Handle standalone menu items (Contact, Sign In)
        const route = getRouteForItem(itemId)
        if (route) {
          actions.updateState({ 
            activeItem: itemId, 
            expandedMenus: [] 
          })
          navigate(route)
          
          // Close sidebar on mobile
          if (window.innerWidth < 768) {
            closeSlideBar()
          }
        }
      } else {
        // Handle menu items with submenus (Welcome)
        actions.updateState({ 
          activeItem: itemId, 
          expandedMenus: [itemId] 
        })
        
        // Navigate to first submenu item
        if (itemId === 'welcome') {
          navigate('/home')
        }
      }
    } catch (error) {
      console.error('Navigation error in handleMenuClick:', error)
      // Fallback to home
      navigate('/home')
      actions.updateState({ 
        activeItem: 'home', 
        expandedMenus: [] 
      })
    }
  }, [navigate, actions, closeSlideBar, signOut])

  const handleSubItemClick = useCallback((itemId: string, subItemId: string) => {
    try {
      // Handle all submenu items uniformly
      const route = getRouteForItem(itemId, subItemId)
      if (route) {
        actions.updateState({ 
          activeItem: subItemId, 
          expandedMenus: [itemId] // Keep parent menu expanded
        })
        navigate(route)
        
        // Close sidebar on mobile only
        if (window.innerWidth < 768) {
          closeSlideBar()
        }
      }
    } catch (error) {
      console.error('Navigation error in handleSubItemClick:', error)
      // Fallback to home
      navigate('/home')
      actions.updateState({ 
        activeItem: 'home', 
        expandedMenus: [] 
      })
    }
  }, [navigate, actions, closeSlideBar, signOut])

  const handleSignOut = useCallback(() => {
    try {
      // This will be handled by the auth system
      // Just navigate to home after sign out
      navigate('/home')
      actions.updateState({ 
        activeItem: 'home', 
        expandedMenus: [] 
      })
    } catch (error) {
      console.error('Navigation error in handleSignOut:', error)
      navigate('/home')
    }
  }, [navigate, actions])

  return {
    handleMenuClick,
    handleSubItemClick,
    handleSignOut
  }
}
