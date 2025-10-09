import React, { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronUp, ChevronDown, Filter } from 'lucide-react'
import { usePageSearch } from '../../hooks/usePageSearch'

const SearchBar: React.FC = () => {
  const { state, search, next, previous, toggle, close } = usePageSearch()
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input value with search state
  useEffect(() => {
    setInputValue(state.query)
  }, [state.query])

  // Focus input when search opens
  useEffect(() => {
    if (state.isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [state.isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    search(value)
  }

  const handleToggle = () => {
    if (state.isOpen) {
      close()
    } else {
      toggle()
    }
  }

  const handleClear = () => {
    setInputValue('')
    search('')
  }

  return (
    <div className="relative flex items-center bg-github-bg-secondary border border-github-border-primary rounded-md px-3 py-2 min-w-[300px] shadow-sm" role="search">
      {/* Search Icon */}
      <Search className="w-4 h-4 text-github-text-tertiary mr-2 flex-shrink-0" />
      
      {/* Search Input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Search in page..."
        aria-label="Search in page"
        className="flex-1 bg-transparent text-sm text-github-text-primary placeholder-github-text-tertiary outline-none min-w-0"
      />
      
      {/* Clear Button (only when there's text) */}
      {inputValue && (
        <button
          onClick={handleClear}
          className="p-1 rounded hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary mr-1"
          title="Clear search"
          aria-label="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      {/* Search Results Counter */}
      {state.total > 0 && (
        <div className="flex items-center text-xs text-github-text-secondary mr-2 font-medium">
          <span className="text-github-accent-primary">{state.currentIndex + 1}</span>
          <span className="mx-1">/</span>
          <span>{state.total}</span>
        </div>
      )}
      
      {/* Navigation Buttons */}
      {state.total > 1 && (
        <div className="flex items-center mr-2">
          <button
            onClick={previous}
            className="p-1 rounded hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary"
            title="Previous (↑ / Shift+Enter)"
            aria-label="Previous result"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={next}
            className="p-1 rounded hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary"
            title="Next (↓ / Enter)"
            aria-label="Next result"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}
      
      {/* Toggle/Close Button */}
      <button
        onClick={handleToggle}
        className="p-1 rounded hover:bg-github-bg-hover transition-colors text-github-text-secondary hover:text-github-text-primary"
        title="Toggle Search (⌘F)"
        aria-label="Toggle search"
      >
        <Filter className="w-4 h-4" />
      </button>
    </div>
  )
}

export default SearchBar