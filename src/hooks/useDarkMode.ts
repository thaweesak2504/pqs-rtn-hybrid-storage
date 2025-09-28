import { useContext } from 'react'
import { DarkModeContext, type DarkModeContextType } from '../contexts/darkModeContextObject'

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider')
  }
  return context
}
