import React, { useState, useEffect, useCallback } from 'react'
import HeaderMenuBar from './HeaderMenuBar'
import { Outlet, useNavigate } from 'react-router-dom'
import navyLogo from '../assets/images/navy_logo.webp'
import DarkModeToggle from './DarkModeToggle'
import Avatar from './ui/Avatar'
import HamburgerMenu from './HamburgerMenu'
import SlideBar from './SlideBar'
import SearchBarDropdown from './search/SearchBarDropdown'
import Footer from './Footer'
import Breadcrumb from './Breadcrumb'
import WindowControls from './WindowControls'
import UserProfilePanel from './UserProfilePanel'
import { useAuth } from '../hooks/useAuth'
import { useLayout } from '../contexts/LayoutContext'
import { useHybridAvatar } from '../hooks/useHybridAvatar'
import { useWindowVisibility } from '../hooks/useWindowVisibility'
import { LogIn } from 'lucide-react'
import RouteTransition from './ui/RouteTransition'

// Phase 1.2: Custom hooks for better organization
import { useAvatarSync } from '../hooks/useAvatarSync'
import { useLayoutTypeSync } from '../hooks/useLayoutTypeSync'
import { useRightPanelControl } from '../hooks/useRightPanelControl'
import { useWindowVisibilityRefresh } from '../hooks/useWindowVisibilityRefresh'

