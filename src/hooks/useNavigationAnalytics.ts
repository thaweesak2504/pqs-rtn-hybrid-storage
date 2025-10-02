import { useEffect, useCallback, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export interface NavigationEvent {
  id: string
  type: 'page_view' | 'menu_click' | 'submenu_click' | 'breadcrumb_click' | 'shortcut_used'
  path: string
  label: string
  timestamp: number
  duration?: number
  metadata?: Record<string, any>
}

export interface NavigationStats {
  totalPageViews: number
  totalMenuClicks: number
  totalSubmenuClicks: number
  totalBreadcrumbClicks: number
  totalShortcutsUsed: number
  averageSessionDuration: number
  mostVisitedPages: Array<{ path: string; count: number }>
  mostUsedMenus: Array<{ menu: string; count: number }>
  userJourney: NavigationEvent[]
}

interface NavigationAnalytics {
  events: NavigationEvent[]
  stats: NavigationStats
  trackEvent: (event: Omit<NavigationEvent, 'id' | 'timestamp'>) => void
  trackPageView: (path: string, label: string) => void
  trackMenuClick: (menuId: string, label: string) => void
  trackSubmenuClick: (parentId: string, submenuId: string, label: string) => void
  trackBreadcrumbClick: (path: string, label: string) => void
  trackShortcutUsed: (shortcut: string, action: string) => void
  getStats: () => NavigationStats
  clearAnalytics: () => void
  exportAnalytics: () => string
  isTrackingEnabled: boolean
  setTrackingEnabled: (enabled: boolean) => void
}

/**
 * Custom hook for navigation analytics and tracking
 * Provides insights into user navigation patterns
 */
export const useNavigationAnalytics = (): NavigationAnalytics => {
  const location = useLocation()
  const [events, setEvents] = useState<NavigationEvent[]>([])
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true)
  const sessionStartTime = useRef<number>(Date.now())
  const lastPageViewTime = useRef<number>(Date.now())

  // Generate unique event ID
  const generateEventId = useCallback(() => {
    return `nav_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Track generic event
  const trackEvent = useCallback((event: Omit<NavigationEvent, 'id' | 'timestamp'>) => {
    if (!isTrackingEnabled) return

    const navigationEvent: NavigationEvent = {
      ...event,
      id: generateEventId(),
      timestamp: Date.now()
    }

    setEvents(prev => {
      const newEvents = [...prev, navigationEvent]
      
      // Limit events to last 1000 to prevent memory issues
      if (newEvents.length > 1000) {
        return newEvents.slice(-1000)
      }
      
      return newEvents
    })
  }, [isTrackingEnabled, generateEventId])

  // Track page view
  const trackPageView = useCallback((path: string, label: string) => {
    const currentTime = Date.now()
    const duration = currentTime - lastPageViewTime.current
    
    trackEvent({
      type: 'page_view',
      path,
      label,
      duration,
      metadata: {
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      }
    })

    lastPageViewTime.current = currentTime
  }, [trackEvent])

  // Track menu click
  const trackMenuClick = useCallback((menuId: string, label: string) => {
    trackEvent({
      type: 'menu_click',
      path: location.pathname,
      label,
      metadata: {
        menuId,
        currentPath: location.pathname
      }
    })
  }, [trackEvent, location.pathname])

  // Track submenu click
  const trackSubmenuClick = useCallback((parentId: string, submenuId: string, label: string) => {
    trackEvent({
      type: 'submenu_click',
      path: location.pathname,
      label,
      metadata: {
        parentId,
        submenuId,
        currentPath: location.pathname
      }
    })
  }, [trackEvent, location.pathname])

  // Track breadcrumb click
  const trackBreadcrumbClick = useCallback((path: string, label: string) => {
    trackEvent({
      type: 'breadcrumb_click',
      path,
      label,
      metadata: {
        fromPath: location.pathname,
        toPath: path
      }
    })
  }, [trackEvent, location.pathname])

  // Track shortcut used
  const trackShortcutUsed = useCallback((shortcut: string, action: string) => {
    trackEvent({
      type: 'shortcut_used',
      path: location.pathname,
      label: `Shortcut: ${shortcut}`,
      metadata: {
        shortcut,
        action,
        currentPath: location.pathname
      }
    })
  }, [trackEvent, location.pathname])

  // Calculate statistics
  const getStats = useCallback((): NavigationStats => {

    // Count events by type
    const pageViews = events.filter(e => e.type === 'page_view')
    const menuClicks = events.filter(e => e.type === 'menu_click')
    const submenuClicks = events.filter(e => e.type === 'submenu_click')
    const breadcrumbClicks = events.filter(e => e.type === 'breadcrumb_click')
    const shortcutsUsed = events.filter(e => e.type === 'shortcut_used')

    // Calculate most visited pages
    const pageCounts = pageViews.reduce((acc, event) => {
      acc[event.path] = (acc[event.path] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostVisitedPages = Object.entries(pageCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate most used menus
    const menuCounts = menuClicks.reduce((acc, event) => {
      const menuId = event.metadata?.menuId || 'unknown'
      acc[menuId] = (acc[menuId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostUsedMenus = Object.entries(menuCounts)
      .map(([menu, count]) => ({ menu, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate average session duration
    const totalDuration = pageViews.reduce((sum, event) => sum + (event.duration || 0), 0)
    const averageSessionDuration = pageViews.length > 0 ? totalDuration / pageViews.length : 0

    return {
      totalPageViews: pageViews.length,
      totalMenuClicks: menuClicks.length,
      totalSubmenuClicks: submenuClicks.length,
      totalBreadcrumbClicks: breadcrumbClicks.length,
      totalShortcutsUsed: shortcutsUsed.length,
      averageSessionDuration,
      mostVisitedPages,
      mostUsedMenus,
      userJourney: events.slice(-50) // Last 50 events
    }
  }, [events])

  // Clear analytics data
  const clearAnalytics = useCallback(() => {
    setEvents([])
    sessionStartTime.current = Date.now()
    lastPageViewTime.current = Date.now()
  }, [])

  // Export analytics data
  const exportAnalytics = useCallback(() => {
    const stats = getStats()
    const exportData = {
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - sessionStartTime.current,
      stats,
      events: events.slice(-100) // Last 100 events
    }
    
    return JSON.stringify(exportData, null, 2)
  }, [getStats, events])

  // Set tracking enabled state
  const setTrackingEnabled = useCallback((enabled: boolean) => {
    setIsTrackingEnabled(enabled)
  }, [])

  // Auto-track page views
  useEffect(() => {
    if (isTrackingEnabled) {
      const path = location.pathname
      const label = path === '/' ? 'Home' : path.charAt(1).toUpperCase() + path.slice(2)
      trackPageView(path, label)
    }
  }, [location.pathname, isTrackingEnabled, trackPageView])

  // Load analytics from localStorage on mount
  useEffect(() => {
    try {
      const savedEvents = localStorage.getItem('navigation_analytics')
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents)
        if (Array.isArray(parsedEvents)) {
          setEvents(parsedEvents)
        }
      }
    } catch (error) {
      console.error('Failed to load analytics from localStorage:', error)
    }
  }, [])

  // Save analytics to localStorage
  useEffect(() => {
    if (events.length > 0) {
      try {
        localStorage.setItem('navigation_analytics', JSON.stringify(events))
      } catch (error) {
        console.error('Failed to save analytics to localStorage:', error)
      }
    }
  }, [events])

  return {
    events,
    stats: getStats(),
    trackEvent,
    trackPageView,
    trackMenuClick,
    trackSubmenuClick,
    trackBreadcrumbClick,
    trackShortcutUsed,
    getStats,
    clearAnalytics,
    exportAnalytics,
    isTrackingEnabled,
    setTrackingEnabled
  }
}
