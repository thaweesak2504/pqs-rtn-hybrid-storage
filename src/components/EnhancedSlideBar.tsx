import React, { useMemo, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useSlideBar } from '../hooks/useSlideBar'
import { useAuth } from '../hooks/useAuth'
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
import { 
  MENU_ITEMS_CONFIG, 
  AUTH_MENU_ITEMS
} from '../config/navigationConfig'

/**
 * Enhanced SlideBar component with advanced navigation features
 * Includes keyboard navigation, animations, analytics, and responsive design
 */
const EnhancedSlideBar: React.FC = () => {
  const { isOpen, closeSlideBar } = useSlideBar()
  const { isAuthenticated } = useAuth()
  
  // Core navigation hooks
  const [navigationState, navigationActions] = useNavigationState()
  const navigationHandlers = useNavigationHandlers(navigationState, navigationActions)
  useRouterSync(navigationActions)
  
  // Advanced navigation hooks
  const { menuRef, isKeyboardNavigationEnabled } = useKeyboardNavigation({
    enabled: true
  })
  
  const { 
    containerRef
  } = useFocusManagement({
    restoreFocusOnRouteChange: true,
    focusFirstElementOnMount: true
  })
  
  const { 
    slideIn, 
    fadeIn, 
    fadeOut, 
    pulse
  } = useNavigationAnimations()
  
  const { breadcrumbs, navigateToBreadcrumb } = useBreadcrumbNavigation()
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory()
  const { 
    trackMenuClick, 
    trackSubmenuClick, 
    trackPageView, 
    isTrackingEnabled 
  } = useNavigationAnalytics()
  
  const { 
    isMobile, 
    isTablet, 
    isDesktop, 
    isTouchDevice, 
    isReducedMotion,
    screenWidth 
  } = useResponsiveNavigation()

  // Refs for DOM elements
  const panelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const topItemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const subItemRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Memoized menu items
  const menuItems = useMemo(() => {
    const authMenu = isAuthenticated 
      ? AUTH_MENU_ITEMS.filter(item => item.id === 'signout')
      : AUTH_MENU_ITEMS.filter(item => item.id === 'signin')
    
    return [...MENU_ITEMS_CONFIG, ...authMenu]
  }, [isAuthenticated])

  // Enhanced menu click handler with analytics
  const handleMenuClick = async (itemId: string, label: string) => {
    try {
      // Track analytics
      if (isTrackingEnabled) {
        trackMenuClick(itemId, label)
      }

      // Handle navigation
      if (itemId === 'signout') {
        navigationHandlers.handleSignOut()
      } else {
        navigationHandlers.handleMenuClick(itemId)
      }

      // Add animation feedback
      if (!isReducedMotion) {
        const element = topItemRefs.current[itemId]
        if (element) {
          await pulse(element, { duration: 150 })
        }
      }

      // Close sidebar on mobile
      if (isMobile) {
        closeSlideBar()
      }
    } catch (error) {
      console.error('Menu click error:', error)
    }
  }

  // Enhanced submenu click handler with analytics
  const handleSubItemClick = async (parentId: string, subItemId: string, label: string) => {
    try {
      // Track analytics
      if (isTrackingEnabled) {
        trackSubmenuClick(parentId, subItemId, label)
      }

      // Handle navigation
      navigationHandlers.handleSubItemClick(parentId, subItemId)

      // Add animation feedback
      if (!isReducedMotion) {
        const element = subItemRefs.current[subItemId]
        if (element) {
          await pulse(element, { duration: 150 })
        }
      }

      // Close sidebar on mobile
      if (isMobile) {
        closeSlideBar()
      }
    } catch (error) {
      console.error('Submenu click error:', error)
    }
  }

  // Enhanced toggle menu with animations
  const handleToggleMenu = async (menuId: string) => {
    try {
      const isExpanded = navigationState.expandedMenus.includes(menuId)
      
      if (isExpanded) {
        // Close menu with animation
        if (!isReducedMotion) {
          const submenuElement = panelRef.current?.querySelector(`[data-menu-id="${menuId}"] .submenu`)
          if (submenuElement) {
            await fadeOut(submenuElement as HTMLElement, { duration: 200 })
          }
        }
        navigationActions.setExpandedMenus([])
      } else {
        // Open menu with animation
        navigationActions.setExpandedMenus([menuId])
        
        if (!isReducedMotion) {
          // Wait for DOM update then animate
          setTimeout(async () => {
            const submenuElement = panelRef.current?.querySelector(`[data-menu-id="${menuId}"] .submenu`)
            if (submenuElement) {
              await fadeIn(submenuElement as HTMLElement, { duration: 200 })
            }
          }, 50)
        }
      }
    } catch (error) {
      console.error('Toggle menu error:', error)
    }
  }

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (path: string, label: string) => {
    navigateToBreadcrumb(path)
    if (isTrackingEnabled) {
      trackPageView(path, label)
    }
  }

  // Handle history navigation
  const handleHistoryNavigation = (direction: 'back' | 'forward') => {
    if (direction === 'back' && canGoBack) {
      goBack()
    } else if (direction === 'forward' && canGoForward) {
      goForward()
    }
  }

  // Focus management when sidebar opens/closes
  useEffect(() => {
    if (isOpen) {
      // Focus close button when sidebar opens
      setTimeout(() => {
        closeBtnRef.current?.focus()
      }, 100)
    } else {
      // Remove focus when sidebar closes
      if (document.activeElement && panelRef.current?.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur()
      }
    }
  }, [isOpen])

  // Responsive behavior
  useEffect(() => {
    if (isDesktop && !isOpen) {
      // Auto-open on desktop if user prefers
      // This can be controlled by user preference
    }
  }, [isDesktop, isOpen])

  // Animation on mount
  useEffect(() => {
    if (isOpen && !isReducedMotion) {
      slideIn(panelRef.current!, { duration: 300 })
    }
  }, [isOpen, slideIn, isReducedMotion])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="fixed inset-y-0 left-0 z-50 w-64 bg-github-bg-primary border-r border-github-border-primary shadow-lg"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Enhanced Header with History Navigation */}
      <div className="flex items-center justify-between p-4 border-b border-github-border-primary">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-github-text-primary">
            {navigationState.activeItem === 'contact' ? 'Contact Us' : 'Welcome'}
          </h2>
          
          {/* History Navigation Buttons */}
          <div className="flex space-x-1">
            <button
              onClick={() => handleHistoryNavigation('back')}
              disabled={!canGoBack}
              className="p-1 rounded hover:bg-github-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go back"
              title="Go back (Ctrl+B)"
            >
              ←
            </button>
            <button
              onClick={() => handleHistoryNavigation('forward')}
              disabled={!canGoForward}
              className="p-1 rounded hover:bg-github-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go forward"
              title="Go forward (Ctrl+F)"
            >
              →
            </button>
          </div>
        </div>
        
        <button
          ref={closeBtnRef}
          onClick={closeSlideBar}
          className="p-2 rounded-lg hover:bg-github-bg-hover focus:outline-none focus:ring-2 focus:ring-github-accent-primary"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5 text-github-text-secondary" />
        </button>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 1 && (
        <div className="p-4 border-b border-github-border-primary">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((breadcrumb, index) => (
                <li key={breadcrumb.id} className="flex items-center">
                  {index > 0 && <span className="mx-2 text-github-text-tertiary">/</span>}
                  <button
                    onClick={() => handleBreadcrumbClick(breadcrumb.path, breadcrumb.label)}
                    className={`hover:text-github-text-primary ${
                      breadcrumb.isActive 
                        ? 'text-github-text-primary font-medium' 
                        : 'text-github-text-secondary'
                    }`}
                    disabled={!breadcrumb.isClickable}
                  >
                    {breadcrumb.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}

      {/* Main Navigation Menu */}
      <div
        ref={menuRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        role="menu"
        aria-label="Navigation menu"
      >
        {menuItems.map((item) => (
          <div key={item.id} data-menu-id={item.id}>
            <button
              ref={(el) => (topItemRefs.current[item.id] = el)}
              onClick={() => {
                if (item.subItems) {
                  handleToggleMenu(item.id)
                } else {
                  handleMenuClick(item.id, item.label)
                }
              }}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ${
                (!item.subItems && navigationState.activeItem === item.id)
                  ? 'bg-github-bg-active text-github-text-primary'
                  : 'hover:bg-github-bg-hover text-github-text-primary'
              }`}
              role="menuitem"
              aria-expanded={item.subItems ? navigationState.expandedMenus.includes(item.id) : undefined}
              aria-haspopup={item.subItems ? 'menu' : undefined}
              data-item-id={item.id}
              tabIndex={0}
            >
              <div className="flex items-center space-x-3">
                <span className="text-github-text-secondary">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </div>
              
              {item.subItems && (
                <span className="text-github-text-tertiary">
                  {navigationState.expandedMenus.includes(item.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </span>
              )}
            </button>

            {/* Submenu */}
            {item.subItems && navigationState.expandedMenus.includes(item.id) && (
              <div className="submenu ml-6 mt-2 space-y-1">
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    ref={(el) => (subItemRefs.current[subItem.id] = el)}
                    onClick={() => handleSubItemClick(item.id, subItem.id, subItem.label)}
                    className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200 ${
                      navigationState.activeItem === subItem.id
                        ? 'bg-github-bg-active text-github-text-primary'
                        : 'hover:bg-github-bg-hover text-github-text-secondary'
                    }`}
                    role="menuitem"
                    data-item-id={subItem.id}
                    data-sub-item-id={subItem.id}
                    data-parent-id={item.id}
                    tabIndex={0}
                  >
                    <span className="text-github-text-tertiary">
                      {subItem.icon}
                    </span>
                    <span>{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer with Analytics Info */}
      <div className="p-4 border-t border-github-border-primary">
        <div className="text-xs text-github-text-tertiary space-y-1">
          <div>Screen: {screenWidth}px</div>
          <div>Device: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</div>
          <div>Touch: {isTouchDevice ? 'Yes' : 'No'}</div>
          {isTrackingEnabled && (
            <div>Analytics: Enabled</div>
          )}
          {isKeyboardNavigationEnabled && (
            <div>Keyboard: Enabled</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnhancedSlideBar
