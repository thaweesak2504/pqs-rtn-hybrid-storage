import React from 'react'

interface CardProps {
  children?: React.ReactNode
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  size?: 'small' | 'medium' | 'large'
  hover?: boolean
  className?: string
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  variant = 'default',
  size = 'medium',
  hover = false,
  className = '',
  onClick
}) => {
  const variantClasses = {
    default: 'bg-white dark:bg-github-bg-tertiary border border-github-border-primary',
    elevated: 'bg-white dark:bg-github-bg-tertiary shadow-lg border border-github-border-primary',
    outlined: 'bg-transparent border-2 border-github-border-primary',
    filled: 'bg-github-bg-secondary dark:bg-github-bg-secondary border border-github-border-primary'
  }

  const sizeClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8'
  }

  // Typography classes matching Title component
  const titleClasses = {
    small: 'text-base sm:text-lg font-medium',
    medium: 'text-lg sm:text-xl font-medium',
    large: 'text-xl sm:text-2xl font-medium'
  }

  const subtitleClasses = {
    small: 'text-xs sm:text-sm font-normal',
    medium: 'text-sm sm:text-base font-normal',
    large: 'text-base sm:text-lg font-normal'
  }

  const descriptionClasses = {
    small: 'text-xs font-light',
    medium: 'text-xs sm:text-sm font-light',
    large: 'text-sm sm:text-base font-light'
  }

  const hoverClasses = hover ? 'hover:shadow-md hover:border-github-border-active transition-all duration-200' : ''
  const cursorClass = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${hoverClasses}
        ${cursorClass}
        rounded-lg
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      {(title || subtitle || icon) && (
        <div className="mb-4">
          {icon && (
            <div className="mb-3">
              {icon}
            </div>
          )}
          {title && (
            <h3 className={`${titleClasses[size]} text-github-text-primary mb-1`}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={`${subtitleClasses[size]} text-github-text-secondary`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className={`${descriptionClasses[size]} text-github-text-secondary leading-relaxed`}>
        {children}
      </div>
    </div>
  )
}

export default Card
