import React, { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const GlobalRedirect: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isInitialMount = useRef(true)
  const hasNavigated = useRef(false)
  
  useEffect(() => {
    // Only redirect on initial mount (page refresh/load)
    if (isInitialMount.current && !hasNavigated.current) {
      hasNavigated.current = true
      navigate('/home', { replace: true })
    }
    isInitialMount.current = false
  }, [navigate, location.pathname])
  
  return null // This component doesn't render anything
}

export default GlobalRedirect
