import React, { useState, type ReactNode } from 'react'
import { BreadcrumbContext } from './breadcrumbContextObject'

interface BreadcrumbProviderProps {
  children: ReactNode
}

export const BreadcrumbProvider: React.FC<BreadcrumbProviderProps> = ({ children }) => {
  const [breadcrumb, setBreadcrumb] = useState<string>('Welcome')

  return (
    <BreadcrumbContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}
