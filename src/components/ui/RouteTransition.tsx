import React from 'react'
import { useLocation } from 'react-router-dom'

const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    setVisible(false)
    const id = window.setTimeout(() => setVisible(true), 0)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  return (
    <div className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  )
}

export default RouteTransition
