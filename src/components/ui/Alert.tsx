import React from 'react'
import { X, AlertTriangle, Shield, Info, AlertCircle } from 'lucide-react'

interface AlertProps {
  type: 'error' | 'warning' | 'info' | 'success'
  title?: string
  message: string
  showCloseButton?: boolean
  onClose?: () => void
  className?: string
}

const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  showCloseButton = true,
  onClose,
  className = ''
}) => {
  const alertStyles = {
    error: {
      bgColor: 'bg-github-bg-danger',
      borderColor: 'border-github-border-primary',
      textColor: 'text-github-text-primary',
      iconColor: 'text-github-accent-danger',
      titleColor: 'text-github-text-primary'
    },
    warning: {
      bgColor: 'bg-github-bg-warning',
      borderColor: 'border-github-border-primary',
      textColor: 'text-github-text-primary',
      iconColor: 'text-github-accent-warning',
      titleColor: 'text-github-text-primary'
    },
    info: {
      bgColor: 'bg-github-bg-info',
      borderColor: 'border-github-border-primary',
      textColor: 'text-github-text-primary',
      iconColor: 'text-github-accent-info',
      titleColor: 'text-github-text-primary'
    },
    success: {
      bgColor: 'bg-github-bg-success',
      borderColor: 'border-github-border-primary',
      textColor: 'text-github-text-primary',
      iconColor: 'text-github-accent-success',
      titleColor: 'text-github-text-primary'
    }
  }

  const config = alertStyles[type]
  const IconComponent = type === 'error' ? AlertCircle : type === 'warning' ? AlertTriangle : type === 'info' ? Info : Shield

  return (
    <div className={`
      relative p-4 rounded-lg border ${config.bgColor} ${config.borderColor} 
      shadow-sm transition-all duration-200 hover:shadow-md
      ${className}
    `}>
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${config.titleColor} mb-1`}>
            {title}
          </h4>
          {message && (
            <p className={`text-sm ${config.textColor} leading-relaxed`}>
              {message}
            </p>
          )}
        </div>

        {/* Close Button */}
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className={`
              p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 
              transition-colors duration-200 ${config.textColor}
            `}
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Alert
