import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export interface NavigationHistoryItem {
  id: string
  path: string
  label: string
  timestamp: number
  state?: any
}

interface NavigationHistory {
  history: NavigationHistoryItem[]
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
  goToHistoryItem: (id: string) => void
  addToHistory: (item: Omit<NavigationHistoryItem, 'id' | 'timestamp'>) => void
  clearHistory: () => void
  getHistoryItem: (id: string) => NavigationHistoryItem | undefined
  getRecentHistory: (limit?: number) => NavigationHistoryItem[]
}

/**
 * Custom hook for navigation history management
 * Provides back/forward navigation and history tracking
 */
export const useNavigationHistory = (): NavigationHistory => {
  const location = useLocation()
  const navigate = useNavigate()
  const [history, setHistory] = useState<NavigationHistoryItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const isNavigatingRef = useRef(false)

  // Generate unique ID for history item
  const generateId = useCallback(() => {
    return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Get label for path
  const getPathLabel = useCallback((path: string): string => {
    const pathLabels: Record<string, string> = {
      '/': 'Home',
      '/home': 'Home',
      '/history': 'History',
      '/team': 'Team',
      '/contact': 'Contact Us',
      '/signin': 'Sign In',
      '/register': 'Registration',
      '/dashboard': 'Dashboard',
      '/dashboard/contact': 'Dashboard - Contact'
    }

    return pathLabels[path] || path.charAt(1).toUpperCase() + path.slice(2)
  }, [])

  // Add item to history
  const addToHistory = useCallback((item: Omit<NavigationHistoryItem, 'id' | 'timestamp'>) => {
    const historyItem: NavigationHistoryItem = {
      ...item,
      id: generateId(),
      timestamp: Date.now()
    }

    setHistory(prev => {
      // Remove any items after current index (when navigating back and then forward)
      const newHistory = prev.slice(0, currentIndex + 1)
      
      // Add new item
      newHistory.push(historyItem)
      
      // Limit history size (keep last 50 items)
      if (newHistory.length > 50) {
        return newHistory.slice(-50)
      }
      
      return newHistory
    })

    setCurrentIndex(prev => {
      const newIndex = prev + 1
      return Math.min(newIndex, 49) // Max index for 50 items
    })
  }, [generateId, currentIndex])

  // Go back in history
  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      isNavigatingRef.current = true
      const newIndex = currentIndex - 1
      const historyItem = history[newIndex]
      
      if (historyItem) {
        setCurrentIndex(newIndex)
        navigate(historyItem.path, { state: historyItem.state })
      }
    }
  }, [currentIndex, history, navigate])

  // Go forward in history
  const goForward = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isNavigatingRef.current = true
      const newIndex = currentIndex + 1
      const historyItem = history[newIndex]
      
      if (historyItem) {
        setCurrentIndex(newIndex)
        navigate(historyItem.path, { state: historyItem.state })
      }
    }
  }, [currentIndex, history, navigate])

  // Go to specific history item
  const goToHistoryItem = useCallback((id: string) => {
    const index = history.findIndex(item => item.id === id)
    if (index !== -1) {
      isNavigatingRef.current = true
      setCurrentIndex(index)
      const historyItem = history[index]
      navigate(historyItem.path, { state: historyItem.state })
    }
  }, [history, navigate])

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])

  // Get history item by ID
  const getHistoryItem = useCallback((id: string) => {
    return history.find(item => item.id === id)
  }, [history])

  // Get recent history items
  const getRecentHistory = useCallback((limit: number = 10) => {
    return history
      .slice(0, currentIndex + 1)
      .reverse()
      .slice(0, limit)
  }, [history, currentIndex])

  // Check if can go back/forward
  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < history.length - 1

  // Handle location changes
  useEffect(() => {
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false
      return
    }

    // Add current location to history if it's not already there
    const currentPath = location.pathname
    const currentLabel = getPathLabel(currentPath)
    
    // Check if this path is already the current item in history
    const currentHistoryItem = history[currentIndex]
    if (currentHistoryItem && currentHistoryItem.path === currentPath) {
      return
    }

    // Add to history
    addToHistory({
      path: currentPath,
      label: currentLabel,
      state: location.state
    })
  }, [location.pathname, location.state, addToHistory, getPathLabel, history, currentIndex])

  // Initialize history with current location
  useEffect(() => {
    if (history.length === 0) {
      const currentPath = location.pathname
      const currentLabel = getPathLabel(currentPath)
      
      addToHistory({
        path: currentPath,
        label: currentLabel,
        state: location.state
      })
    }
  }, [location.pathname, location.state, addToHistory, getPathLabel, history.length])

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!isNavigatingRef.current) {
        // Browser navigation occurred, update current index
        const currentPath = location.pathname
        const index = history.findIndex(item => item.path === currentPath)
        if (index !== -1) {
          setCurrentIndex(index)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [location.pathname, history])

  return {
    history,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    goToHistoryItem,
    addToHistory,
    clearHistory,
    getHistoryItem,
    getRecentHistory
  }
}
