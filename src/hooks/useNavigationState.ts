import { useState, useCallback } from 'react'

export interface NavigationState {
  activeItem: string
  expandedMenus: string[]
}

export interface NavigationStateActions {
  updateState: (updates: Partial<NavigationState>) => void
  setActiveItem: (itemId: string) => void
  setExpandedMenus: (menus: string[]) => void
  toggleMenu: (menuId: string) => void
  resetState: () => void
}

/**
 * Custom hook for managing navigation state
 * Centralizes state management and provides consistent state updates
 */
export const useNavigationState = (initialState: Partial<NavigationState> = {}): [NavigationState, NavigationStateActions] => {
  const [state, setState] = useState<NavigationState>({
    activeItem: initialState.activeItem || 'home',
    expandedMenus: initialState.expandedMenus || []
  })

  const updateState = useCallback((updates: Partial<NavigationState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const setActiveItem = useCallback((itemId: string) => {
    setState(prev => ({ ...prev, activeItem: itemId }))
  }, [])

  const setExpandedMenus = useCallback((menus: string[]) => {
    setState(prev => ({ ...prev, expandedMenus: menus }))
  }, [])

  const toggleMenu = useCallback((menuId: string) => {
    setState(prev => ({
      ...prev,
      expandedMenus: prev.expandedMenus.includes(menuId)
        ? prev.expandedMenus.filter(id => id !== menuId)
        : [...prev.expandedMenus, menuId]
    }))
  }, [])

  const resetState = useCallback(() => {
    setState({
      activeItem: 'home',
      expandedMenus: []
    })
  }, [])

  const actions: NavigationStateActions = {
    updateState,
    setActiveItem,
    setExpandedMenus,
    toggleMenu,
    resetState
  }

  return [state, actions]
}
