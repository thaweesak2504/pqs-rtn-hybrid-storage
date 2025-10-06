import React, { useState, useEffect } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { useWindowVisibility } from '../hooks/useWindowVisibility'

const WindowControls: React.FC = () => {
  const [windowApi, setWindowApi] = useState<any>(null)
  
  // Use the window visibility hook (maximize tracking disabled to prevent crashes)
  useWindowVisibility({
    onMaximizeChange: (_maximized) => {
      // State tracking disabled to prevent crashes
    }
  })
  
  useEffect(() => {
    const initWindowApi = async () => {
      try {
        // Check if Tauri API is available
        if (typeof window !== 'undefined' && window.__TAURI__) {
          const { getCurrent } = await import('@tauri-apps/api/window')
          const currentWindow = getCurrent()
          setWindowApi(currentWindow)
          
          // Maximize window on startup (moved from Rust to prevent memory issues)
          try {
            await currentWindow.maximize()
          } catch (error) {
            console.warn('Failed to maximize on startup:', error)
          }
        } else {
          setWindowApi(null)
        }
      } catch (error) {
        console.warn('Failed to initialize window API:', error)
        setWindowApi(null)
      }
    }
    
    initWindowApi()
  }, [])
  
  const buttonClass = 'h-8 w-10 grid place-items-center hover:bg-github-bg-hover active:bg-github-bg-active transition-colors duration-200 text-github-text-primary rounded'
  
  const handleMinimize = () => {
    if (windowApi) {
      windowApi.minimize().catch(() => {})
    }
  }
  
  const handleMaximize = async () => {
    if (windowApi) {
      try {
        await windowApi.toggleMaximize()
        
        // Removed force UI update to prevent memory corruption
        // The UI will update through the useWindowVisibility hook
      } catch (err) {
        console.warn('Failed to toggle maximize:', err)
        // Don't crash, just log the error
      }
    }
  }
  
  const handleClose = () => {
    if (windowApi) {
      windowApi.close().catch(() => {})
    }
  }
  
  // Only render in Tauri environment
  if (!windowApi) {
    return null
  }
  
  return (
    <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button 
        className={buttonClass} 
        aria-label="Minimize" 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleMinimize()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <Minus className="h-4 w-4" />
      </button>
      
      <button 
        className={buttonClass} 
        aria-label="Maximize" 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleMaximize()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <Square className="h-3.5 w-3.5" />
      </button>
      
      <button 
        className={`${buttonClass} hover:bg-red-600/20 hover:border-red-600/50`} 
        aria-label="Close" 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleClose()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default WindowControls
