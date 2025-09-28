import React, { useState } from 'react'
import { SlideBarContext } from './slideBarContextObject'

interface SlideBarProviderProps {
  children: React.ReactNode
}

export const SlideBarProvider: React.FC<SlideBarProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [returnFocusEl, setReturnFocusEl] = useState<HTMLElement | null>(null)

  const toggleSlideBar = () => {
    setIsOpen(prev => !prev)
  }

  const closeSlideBar = () => {
    setIsOpen(false)
    // Restore focus to the trigger button after closing
    if (returnFocusEl) {
      window.setTimeout(() => returnFocusEl?.focus(), 0)
    }
  }

  const openSlideBar = () => {
    setIsOpen(true)
  }

  return (
    <SlideBarContext.Provider value={{ isOpen, toggleSlideBar, closeSlideBar, openSlideBar, setReturnFocusEl }}>
      {children}
    </SlideBarContext.Provider>
  )
}
