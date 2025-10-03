import React from 'react'
import { LucideIcon, Eye, EyeOff } from 'lucide-react'

// Form Input Component
interface FormInputProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'number'
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  placeholder?: string
  label?: string
  icon?: LucideIcon
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
  // Password Toggle
  showPassword?: boolean
  onTogglePassword?: () => void
}

export const FormInput: React.FC<FormInputProps> = ({
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  label,
  icon: Icon,
  required = false,
  disabled = false,
  error,
  className = '',
  showPassword,
  onTogglePassword
}) => {
  const baseClasses = "w-full px-3 py-2 border border-github-border-primary rounded-lg bg-github-bg-secondary text-github-text-secondary placeholder-github-text-tertiary hover:border-github-border-active focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:bg-github-bg-secondary transition-colors text-sm"
  const errorClasses = error ? 'border-github-accent-danger' : ''
  const iconClasses = Icon ? 'pl-9' : ''
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  // Password toggle logic
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type
  const hasPasswordToggle = isPassword && onTogglePassword
  const rightPadding = hasPasswordToggle ? 'pr-12' : ''

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-github-text-primary">
          {label} {required && <span className="text-github-accent-danger">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-tertiary" />
        )}
        <input
          type={inputType}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${baseClasses} ${errorClasses} ${iconClasses} ${rightPadding} ${disabledClasses}`}
        />
        {hasPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-github-text-tertiary hover:text-github-text-secondary transition-colors"
            disabled={disabled}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-github-accent-danger">{error}</p>
      )}
    </div>
  )
}

// Form Textarea Component
interface FormTextareaProps {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  label?: string
  icon?: LucideIcon
  required?: boolean
  disabled?: boolean
  error?: string
  rows?: number
  className?: string
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  name,
  value,
  onChange,
  placeholder,
  label,
  icon: Icon,
  required = false,
  disabled = false,
  error,
  rows = 4,
  className = ''
}) => {
  const baseClasses = "w-full px-3 py-2 border border-github-border-primary rounded-lg bg-github-bg-secondary text-github-text-secondary placeholder-github-text-tertiary hover:border-github-border-active focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:bg-github-bg-secondary transition-colors resize-none text-sm"
  const errorClasses = error ? 'border-github-accent-danger' : ''
  const iconClasses = Icon ? 'pl-9' : ''
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-github-text-primary">
          {label} {required && <span className="text-github-accent-danger">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-3 w-4 h-4 text-github-text-tertiary" />
        )}
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`${baseClasses} ${errorClasses} ${iconClasses} ${disabledClasses}`}
        />
      </div>
      {error && (
        <p className="text-sm text-github-accent-danger">{error}</p>
      )}
    </div>
  )
}

// Form Select Component
interface FormSelectProps {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  label?: string
  icon?: LucideIcon
  required?: boolean
  disabled?: boolean
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export const FormSelect: React.FC<FormSelectProps> = ({
  name,
  value,
  onChange,
  label,
  icon: Icon,
  required = false,
  disabled = false,
  error,
  options,
  placeholder,
  className = ''
}) => {
  const baseClasses = "w-full px-3 py-2 border border-github-border-primary rounded-lg bg-github-bg-secondary text-github-text-secondary hover:border-github-border-active focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:bg-github-bg-secondary transition-colors appearance-none text-sm"
  const errorClasses = error ? 'border-github-accent-danger' : ''
  const iconClasses = Icon ? 'pl-9 pr-8' : 'pr-8'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-github-text-primary">
          {label} {required && <span className="text-github-accent-danger">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-tertiary" />
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`${baseClasses} ${errorClasses} ${iconClasses} ${disabledClasses}`}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-github-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="text-sm text-github-accent-danger">{error}</p>
      )}
    </div>
  )
}

// Form Group Component for layout
interface FormGroupProps {
  children: React.ReactNode
  className?: string
}

export const FormGroup: React.FC<FormGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  )
}

// Form Row Component for side-by-side layout
interface FormRowProps {
  children: React.ReactNode
  className?: string
}

export const FormRow: React.FC<FormRowProps> = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {children}
    </div>
  )
}

// Form Actions Component for buttons
interface FormActionsProps {
  children: React.ReactNode
  className?: string
}

export const FormActions: React.FC<FormActionsProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex gap-3 pt-4 ${className}`}>
      {children}
    </div>
  )
}
