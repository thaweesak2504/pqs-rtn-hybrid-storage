import { useContext } from 'react'
import { BreadcrumbContext, type BreadcrumbContextType } from '../contexts/breadcrumbContextObject'

export const useBreadcrumb = (): BreadcrumbContextType => {
  const context = useContext(BreadcrumbContext)
  if (context === undefined) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider')
  }
  return context
}
