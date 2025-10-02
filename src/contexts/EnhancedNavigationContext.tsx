import React, { createContext, useContext, ReactNode } from 'react'
import { useNavigationState } from '../hooks/useNavigationState'
import { useNavigationHandlers } from '../hooks/useNavigationHandlers'
import { useRouterSync } from '../hooks/useRouterSync'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useFocusManagement } from '../hooks/useFocusManagement'
import { useNavigationAnimations } from '../hooks/useNavigationAnimations'
import { useBreadcrumbNavigation } from '../hooks/useBreadcrumbNavigation'
import { useNavigationHistory } from '../hooks/useNavigationHistory'
import { useNavigationAnalytics } from '../hooks/useNavigationAnalytics'
import { useResponsiveNavigation } from '../hooks/useResponsiveNavigation'

interface EnhancedNavigationContextValue {
  // Core navigation
  navigationState: ReturnType<typeof useNavigationState>[0]
  navigationActions: ReturnType<typeof useNavigationState>[1]
  navigationHandlers: ReturnType<typeof useNavigationHandlers>
  
  // Advanced features
  keyboardNavigation: ReturnType<typeof useKeyboardNavigation>
  focusManagement: ReturnType<typeof useFocusManagement>
  animations: ReturnType<typeof useNavigationAnimations>
  breadcrumbs: ReturnType<typeof useBreadcrumbNavigation>
  history: ReturnType<typeof useNavigationHistory>
  analytics: ReturnType<typeof useNavigationAnalytics>
  responsive: ReturnType<typeof useResponsiveNavigation>
}

const EnhancedNavigationContext = createContext<EnhancedNavigationContextValue | null>(null)

interface EnhancedNavigationProviderProps {
  children: ReactNode
}

/**
 * Enhanced Navigation Context Provider
 * Provides all navigation-related hooks and state to child components
 */
export const EnhancedNavigationProvider: React.FC<EnhancedNavigationProviderProps> = ({ children }) => {
  // Core navigation hooks
  const [navigationState, navigationActions] = useNavigationState()
  const navigationHandlers = useNavigationHandlers(navigationState, navigationActions)
  useRouterSync(navigationActions)
  
  // Advanced navigation hooks
  const keyboardNavigation = useKeyboardNavigation({ enabled: true })
  const focusManagement = useFocusManagement({
    restoreFocusOnRouteChange: true,
    focusFirstElementOnMount: true
  })
  const animations = useNavigationAnimations()
  const breadcrumbs = useBreadcrumbNavigation()
  const history = useNavigationHistory()
  const analytics = useNavigationAnalytics()
  const responsive = useResponsiveNavigation()

  const value: EnhancedNavigationContextValue = {
    navigationState,
    navigationActions,
    navigationHandlers,
    keyboardNavigation,
    focusManagement,
    animations,
    breadcrumbs,
    history,
    analytics,
    responsive
  }

  return (
    <EnhancedNavigationContext.Provider value={value}>
      {children}
    </EnhancedNavigationContext.Provider>
  )
}

/**
 * Hook to use the enhanced navigation context
 * Throws an error if used outside of EnhancedNavigationProvider
 */
export const useEnhancedNavigation = (): EnhancedNavigationContextValue => {
  const context = useContext(EnhancedNavigationContext)
  
  if (!context) {
    throw new Error('useEnhancedNavigation must be used within an EnhancedNavigationProvider')
  }
  
  return context
}

export default EnhancedNavigationContext
