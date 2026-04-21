import React, { createContext, useState, type ReactNode } from 'react'

export interface BreadcrumbContextType {
  breadcrumb: string
  setBreadcrumb: (breadcrumb: string) => void
}

export const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)

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
