import React from 'react'
import navyLogo from '../assets/images/navy_logo.webp'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  // Handle ESC key without useEffect to avoid React internal error
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  // Build dialog classes
  const dialogClasses = [
    'bg-white',
    'dark:bg-gray-800',
    'border',
    'border-gray-300',
    'dark:border-gray-600',
    'rounded-lg',
    'p-6',
    'max-w-lg',
    'mx-4',
    'shadow-lg',
    'pointer-events-auto'
  ].join(' ')

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
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
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            ยินดีต้อนรับสู่ มาตรฐานกำลังพลกองทัพเรือ
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Personnel Qualification Standard : PQS
          </p>
        </div>

        {/* Version Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">PQS RTN Tauri:</span>
            <span className="text-gray-900 dark:text-gray-100 font-mono">v0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Tauri:</span>
            <span className="text-gray-900 dark:text-gray-100 font-mono">v1.5.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">React:</span>
            <span className="text-gray-900 dark:text-gray-100 font-mono">v18.2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">TypeScript:</span>
            <span className="text-gray-900 dark:text-gray-100 font-mono">v5.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Vite:</span>
            <span className="text-gray-900 dark:text-gray-100 font-mono">v4.5.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Tailwind CSS:</span>
            <span className="text-gray-900 dark:text-gray-100 font-mono">v3.3.0</span>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md text-sm transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

export default AboutDialog
