import React, { useState, useEffect } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'

const WindowControls: React.FC = () => {
  const [maximized, setMaximized] = useState(false)
  const [windowApi, setWindowApi] = useState<any>(null)
  
  useEffect(() => {
    const initWindowApi = async () => {
      try {
        // Check if Tauri API is available
        if (typeof window !== 'undefined' && window.__TAURI__) {
          const { getCurrent } = await import('@tauri-apps/api/window')
          const currentWindow = getCurrent()
          setWindowApi(currentWindow)
          
          // Maximize window on startup
          try {
            await currentWindow.maximize()
            setMaximized(true)
          } catch (error) {
            // Ignore maximize error
          }
        } else {
          setWindowApi(null)
        }
      } catch (error) {
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
        setMaximized(prev => !prev)
      } catch (err) { 
        // Ignore error
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
    <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' }}>
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
        aria-label={maximized ? 'Restore' : 'Maximize'} 
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
        {maximized ? <Copy className="h-4 w-4" /> : <Square className="h-3.5 w-3.5" />}
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
