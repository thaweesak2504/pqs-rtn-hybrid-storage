import React, { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { usePageSearch } from '../../hooks/usePageSearch'

interface SearchBarDropdownProps {
  onRightPanelOpen?: boolean
}

const SearchBarDropdown: React.FC<SearchBarDropdownProps> = ({ onRightPanelOpen = false }) => {
  const { state, search, next, previous, toggle, close } = usePageSearch()
  const [inputValue, setInputValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync input value with search state
  useEffect(() => {
    setInputValue(state.query)
  }, [state.query])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isDropdownOpen])

  // Close dropdown when right panel opens
  useEffect(() => {
    if (onRightPanelOpen) {
      setIsDropdownOpen(false)
      close()
    }
  }, [onRightPanelOpen, close])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsDropdownOpen(true)
        toggle()
      }
      // Escape to close
      if (e.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false)
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDropdownOpen, toggle, close])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    search(value)
  }

  const handleIconClick = () => {
    setIsDropdownOpen(!isDropdownOpen)
    if (!isDropdownOpen) {
      toggle()
    } else {
      close()
    }
  }

  const handleClear = () => {
    setInputValue('')
    search('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Search Icon Button */}
      <button
        onClick={handleIconClick}
        className="p-2 rounded-lg hover:bg-github-bg-hover transition-all duration-200 transform hover:scale-105"
        aria-label="Search in page"
        aria-expanded={isDropdownOpen}
        title="Search (Ctrl+K)"
      >
        <Search className="w-4 h-4 text-github-text-primary" />
      </button>

      {/* Dropdown Panel */}
      {isDropdownOpen && (
        <div 
          className="absolute right-0 top-full mt-6 w-80 bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-github-large z-50 overflow-hidden"
          role="search"
        >
          <div className="p-3">
            {/* Search Input with integrated Clear/Close button */}
            <div className="flex items-center bg-github-bg-tertiary border border-github-border-primary rounded-md px-3 py-2 mb-3">
              <Search className="w-4 h-4 text-github-text-tertiary mr-2 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Search in page..."
                aria-label="Search in page"
                className="flex-1 bg-transparent text-sm text-github-text-primary placeholder-github-text-tertiary outline-none min-w-0"
              />
              
              {/* Clear/Close Button (shows X when has text, otherwise close icon) */}
              <button
                onClick={() => {
                  if (inputValue) {
                    handleClear()
                  } else {
                    setIsDropdownOpen(false)
                    close()
                  }
                }}
                className="p-1 rounded hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary ml-1"
                title={inputValue ? "Clear search" : "Close (Esc)"}
                aria-label={inputValue ? "Clear search" : "Close search"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Results Counter & Navigation */}
            {state.total > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-github-border-primary">
                <div className="text-xs text-github-text-secondary">
                  <span className="font-medium text-github-accent-primary">{state.currentIndex + 1}</span>
                  <span className="mx-1">/</span>
                  <span className="font-medium">{state.total}</span>
                  <span className="ml-1">results</span>
                </div>

                {/* Navigation Buttons */}
                {state.total > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={previous}
                      className="p-1.5 rounded hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary"
                      title="Previous (Shift+Enter)"
                      aria-label="Previous result"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={next}
                      className="p-1.5 rounded hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary"
                      title="Next (Enter)"
                      aria-label="Next result"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* No Results Message */}
            {inputValue && state.total === 0 && (
              <div className="pt-2 border-t border-github-border-primary">
                <p className="text-xs text-github-text-secondary">No results found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchBarDropdown
