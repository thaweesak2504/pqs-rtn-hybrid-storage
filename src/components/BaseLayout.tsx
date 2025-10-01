import React, { useState, useEffect } from 'react'
import HeaderMenuBar from './HeaderMenuBar'
import { Outlet, useNavigate } from 'react-router-dom'
import navyLogo from '../assets/images/navy_logo.webp'
import DarkModeToggle from './DarkModeToggle'
import Avatar from './ui/Avatar'
import HamburgerMenu from './HamburgerMenu'
import SlideBar from './SlideBar'
import SearchBar from './search/SearchBar'
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

  // Window visibility management to fix display issues after sleep/focus loss
  const { forceRefresh } = useWindowVisibility({
    onVisibilityChange: (visible) => {
      if (visible) {
        // Force refresh when becoming visible to fix display issues
        setTimeout(() => {
          forceRefresh()
        }, 100)
      }
    },
    onFocusChange: (focused) => {
      if (focused) {
        // Force refresh when gaining focus to fix display issues
        setTimeout(() => {
          forceRefresh()
        }, 100)
      }
    }
  })

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

  // Refresh avatar when user changes or avatar_updated_at changes
  useEffect(() => {
    if (user?.id) {
      refreshAvatar()
    }
  }, [user?.id, (user as any)?.avatar_updated_at, refreshAvatar])

  // Listen for global avatar update events
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { userId } = event.detail
      if (Number(userId) === Number(user?.id)) {
        refreshAvatar()
      }
    }

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    }
  }, [user?.id, refreshAvatar])

  // Handle loading state
  useEffect(() => {
    // Simulate loading time to prevent flash
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Set layout type
  useEffect(() => {
    setLayoutType(layoutType)
  }, [setLayoutType, layoutType])

  // Set current page based on layout type
  useEffect(() => {
    setCurrentPage(layoutType)
  }, [setCurrentPage, layoutType])

  // Control right panel based on showRightPanel prop
  useEffect(() => {
    if (!showRightPanel) {
      closeRightPanel()
    }
  }, [showRightPanel, closeRightPanel])

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
    <div className={containerClasses}>
      {/* Header - Fixed at top */}
      <header
        className="bg-github-bg-primary border-b border-github-border-primary fixed top-0 left-0 right-0 z-50 transition-colors duration-200"
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
          <div className="flex items-center h-16">
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
                  className="h-10 lg:h-12 w-auto object-contain max-h-12 min-h-10 transition-transform duration-200 ease-out hover:scale-110 hover:brightness-125 group-hover:scale-110 group-hover:brightness-125"
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

            {/* Center Section: Search Bar */}
            {showFullHeader && (
              <div className="flex-1 flex justify-center px-4" style={{ WebkitAppRegion: typeof window !== 'undefined' && window.__TAURI__ ? 'no-drag' : 'auto' } as React.CSSProperties}>
                <SearchBar />
              </div>
            )}

              {/* Right Section: Window Controls + Dark Mode + Auth */}
              <div className="flex items-center space-x-3 flex-shrink-0">
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

      {/* Main Content */}
      <main className="transition-colors duration-200">
        {/* Slide Bar */}
        <SlideBar />
        
        {/* Content Area */}
        <div 
          id="main-content"
          className="pt-16 min-h-screen"
        >
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </div>
      </main>
      
      {/* Custom Footer Content */}
      {customFooterContent}
      
      {/* Footer - Always at bottom */}
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
