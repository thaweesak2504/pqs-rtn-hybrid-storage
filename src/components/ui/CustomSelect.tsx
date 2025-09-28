import React, { useState, useRef, useEffect } from 'react'
import { LucideIcon, ChevronDown, Check } from 'lucide-react'

interface CustomSelectProps {
  name: string
  value: string
  onChange: (e: { target: { name: string; value: string } }) => void
  label?: string
  icon?: LucideIcon
  required?: boolean
  disabled?: boolean
  error?: string
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
  className?: string
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
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
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isInModal, setIsInModal] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Detect modal on mount
  useEffect(() => {
    const button = buttonRef.current
    if (button) {
      const modal = button.closest('.fixed, [role="dialog"], .modal')
      setIsInModal(modal !== null)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          handleOptionSelect(options[highlightedIndex])
        } else {
          setIsOpen(!isOpen)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        buttonRef.current?.focus()
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev => {
            let nextIndex = prev < options.length - 1 ? prev + 1 : 0
            // Skip disabled options
            while (nextIndex !== prev && options[nextIndex]?.disabled) {
              nextIndex = nextIndex < options.length - 1 ? nextIndex + 1 : 0
            }
            return nextIndex
          })
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev => {
            let nextIndex = prev > 0 ? prev - 1 : options.length - 1
            // Skip disabled options
            while (nextIndex !== prev && options[nextIndex]?.disabled) {
              nextIndex = nextIndex > 0 ? nextIndex - 1 : options.length - 1
            }
            return nextIndex
          })
        }
        break
    }
  }

  const handleOptionSelect = (option: { value: string; label: string }) => {
    onChange({
      target: {
        name,
        value: option.value
      }
    })
    setIsOpen(false)
    setHighlightedIndex(-1)
    buttonRef.current?.focus()
  }

  const handleToggle = () => {
    if (disabled) return
    setIsOpen(!isOpen)
    setHighlightedIndex(-1)
  }

  const selectedOption = options.find(option => option.value === value)
  const displayValue = selectedOption ? selectedOption.label : placeholder || ''

  const baseClasses = "w-full px-3 py-2 border border-github-border-primary rounded-lg bg-github-bg-secondary text-github-text-secondary hover:border-github-border-active focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:bg-github-bg-secondary transition-colors text-sm"
  const errorClasses = error ? 'border-github-accent-danger' : ''
  const iconClasses = Icon ? 'pl-9 pr-8' : 'pr-8'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-github-text-primary">
          {label} {required && <span className="text-github-accent-danger">*</span>}
        </label>
      )}
      
      <div className="relative" ref={selectRef}>
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-tertiary z-10" />
        )}
        
        {/* Select Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`
            ${baseClasses}
            ${errorClasses}
            ${iconClasses}
            ${disabledClasses}
            flex items-center justify-between
            text-left
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${name}-label` : undefined}
        >
          <span className={selectedOption ? 'text-github-text-secondary' : 'text-github-text-tertiary'}>
            {displayValue}
          </span>
          <ChevronDown 
            className={`w-4 h-4 text-github-text-tertiary transition-transform duration-200 ${
              isOpen ? (isInModal ? 'rotate-0' : 'rotate-180') : (isInModal ? 'rotate-180' : 'rotate-0')
            }`} 
          />
        </button>

        {/* Dropdown List */}
        {isOpen && (
          <div className={`absolute z-50 w-full bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-lg max-h-60 overflow-y-auto ${
            isInModal ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}>
            {placeholder && (
              <button
                type="button"
                onClick={() => handleOptionSelect({ value: '', label: placeholder })}
                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors
                  ${value === '' 
                    ? 'bg-github-bg-active text-github-text-primary' 
                    : 'text-github-text-secondary hover:bg-github-bg-hover'
                  }
                  ${highlightedIndex === -1 ? 'bg-github-bg-hover' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{placeholder}</span>
                  {value === '' && <Check className="w-4 h-4" />}
                </div>
              </button>
            )}
            
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => !option.disabled && handleOptionSelect(option)}
                disabled={option.disabled}
                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors
                  ${option.disabled 
                    ? 'opacity-50 cursor-not-allowed text-github-text-tertiary' 
                    : value === option.value 
                      ? 'bg-github-bg-active text-github-text-primary' 
                      : 'text-github-text-secondary hover:bg-github-bg-hover'
                  }
                  ${highlightedIndex === index && !option.disabled ? 'bg-github-bg-hover' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {value === option.value && <Check className="w-4 h-4" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-1 text-sm text-github-accent-danger">{error}</p>
        )}
      </div>
    </div>
  )
}
