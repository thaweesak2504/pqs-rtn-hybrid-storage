import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useNavigationState } from './useNavigationState'

export interface BreadcrumbItem {
  id: string
  label: string
  path: string
  icon?: React.ReactNode
  isClickable: boolean
  isActive: boolean
}

interface BreadcrumbNavigation {
  breadcrumbs: BreadcrumbItem[]
  addBreadcrumb: (item: Omit<BreadcrumbItem, 'isActive'>) => void
  removeBreadcrumb: (id: string) => void
  clearBreadcrumbs: () => void
  navigateToBreadcrumb: (path: string) => void
  getBreadcrumbPath: (itemId: string) => string | null
}

/**
 * Custom hook for breadcrumb navigation
 * Provides hierarchical navigation and path tracking
 */
export const useBreadcrumbNavigation = (): BreadcrumbNavigation => {
  const location = useLocation()
  const navigate = useNavigate()
  const [navigationState] = useNavigationState()
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<BreadcrumbItem[]>([])

  // Generate breadcrumbs from current route
  const generateBreadcrumbs = useCallback((): BreadcrumbItem[] => {
    const path = location.pathname
    const breadcrumbs: BreadcrumbItem[] = []

    // Always start with Home
    breadcrumbs.push({
      id: 'home',
      label: 'Home',
      path: '/home',
      isClickable: true,
      isActive: path === '/home' || path === '/'
    })

    // Add route-specific breadcrumbs
    switch (path) {
      case '/history':
        breadcrumbs.push({
          id: 'history',
          label: 'History',
          path: '/history',
          isClickable: true,
          isActive: true
        })
        break

      case '/team':
        breadcrumbs.push({
          id: 'team',
          label: 'Team',
          path: '/team',
          isClickable: true,
          isActive: true
        })
        break

      case '/contact':
        breadcrumbs.push({
          id: 'contact',
          label: 'Contact Us',
          path: '/contact',
          isClickable: true,
          isActive: true
        })
        break

      case '/signin':
        breadcrumbs.push({
          id: 'signin',
          label: 'Sign In',
          path: '/signin',
          isClickable: true,
          isActive: true
        })
        break

      case '/register':
        breadcrumbs.push({
          id: 'register',
          label: 'Registration',
          path: '/register',
          isClickable: true,
          isActive: true
        })
        break

      default:
        // Handle nested routes
        if (path.startsWith('/dashboard/')) {
          breadcrumbs.push({
            id: 'dashboard',
            label: 'Dashboard',
            path: '/dashboard',
            isClickable: true,
            isActive: false
          })

          // Add specific dashboard sub-routes
          const subPath = path.replace('/dashboard/', '')
          switch (subPath) {
            case 'contact':
              breadcrumbs.push({
                id: 'dashboard-contact',
                label: 'Contact',
                path: '/dashboard/contact',
                isClickable: true,
                isActive: true
              })
              break
            default:
              breadcrumbs.push({
                id: 'dashboard-sub',
                label: subPath.charAt(0).toUpperCase() + subPath.slice(1),
                path: path,
                isClickable: true,
                isActive: true
              })
          }
        }
        break
    }

    return breadcrumbs
  }, [location.pathname])

  // Combine generated and custom breadcrumbs
  const breadcrumbs = useMemo(() => {
    const generated = generateBreadcrumbs()
    const combined = [...generated, ...customBreadcrumbs]
    
    // Remove duplicates and ensure proper ordering
    const unique = combined.reduce((acc, current) => {
      const existing = acc.find(item => item.id === current.id)
      if (!existing) {
        acc.push(current)
      }
      return acc
    }, [] as BreadcrumbItem[])

    // Update active state
    return unique.map(item => ({
      ...item,
      isActive: item.path === location.pathname
    }))
  }, [generateBreadcrumbs, customBreadcrumbs, location.pathname])

  // Add custom breadcrumb
  const addBreadcrumb = useCallback((item: Omit<BreadcrumbItem, 'isActive'>) => {
    setCustomBreadcrumbs(prev => {
      // Check if breadcrumb already exists
      const exists = prev.some(breadcrumb => breadcrumb.id === item.id)
      if (exists) return prev

      return [...prev, { ...item, isActive: false }]
    })
  }, [])

  // Remove custom breadcrumb
  const removeBreadcrumb = useCallback((id: string) => {
    setCustomBreadcrumbs(prev => prev.filter(item => item.id !== id))
  }, [])

  // Clear all custom breadcrumbs
  const clearBreadcrumbs = useCallback(() => {
    setCustomBreadcrumbs([])
  }, [])

  // Navigate to breadcrumb path
  const navigateToBreadcrumb = useCallback((path: string) => {
    navigate(path)
  }, [navigate])

  // Get breadcrumb path by item ID
  const getBreadcrumbPath = useCallback((itemId: string): string | null => {
    const breadcrumb = breadcrumbs.find(item => item.id === itemId)
    return breadcrumb ? breadcrumb.path : null
  }, [breadcrumbs])

  // Auto-generate breadcrumbs when route changes
  useEffect(() => {
    // Clear custom breadcrumbs when navigating to main routes
    const mainRoutes = ['/home', '/history', '/team', '/contact', '/signin', '/register']
    if (mainRoutes.includes(location.pathname)) {
      clearBreadcrumbs()
    }
  }, [location.pathname, clearBreadcrumbs])

  // Update breadcrumbs when navigation state changes
  useEffect(() => {
    // This effect can be used to sync breadcrumbs with navigation state
    // For example, updating breadcrumbs based on active menu items
  }, [navigationState])

  return {
    breadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    clearBreadcrumbs,
    navigateToBreadcrumb,
    getBreadcrumbPath
  }
}
