import { createContext } from 'react'

export interface BreadcrumbContextType {
  breadcrumb: string
  setBreadcrumb: (breadcrumb: string) => void
}

export const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)
