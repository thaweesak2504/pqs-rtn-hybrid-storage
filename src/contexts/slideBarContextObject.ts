import { createContext } from 'react'

export interface SlideBarContextType {
  isOpen: boolean
  toggleSlideBar: () => void
  closeSlideBar: () => void
  openSlideBar: () => void
  setReturnFocusEl: (el: HTMLElement | null) => void
}

export const SlideBarContext = createContext<SlideBarContextType | undefined>(undefined)
