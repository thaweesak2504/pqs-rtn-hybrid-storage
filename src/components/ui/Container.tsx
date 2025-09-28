import React from 'react'

interface ContainerProps {
  children: React.ReactNode
  size?: 'small' | 'medium' | 'large' | 'full'
  padding?: 'none' | 'small' | 'medium' | 'large'
  className?: string
}

const Container: React.FC<ContainerProps> = ({
  children,
  size = 'medium',
  padding = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'max-w-4xl',
    medium: 'max-w-6xl hd:max-w-7xl fhd:max-w-8xl 2k:max-w-9xl',
    large: 'max-w-7xl hd:max-w-8xl fhd:max-w-9xl 2k:max-w-10xl 4k:max-w-11xl',
    full: 'max-w-full'
  }

  const paddingClasses = {
    none: '',
    small: 'px-6',
    medium: 'px-6 hd:px-8',
    large: 'px-8 hd:px-12 fhd:px-16'
  }

  return (
    <div className={`mx-auto ${sizeClasses[size]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}

export default Container
