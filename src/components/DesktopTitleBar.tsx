import React from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import DesktopService from '../services/desktopService'

/**
 * Desktop Title Bar Component
 * Provides native window controls for desktop applications
 */
const DesktopTitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false)

  // Check window state on mount
  React.useEffect(() => {
    const checkWindowState = async () => {
      const maximized = await DesktopService.isMaximized()
      setIsMaximized(maximized)
    }
    checkWindowState()
  }, [])

  const handleMinimize = async () => {
    await DesktopService.minimizeWindow()
  }

  const handleMaximize = async () => {
    if (isMaximized) {
      await DesktopService.unmaximizeWindow()
      setIsMaximized(false)
    } else {
      await DesktopService.maximizeWindow()
      setIsMaximized(true)
    }
  }

  const handleClose = async () => {
    await DesktopService.closeWindow()
  }

  return (
    <div className="flex items-center justify-end h-8 bg-github-bg-secondary border-b border-github-border-primary">
      {/* Window Controls */}
      <div className="flex items-center">
        {/* Minimize Button */}
        <button
          onClick={handleMinimize}
          className="p-1 hover:bg-github-bg-hover transition-colors group"
          aria-label="Minimize window"
        >
          <Minus className="w-4 h-4 text-github-text-secondary group-hover:text-github-text-primary" />
        </button>

        {/* Maximize/Restore Button */}
        <button
          onClick={handleMaximize}
          className="p-1 hover:bg-github-bg-hover transition-colors group"
          aria-label={isMaximized ? "Restore window" : "Maximize window"}
        >
          {isMaximized ? (
            <Square className="w-4 h-4 text-github-text-secondary group-hover:text-github-text-primary" />
          ) : (
            <Maximize2 className="w-4 h-4 text-github-text-secondary group-hover:text-github-text-primary" />
          )}
        </button>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-1 hover:bg-red-500 hover:text-white transition-colors group"
          aria-label="Close window"
        >
          <X className="w-4 h-4 text-github-text-secondary group-hover:text-white" />
        </button>
      </div>
    </div>
  )
}

export default DesktopTitleBar
