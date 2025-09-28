import React from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface RightPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  position?: 'right' | 'left'
  width?: string
  height?: string
  showBackdrop?: boolean
  className?: string
}

const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  width = 'w-64',
  height = 'h-[calc(100vh-4rem)]',
  showBackdrop = true,
  className = ''
}) => {
  const isLeft = position === 'left'

  const handlePanelClick = (e: React.MouseEvent) => {
    // ปิดเมื่อ Click ภายในพื้นที่ว่างของ Panel
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleContentClick = (e: React.MouseEvent) => {
    // ปิดเมื่อ Click ภายในพื้นที่ว่างของ Content
    if (e.target === e.currentTarget) {
      onClose()
    }
    e.stopPropagation()
  }

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div 
          className={`fixed inset-0 bg-black/50 z-40 transition-all duration-300 ease-out ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        />
      )}
      
                   {/* Panel */}
               <div
                 className={`fixed top-16 ${position === 'left' ? 'left-0' : 'right-0'} ${height} ${width} bg-github-bg-primary shadow-github-large z-50 transform transition-all duration-300 ease-out ${className} ${
                   isOpen ? 'translate-x-0' : 'translate-x-full'
                 } ${
                   position === 'right' ? 'border-l border-github-border-primary' : ''
                 } ${
                   position === 'left' ? 'border-r border-github-border-primary' : ''
                 }`}
                 onClick={handlePanelClick}
               >
                 {/* Header */}
                   <div 
            className="flex items-center justify-between p-4 border-b border-github-border-primary bg-github-bg-secondary"
            onClick={handleContentClick}
          >
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary"
              aria-label="Close panel"
            >
              {isLeft ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <h3 className="text-lg font-normal text-github-text-primary">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="p-4 overflow-y-auto h-[calc(100%-5rem)]"
          onClick={handleContentClick}
        >
          {children}
        </div>
      </div>
    </>
  )
}

export default RightPanel
