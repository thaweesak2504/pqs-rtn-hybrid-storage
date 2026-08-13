import React from 'react'
import { COMMAND_BUTTON_FOCUS } from './buttonStyles'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  loadingText?: React.ReactNode
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  'data-state'?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  'data-state': dataState,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const variantClasses = {
    primary: 'bg-github-bg-active text-github-text-primary border border-github-border-primary hover:bg-github-bg-hover hover:border-github-border-active active:bg-github-bg-hover active:border-github-border-active',
    secondary: 'bg-github-text-primary text-github-bg-primary hover:opacity-90 active:opacity-75',
    outline: 'bg-transparent border border-github-border-primary text-github-text-primary hover:bg-github-bg-hover hover:border-github-border-active active:bg-github-bg-hover active:border-github-border-active',
    ghost: 'bg-transparent text-github-text-secondary hover:text-github-text-primary hover:bg-github-bg-hover active:bg-github-bg-hover',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
  }

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  }

  const disabledClasses = disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

  const widthClasses = fullWidth ? 'w-full' : ''

  return (
    <button
      ref={ref}
      {...props}
      type={type}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabledClasses}
        ${widthClasses}
        font-normal
        rounded-lg
        transition-all
        duration-200
        ${COMMAND_BUTTON_FOCUS}
        transform
        hover:scale-[1.02]
        active:scale-[0.98]
        ${className}
      `}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-state={loading ? 'loading' : dataState}
    >
      <span className="flex items-center justify-center space-x-2">
        {/* Loading Spinner */}
        {loading && (
          <svg aria-hidden="true" focusable="false" className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}

        {/* Left Icon */}
        {icon && iconPosition === 'left' && !loading && (
          <span className="flex-shrink-0">{icon}</span>
        )}

        {/* Content */}
        <span>{loading && loadingText ? loadingText : children}</span>

        {/* Right Icon */}
        {icon && iconPosition === 'right' && !loading && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </span>
    </button>
  )
})

Button.displayName = 'Button'

export default Button
