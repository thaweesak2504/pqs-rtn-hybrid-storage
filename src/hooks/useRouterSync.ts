import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getStateForRoute, type NavigationStateActions } from '../config/navigationConfig'

/**
 * Custom hook for synchronizing navigation state with router
 * Handles URL changes and updates navigation state accordingly
 */
export const useRouterSync = (actions: NavigationStateActions) => {
  const location = useLocation()

  useEffect(() => {
    try {
      const path = location.pathname
      const state = getStateForRoute(path)
      
      // Update only activeItem, don't touch expandedMenus at all
      actions.updateState({
        activeItem: state.activeItem
        // Don't include expandedMenus - preserve current state
      })
    } catch (error) {
      console.error('Router sync error:', error)
      // Fallback to home state
      actions.updateState({
        activeItem: 'home'
        // Don't include expandedMenus - preserve current state
      })
    }
  }, [location.pathname]) // Remove actions from dependency array to prevent infinite loop
}
