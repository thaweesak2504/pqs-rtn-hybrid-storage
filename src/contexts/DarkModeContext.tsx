import React, { useState, useEffect } from 'react'
import { DarkModeContext } from './darkModeContextObject'

interface DarkModeProviderProps {
  children: React.ReactNode
}

export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({ children }) => {
  // ตั้งค่า default โดยตรวจสอบจาก localStorage หรือ system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode')
      if (savedMode !== null) {
        return JSON.parse(savedMode)
      }
      // Default to dark mode if no preference saved
      return true
    }
    return true
  })

  useEffect(() => {
    // ตรวจสอบ localStorage เมื่อ component mount
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode')
      if (savedMode !== null) {
        setIsDarkMode(JSON.parse(savedMode))
      }
    }
  }, [])

  useEffect(() => {
    // บันทึกการตั้งค่าไปยัง localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    }
    
    // อัปเดต class ของ html element
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev)
  }

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}
