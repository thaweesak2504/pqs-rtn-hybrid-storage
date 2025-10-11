import React, { useMemo } from 'react'
import { ChevronDown, ChevronRight, X, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { useSlideBar } from '../hooks/useSlideBar'
import { useAuth } from '../hooks/useAuth'
import { useNavigationState } from '../hooks/useNavigationState'
import { useNavigationHandlers } from '../hooks/useNavigationHandlers'
import { useRouterSync } from '../hooks/useRouterSync'
import { useNavigationHistory } from '../hooks/useNavigationHistory'
import Button from './ui/Button'
import { 
  MENU_ITEMS_CONFIG, 
  AUTH_MENU_ITEMS
} from '../config/navigationConfig'

const SlideBar: React.FC = () => {
  const { isOpen, closeSlideBar } = useSlideBar()
  const { isAuthenticated, signOut, user } = useAuth()
  
  // Use new navigation state management
  const [navigationState, navigationActions] = useNavigationState()
  const navigationHandlers = useNavigationHandlers(navigationState, navigationActions)
  
  // Sync with router
  useRouterSync(navigationActions)
  
  // Navigation history for back/forward buttons
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory()
  
  // Refs for focus management
  const panelRef = React.useRef<HTMLDivElement>(null)
  const closeBtnRef = React.useRef<HTMLButtonElement>(null)
  const topItemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const subItemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})

  // Memoized menu items to prevent recreation on every render
  const menuItems = useMemo(() => {
    const authMenu = isAuthenticated 
      ? AUTH_MENU_ITEMS.filter(item => item.id === 'signout')
      : AUTH_MENU_ITEMS.filter(item => item.id === 'signin' || item.id === 'register')
    
    // Filter admin menu based on authentication and role
    const filteredMenuItems = MENU_ITEMS_CONFIG.filter(item => {
      if (item.id === 'admin') {
        return isAuthenticated && user?.role === 'admin'
      }
      return true
    })
    
    return [...filteredMenuItems, ...authMenu]
  }, [isAuthenticated, user?.role])



  // Focus management: focus close button when sidebar opens; remove focus when closed
  React.useEffect(() => {
    if (isOpen) {
      // Defer to next tick to ensure the element is rendered
      const id = window.setTimeout(() => {
        closeBtnRef.current?.focus()
      }, 0)
      return () => window.clearTimeout(id)
    } else {
      // Remove focus from sidebar when it's closed to prevent aria-hidden warning
      const activeElement = document.activeElement as HTMLElement
      if (panelRef.current && panelRef.current.contains(activeElement)) {
        activeElement?.blur()
        // Move focus to body to prevent focus trap
        document.body.focus()
      }
    }
  }, [isOpen])

  // Focus trap within sidebar when open
  React.useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="search"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(el => el.offsetParent !== null)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    panel.addEventListener('keydown', handleKeyDown)
    return () => panel.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])
  

  // Function to get the correct title for the sidebar header
  const getSidebarTitle = () => {
    const activeItem = navigationState.activeItem
    
    // Check if active item is a submenu item
    const parentMenu = menuItems.find(item => 
      item.subItems?.some(subItem => subItem.id === activeItem)
    )
    
    if (parentMenu) {
      // If active item is a submenu item, show parent menu name
      return parentMenu.label
    }
    
    // Check if active item is a standalone menu item
    const standaloneMenu = menuItems.find(item => item.id === activeItem && !item.subItems)
    if (standaloneMenu) {
      return standaloneMenu.label
    }
    
    // Default fallback
    return 'Welcome'
  }

  // Enhanced toggle menu function with new architecture
  const toggleMenu = (menuId: string) => {
    const clickedItem = menuItems.find(item => item.id === menuId)
    if (clickedItem?.subItems) {
      // Handle menu items with submenus - Toggle expanded state
      const isCurrentlyExpanded = navigationState.expandedMenus.includes(menuId)
      navigationActions.updateState({ 
        // Don't change activeItem - preserve current submenu active state
        expandedMenus: isCurrentlyExpanded 
          ? navigationState.expandedMenus.filter(id => id !== menuId)
          : [...navigationState.expandedMenus, menuId]
      })
      
      // Navigate to first submenu item for Welcome menu - DISABLED
      // if (menuId === 'welcome') {
      //   navigationHandlers.handleSubItemClick(menuId, 'home')
      // }
    } else {
      // Handle standalone menu items
      if (menuId === 'signout') {
        signOut()  // AuthContext will handle navigation
      } else {
        navigationHandlers.handleMenuClick(menuId)
      }
    }
  }

  // Simplified submenu click handler using new architecture
  const handleSubItemClick = (itemId: string, subItemId: string) => {
    navigationHandlers.handleSubItemClick(itemId, subItemId)
  }

  const handleSlideBarClick = (e: React.MouseEvent) => {
    // ปิด SlideBar เมื่อคลิกพื้นที่ว่าง
    if (e.target === e.currentTarget) {
      closeSlideBar()
    }
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    // ป้องกันการปิด SlideBar เมื่อคลิกเมนู
    e.stopPropagation()
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeSlideBar}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Slide Bar */}
      <div 
        className={`
          fixed top-10 left-0 h-[calc(100vh-2.5rem)] w-64 bg-github-bg-tertiary border-r border-github-border-primary shadow-github-large z-50
          transform transition-transform duration-300 ease-in-out rounded-tr-[20px]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${!isOpen ? 'pointer-events-none' : 'pointer-events-auto'}
          md:fixed md:top-10 md:left-0 md:h-[calc(100vh-2.5rem)] md:shadow-github-large md:z-50 md:rounded-tr-[20px]
          ${isOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}
        `}
        id="sidebar-panel"
        role="complementary"
        aria-label="Sidebar navigation"
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
        {...(!isOpen && { inert: 'true' })}
        ref={panelRef}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            closeSlideBar()
          }
        }}
        onClick={handleSlideBarClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-github-border-primary" onClick={handleMenuClick}>
          <h2 id="sidebar-title" className="text-lg font-normal text-github-text-primary">
            {getSidebarTitle()}
          </h2>
          <button
            onClick={closeSlideBar}
            className="p-1 rounded-lg hover:bg-github-bg-hover hover:border-github-border-active active:bg-github-bg-hover active:border-github-border-active md:hidden transition-colors duration-200"
            aria-label="Close sidebar"
            type="button"
            ref={closeBtnRef}
          >
            <X className="w-5 h-5 text-github-text-secondary" />
          </button>
        </div>

        {/* Navigation History Controls */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-github-border-primary bg-github-bg-secondary">
          <Button
            variant="outline"
            size="small"
            onClick={goBack}
            disabled={!canGoBack}
            icon={<ChevronLeft className="w-4 h-4" />}
            iconPosition="left"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={goForward}
            disabled={!canGoForward}
            icon={<ChevronRightIcon className="w-4 h-4" />}
            iconPosition="right"
            className="flex-1"
          >
            Forward
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-3" onClick={handleMenuClick} role="navigation" aria-labelledby="sidebar-title">
          {menuItems.map((item) => (
            <div key={item.id} className="relative">
              <button
                 onClick={() => item.subItems ? toggleMenu(item.id) : navigationHandlers.handleMenuClick(item.id)}
                 className={`relative w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 focus:outline-none ${
                   // แสดง active state เฉพาะ standalone menu เท่านั้น (ไม่แสดงที่ parent menu)
                   (!item.subItems && navigationState.activeItem === item.id)
                     ? 'bg-github-bg-active'
                     : 'hover:bg-github-bg-hover active:bg-github-bg-active'
                 } ${
                   // Only show focus ring for non-Welcome menus when authenticated
                   isAuthenticated && user?.role === 'admin' && item.id === 'welcome'
                     ? 'focus-visible:ring-0'
                     : 'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-github-accent-primary focus-visible:z-10'
                 }`}
                 type="button"
                 aria-current={(!item.subItems && navigationState.activeItem === item.id) ? 'page' : undefined}
                 aria-haspopup={item.subItems ? true : undefined}
                 tabIndex={isOpen ? 0 : -1}
                 aria-expanded={item.subItems ? navigationState.expandedMenus.includes(item.id) : undefined}
                 aria-controls={item.subItems ? `submenu-${item.id}` : undefined}
                 ref={(el) => { topItemRefs.current[item.id] = el }}
                 onKeyDown={(e) => {
                   const key = e.key
                   if (!item.subItems) {
                     // Roving focus among top-level items
                     const ids = menuItems.map(m => m.id)
                     const idx = ids.indexOf(item.id)
                     if (key === 'ArrowDown') {
                       e.preventDefault()
                       const next = ids[(idx + 1) % ids.length]
                       topItemRefs.current[next]?.focus()
                     } else if (key === 'ArrowUp') {
                       e.preventDefault()
                       const prev = ids[(idx - 1 + ids.length) % ids.length]
                       topItemRefs.current[prev]?.focus()
                     } else if (key === 'Enter' || key === ' ') {
                       e.preventDefault()
                       navigationHandlers.handleMenuClick(item.id)
                     }
                   } else {
                     // Parent item with submenu
                     if (key === 'ArrowRight' || key === 'Enter' || key === ' ') {
                       e.preventDefault()
                       if (!navigationState.expandedMenus.includes(item.id)) {
                         toggleMenu(item.id)
                       }
                       const first = item.subItems[0]
                       if (first) subItemRefs.current[first.id]?.focus()
                     } else if (key === 'ArrowLeft' || key === 'Escape') {
                       e.preventDefault()
                       navigationActions.setExpandedMenus(navigationState.expandedMenus.filter(id => id !== item.id))
                     } else if (key === 'ArrowDown' || key === 'ArrowUp') {
                       // Move among top-level groups
                       const ids = menuItems.map(m => m.id)
                       const idx = ids.indexOf(item.id)
                       if (key === 'ArrowDown') {
                         e.preventDefault()
                         const next = ids[(idx + 1) % ids.length]
                         topItemRefs.current[next]?.focus()
                       } else if (key === 'ArrowUp') {
                         e.preventDefault()
                         const prev = ids[(idx - 1 + ids.length) % ids.length]
                         topItemRefs.current[prev]?.focus()
                       }
                     }
                   }
                 }}
               >
                <div className="flex items-center space-x-3">
                  <span className={`${
                    // เปลี่ยนสี icon เมื่อ parent menu active หรือเป็น standalone menu ที่ active
                    // หรือถ้าเป็น Admin Dashboard และมี submenu เปิดอยู่
                    (item.subItems && item.subItems.some(subItem => navigationState.activeItem === subItem.id)) || 
                    (!item.subItems && navigationState.activeItem === item.id)
                      ? 'text-github-text-primary'
                      : 'text-github-text-secondary'
                  }`}>
                    {item.icon}
                  </span>
                  <span className={`text-sm font-medium ${
                    // เปลี่ยนสี text เมื่อ parent menu active หรือเป็น standalone menu ที่ active
                    (item.subItems && item.subItems.some(subItem => navigationState.activeItem === subItem.id)) || 
                    (!item.subItems && navigationState.activeItem === item.id)
                      ? 'text-github-text-primary'
                      : 'text-github-text-primary'
                  }`}>
                    {item.label}
                  </span>
                </div>
                {item.subItems && (
                  <span className="text-github-text-tertiary transition-transform duration-300 ease-out">
                    {navigationState.expandedMenus.includes(item.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                )}
              </button>

              {/* Sub Menu */}
              {item.subItems && (
                <div id={`submenu-${item.id}`} role="group" aria-label={`${item.label} submenu`} className={`
                  overflow-hidden transition-all duration-300 ease-out
                  ${navigationState.expandedMenus.includes(item.id) ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}
                `}>
                  <div className="ml-8 space-y-1 pb-1">
                    {item.subItems.map((subItem) => (
                      <button
                         key={subItem.id}
                         id={`submenu-item-${subItem.id}`}
                         onClick={() => handleSubItemClick(item.id, subItem.id)}
                         tabIndex={isOpen ? 0 : -1}
                         // Prefetch removed - not needed for desktop app
                         className={`relative w-full flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-github-accent-primary focus-visible:z-10 ${
                           navigationState.activeItem === subItem.id
                             ? 'bg-github-bg-active'
                             : 'hover:bg-github-bg-hover active:bg-github-bg-active'
                         }`}
                         type="button"
                         aria-current={navigationState.activeItem === subItem.id ? 'page' : undefined}
                          ref={(el) => { subItemRefs.current[subItem.id] = el }}
                          onKeyDown={(e) => {
                            const key = e.key
                            const ids = item.subItems!.map(s => s.id)
                            const idx = ids.indexOf(subItem.id)
                            if (key === 'ArrowDown') {
                              e.preventDefault()
                              const next = ids[(idx + 1) % ids.length]
                              subItemRefs.current[next]?.focus()
                            } else if (key === 'ArrowUp') {
                              e.preventDefault()
                              const prev = ids[(idx - 1 + ids.length) % ids.length]
                              subItemRefs.current[prev]?.focus()
                            } else if (key === 'ArrowLeft') {
                              e.preventDefault()
                              // Move focus back to parent item
                              topItemRefs.current[item.id]?.focus()
                            } else if (key === 'Enter' || key === ' ') {
                              e.preventDefault()
                              handleSubItemClick(item.id, subItem.id)
                            }
                          }}
                       >
                        <span className={`${
                          navigationState.activeItem === subItem.id
                            ? 'text-github-text-primary'
                            : 'text-github-text-tertiary'
                        }`}>
                          {subItem.icon}
                        </span>
                        <span className={`text-sm ${
                          navigationState.activeItem === subItem.id
                            ? 'text-github-text-primary font-medium'
                            : 'text-github-text-secondary'
                        }`}>
                          {subItem.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </>
  )
}

export default SlideBar
