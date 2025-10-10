import React, { useRef, useEffect } from 'react'
import navyLogo from '../assets/images/navy_logo.webp'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Handle ESC key without useEffect to avoid React internal error
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Handle click outside to close - similar to SearchBarDropdown
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    // Add a small delay to prevent immediate closing when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Build dialog classes - using GitHub theme like SlideBar
  const dialogClasses = [
    'bg-github-bg-tertiary',
    'border',
    'border-github-border-primary',
    'rounded-lg',
    'p-6',
    'max-w-lg',
    'mx-4',
    'shadow-github-large',
    'pointer-events-auto'
  ].join(' ')

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        ref={dialogRef}
        className={dialogClasses}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex items-center justify-center mb-4">
          <img 
            src={navyLogo} 
            alt="PQS RTN Logo"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-medium text-github-text-primary mb-2">
            ยินดีต้อนรับสู่ มาตรฐานกำลังพลกองทัพเรือ
          </h2>
          <p className="text-sm text-github-text-secondary">
            Personnel Qualification Standard : PQS
          </p>
        </div>

        {/* Version Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-github-text-secondary">PQS RTN Tauri:</span>
            <span className="text-github-text-primary font-mono">v0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-github-text-secondary">Tauri:</span>
            <span className="text-github-text-primary font-mono">v1.5.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-github-text-secondary">React:</span>
            <span className="text-github-text-primary font-mono">v18.2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-github-text-secondary">TypeScript:</span>
            <span className="text-github-text-primary font-mono">v5.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-github-text-secondary">Vite:</span>
            <span className="text-github-text-primary font-mono">v4.5.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-github-text-secondary">Tailwind CSS:</span>
            <span className="text-github-text-primary font-mono">v3.3.0</span>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-github-bg-secondary hover:bg-github-bg-hover text-github-text-primary rounded-md text-sm transition-colors border border-github-border-primary"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

export default AboutDialog
