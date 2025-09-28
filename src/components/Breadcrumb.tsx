import React from 'react'
import { useLocation } from 'react-router-dom'
import { 
  MENU_ITEMS_CONFIG, 
  AUTH_MENU_ITEMS,
  getStateForRoute,
  type MenuItemConfig 
} from '../config/navigationConfig'

interface BreadcrumbProps {
  variant?: 'default' | 'compact' | 'minimal'
  className?: string
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  variant = 'default',
  className = ''
}) => {
  const location = useLocation()
  const routeState = getStateForRoute(location.pathname)
  const activeItem = routeState.activeItem

  // Function to get the current page name and icon
  const getCurrentPageInfo = () => {
    // Check if active item is a submenu item
    const parentMenu = MENU_ITEMS_CONFIG.find(item => 
      item.subItems?.some(subItem => subItem.id === activeItem)
    )
    
    if (parentMenu) {
      // Find the specific submenu item
      const subItem = parentMenu.subItems?.find(subItem => subItem.id === activeItem)
      if (subItem) {
        return {
          name: subItem.label,
          icon: subItem.icon
        }
      }
    }
    
    // Check if active item is a standalone menu item
    const standaloneMenu = MENU_ITEMS_CONFIG.find(item => item.id === activeItem && !item.subItems)
    if (standaloneMenu) {
      return {
        name: standaloneMenu.label,
        icon: standaloneMenu.icon
      }
    }
    
    // Check auth menu items
    const authMenu = AUTH_MENU_ITEMS.find(item => item.id === activeItem)
    if (authMenu) {
      return {
        name: authMenu.label,
        icon: authMenu.icon
      }
    }
    
    // Default fallback
    return {
      name: 'Home',
      icon: <span className="w-4 h-4">🏠</span>
    }
  }

  const { name, icon } = getCurrentPageInfo()

  const renderBreadcrumb = () => {
    switch (variant) {
      case 'compact':
        return (
          <div className={`flex items-center space-x-2 text-xs ${className}`}>
            <span className="text-github-text-secondary">
              {icon}
            </span>
            <span className="text-github-text-primary font-light">
              {name}
            </span>
          </div>
        )

      case 'minimal':
        return (
          <div className={`text-sm text-github-text-primary font-light ${className}`}>
            {name}
          </div>
        )

      default:
        return (
          <div className={`flex items-center space-x-2 ${className}`}>
            <span className="text-github-text-secondary">
              {icon}
            </span>
            <span className="text-sm text-github-text-primary font-light">
              {name}
            </span>
          </div>
        )
    }
  }

  return (
    <nav 
      className="flex items-center"
      aria-label="Breadcrumb"
      role="navigation"
    >
      {renderBreadcrumb()}
    </nav>
  )
}

export default Breadcrumb
