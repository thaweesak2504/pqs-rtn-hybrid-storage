import React from 'react'

interface HeaderProps {
  logo?: string
  logoAlt?: string
  title: string
  subtitle?: string
  description?: string
  metrics?: Array<{
    value: string
    label: string
  }>
  className?: string
}

const Header: React.FC<HeaderProps> = ({
  logo,
  logoAlt = "Logo",
  title,
  subtitle,
  description,
  metrics,
  className = ""
}) => {
  return (
    <div className={`text-center mb-16 ${className}`}>
      {/* Logo */}
      {logo && (
        <div className="flex justify-center mb-6">
          <img 
            src={logo} 
            alt={logoAlt}
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain"
          />
        </div>
      )}
      
      {/* Title and Subtitle */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium text-github-text-primary mb-2">
          {title}
        </h1>
        {subtitle && (
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-normal text-github-text-secondary">
            {subtitle}
          </h2>
        )}
      </div>
      
      {/* Description */}
      {description && (
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-github-text-secondary leading-relaxed mb-6 max-w-2xl mx-auto font-light">
          {description}
        </p>
      )}

      {/* Metrics */}
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 max-w-xl mx-auto">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-normal text-github-text-primary mb-1">
                {metric.value}
              </div>
              <div className="text-xs sm:text-sm md:text-base lg:text-lg font-light text-github-text-secondary">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Header
