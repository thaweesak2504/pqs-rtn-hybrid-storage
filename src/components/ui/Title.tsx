import React from 'react'

interface TitleProps {
  title: string
  subtitle?: string
  description?: string
  align?: 'left' | 'center' | 'right'
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const Title: React.FC<TitleProps> = ({
  title,
  subtitle,
  description,
  align = 'center',
  size = 'medium',
  className = ''
}) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }

  const sizeClasses = {
    small: {
      title: 'text-base sm:text-lg font-medium',
      subtitle: 'text-xs sm:text-sm font-normal',
      description: 'text-xs font-light'
    },
    medium: {
      title: 'text-lg sm:text-xl font-medium',
      subtitle: 'text-sm sm:text-base font-normal',
      description: 'text-xs sm:text-sm font-light'
    },
    large: {
      title: 'text-xl sm:text-2xl font-medium',
      subtitle: 'text-base sm:text-lg font-normal',
      description: 'text-sm sm:text-base font-light'
    }
  }

  return (
    <div className={`${alignmentClasses[align]} ${className}`}>
      {/* Main Title */}
      <h1 className={`${sizeClasses[size].title} text-github-text-primary mb-2 sm:mb-3`}>
        {title}
      </h1>
      
      {/* Subtitle */}
      {subtitle && (
        <h2 className={`${sizeClasses[size].subtitle} text-github-text-secondary mb-3 sm:mb-4`}>
          {subtitle}
        </h2>
      )}
      
      {/* Description */}
      {description && (
        <p className={`${sizeClasses[size].description} text-github-text-secondary leading-relaxed max-w-3xl ${align === 'center' ? 'mx-auto' : ''}`}>
          {description}
        </p>
      )}
    </div>
  )
}

export default Title
