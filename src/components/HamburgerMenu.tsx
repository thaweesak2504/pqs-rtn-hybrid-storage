import React from 'react'
import { Menu, List } from 'lucide-react'
import { useSlideBar } from '../hooks/useSlideBar'

const HamburgerMenu: React.FC = () => {
  const { isOpen, toggleSlideBar, setReturnFocusEl } = useSlideBar()
  const btnRef = React.useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    toggleSlideBar()
  }

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg hover:bg-github-bg-hover transition-all duration-200 transform hover:scale-105"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-controls="sidebar-panel"
      aria-expanded={isOpen}
      type="button"
      ref={btnRef}
      onMouseDown={() => setReturnFocusEl(btnRef.current)}
    >
      <div className="relative w-5 h-5">
        <Menu
          className={`w-5 h-5 text-github-text-primary transition-all duration-200 ${
            isOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'
          }`}
        />
        <List
          className={`absolute top-0 left-0 w-5 h-5 text-github-text-primary transition-all duration-200 ${
            isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'
          }`}
        />
      </div>
    </button>
  )
}

export default HamburgerMenu
