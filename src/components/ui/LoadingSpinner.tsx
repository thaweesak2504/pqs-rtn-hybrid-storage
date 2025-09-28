import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'accent' | 'white'
  text?: string
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'text-github-accent-primary',
    secondary: 'text-github-text-secondary',
    accent: 'text-github-accent-secondary',
    white: 'text-white'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <Loader2 
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`} 
      />
      {text && (
        <p className={`text-sm text-github-text-secondary ${size === 'xl' ? 'text-base' : ''}`}>
          {text}
        </p>
      )}
    </div>
  )
}

export default LoadingSpinner