interface BaseLayoutProps {
  /** Layout type for context */
  layoutType?: 'pqs'
  /** Whether to show the right slide panel */
  showRightPanel?: boolean
  /** Custom logo click handler */
  onLogoClick?: () => void
  /** Custom header content */
  customHeaderContent?: React.ReactNode
  /** Custom footer content */
  customFooterContent?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

const BaseLayout: React.FC<BaseLayoutProps> = ({
  layoutType = 'pqs',
  showRightPanel = false,
  onLogoClick,
  customHeaderContent,
  customFooterContent,
  className = ''
}) => {
  
  const [isLoading, setIsLoading] = useState(true)

  const { isAuthenticated, user, handleAvatarLoadError } = useAuth() as any
  const navigate = useNavigate()
  const { 
    setLayoutType,
    setCurrentPage,
    isRightPanelOpen,
    closeRightPanel,
    toggleRightPanel
  } = useLayout()
  
  // Get avatar from hybrid system
  const { avatar: hybridAvatar, refreshAvatar } = useHybridAvatar({ 
    userId: user?.id ? Number(user.id) : 0,
    autoLoad: !!user?.id
  })

  // ✅ Phase 1.2: Window visibility management with stable references
  const { forceRefresh } = useWindowVisibility({})
  
  useWindowVisibilityRefresh({
    forceRefresh,
    refreshDelay: 100
  })

  // ✅ Phase 1.2: Avatar refresh on user change with stable callback
  const handleRefreshAvatar = useCallback(() => {
    if (user?.id) {
      refreshAvatar()
    }
  }, [user?.id, refreshAvatar])

  useEffect(() => {
    handleRefreshAvatar()
  }, [user?.id, (user as any)?.avatar_updated_at, handleRefreshAvatar])

  // ✅ Phase 1.2: Avatar sync with custom hook (replaces complex useEffect)
  useAvatarSync(user?.id, handleRefreshAvatar)

  // ✅ Phase 1.2: Layout type sync with custom hook
  useLayoutTypeSync(layoutType, setLayoutType, setCurrentPage)

  // ✅ Phase 1.2: Right panel control with custom hook
  useRightPanelControl(showRightPanel, closeRightPanel)

  // Handle loading state
  useEffect(() => {
    // Simulate loading time to prevent flash
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Default logo click handler
  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick()
    } else {
      // Default behavior - always go to Hero (Home) page
      navigate('/home')
      setCurrentPage('home')
    }
  }

  // Desktop-first layout adjustments
  const showFullHeader = true // Always show full header on desktop

  // Build container classes
  const containerClasses = [
    'min-h-screen',
    'bg-github-bg-primary',
    'transition-colors',
    'duration-200',
    isLoading ? 'opacity-0' : 'opacity-100',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={`${containerClasses} resize-container resize-optimized flex flex-col h-screen overflow-hidden`}>
      {/* Header - Fixed at top (won't scroll) */}
      <header
        className="bg-github-bg-primary border-b border-github-border-primary flex-shrink-0 z-[70] transition-colors duration-200"
        style={{
          WebkitAppRegion: typeof window !== 'undefined' && window.__TAURI__ ? 'drag' : 'auto'
        } as React.CSSProperties}
        onMouseDown={async (e) => {
          // Don't start dragging if clicking on interactive elements
          const target = e.target as HTMLElement
          const isInteractiveElement = target.closest('button, a, input, select, textarea, [role="button"]')
          
          if (isInteractiveElement) {
            return // Don't start dragging
          }
          
          if (typeof window !== 'undefined' && window.__TAURI__) {
            // Try to use Tauri API for dragging
            try {
              const { getCurrent } = await import('@tauri-apps/api/window')
              const currentWindow = getCurrent()
              
              // Start dragging using Tauri API
              await currentWindow.startDragging()
            } catch (error) {
              // Ignore drag error
            }
          }
        }}
      >
        <div className="w-full px-6 lg:px-8">
          <div className="flex items-center h-10">
            {/* Left Section: Hamburger + Logo + Title + MenuBar */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div><HamburgerMenu /></div>

              {/* Logo Container */}
              <button
                type="button"
                onClick={handleLogoClick}
                className="group relative flex-shrink-0 overflow-visible p-0 m-0 bg-transparent border-0"
                aria-label="Go to Home"
              >
                <img
                  src={navyLogo}
                  alt="PQS RTN Logo"
                  className="h-8 lg:h-10 w-auto object-contain max-h-10 min-h-8 transition-transform duration-200 ease-out hover:scale-110 hover:brightness-125 group-hover:scale-110 group-hover:brightness-125"
                />
              </button>

              {/* App Title */}
              <div className="flex items-center">
                <h1 className="text-sm font-normal text-github-text-primary ml-2">
                  Pqs Rtn
                </h1>
              </div>

              {/* Breadcrumb - ต่อจาก PQS RTN */}
              <div className="flex-shrink-0 ml-3" style={{ WebkitAppRegion: typeof window !== 'undefined' && window.__TAURI__ ? 'no-drag' : 'auto' } as React.CSSProperties}>
                <Breadcrumb variant="default" />
              </div>

              {showFullHeader && (
                <>
                  {/* Divider between breadcrumb and menubar */}
                  <div
                    className="mx-2 w-px h-6 bg-github-border-primary"
                    aria-hidden="true"
                  />
                  <div style={{ WebkitAppRegion: typeof window !== 'undefined' && window.__TAURI__ ? 'no-drag' : 'auto' } as React.CSSProperties}><HeaderMenuBar /></div>
                </>
              )}
            </div>

              {/* Right Section: Window Controls + Dark Mode + Search + Auth */}
              <div className="flex items-center space-x-3 flex-shrink-0 ml-auto">
                {/* Search Dropdown */}
                {showFullHeader && (
                  <div style={{ WebkitAppRegion: typeof window !== 'undefined' && window.__TAURI__ ? 'no-drag' : 'auto' } as React.CSSProperties}>
                    <SearchBarDropdown onRightPanelOpen={isRightPanelOpen} />
                  </div>
                )}
                {/* Window Controls - Only show in Tauri environment */}
                <WindowControls />
                
                <DarkModeToggle />

                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        toggleRightPanel()
                      }}
                      className="p-1 rounded-lg hover:bg-github-bg-hover hover:border-github-border-active active:bg-github-bg-hover active:border-github-border-active transition-colors duration-200"
                    >
                      <span className="sr-only">User menu</span>
                      <Avatar
                        src={hybridAvatar || undefined}
                        version={(user as any)?.avatar_updated_at || null}
                        name={user?.name}
                        size="sm"
                        className="hover:border-github-border-active transition-all duration-200"
                        onImageError={() => { try { handleAvatarLoadError?.() } catch (error) {
                            console.warn('Error:', error);
                          } }}
                      />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      navigate('/signin')
                      setCurrentPage('signin')
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-github-bg-hover transition-colors duration-200"
                  >
                    <LogIn className="w-4 h-4 text-github-text-primary" />
                    <span className="text-sm text-github-text-primary">Sign In</span>
                  </button>
                )}

              </div>
          </div>
        </div>
      </header>

      {/* Custom Header Content */}
      {customHeaderContent}

      {/* Main Content - Scrollable area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden main-with-footer transition-colors duration-200">
        {/* Slide Bar */}
        <SlideBar />
        
        {/* Content Area */}
        <div 
          id="main-content"
          className="min-h-full"
        >
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </div>
        
        {/* Custom Footer Content */}
        {customFooterContent}
      </main>
      
      {/* Footer - Fixed at bottom */}
      <Footer />
      
      {/* Right Panel - User Profile */}
      {isAuthenticated && (
        <UserProfilePanel 
          isOpen={isRightPanelOpen}
          onClose={closeRightPanel}
        />
      )}
    </div>
  )
}

export default BaseLayout
