import { useContext } from 'react'
import { SlideBarContext, type SlideBarContextType } from '../contexts/SlideBarContext'

export const useSlideBar = (): SlideBarContextType => {
  const context = useContext(SlideBarContext)
  if (context === undefined) {
    throw new Error('useSlideBar must be used within a SlideBarProvider')
  }
  return context
}
