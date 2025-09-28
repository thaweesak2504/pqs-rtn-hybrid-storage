import React, { createContext, useContext, useState, type ReactNode } from 'react'

export type LayoutType = 'public' | 'pqs'
export type PanelPosition = 'left' | 'right'

export interface LayoutState {
  layoutType: LayoutType
  isRightPanelOpen: boolean
  isLeftPanelOpen: boolean
  currentPage: string
  breadcrumbs: BreadcrumbItem[]
  theme: 'light' | 'dark'
}

export interface BreadcrumbItem {
  label: string
  path: string
  icon?: React.ReactNode
}

export interface LayoutActions {
  setLayoutType: (type: LayoutType) => void
  openRightPanel: () => void
  closeRightPanel: () => void
  toggleRightPanel: () => void
  openLeftPanel: () => void
  closeLeftPanel: () => void
  toggleLeftPanel: () => void
  setCurrentPage: (page: string) => void
  updateBreadcrumbs: (items: BreadcrumbItem[]) => void
  addBreadcrumb: (item: BreadcrumbItem) => void
  clearBreadcrumbs: () => void
}

interface LayoutContextType extends LayoutState, LayoutActions {}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

interface LayoutProviderProps {
  children: ReactNode
  initialLayoutType?: LayoutType
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ 
  children, 
  initialLayoutType = 'public' 
}) => {
  const [layoutType, setLayoutType] = useState<LayoutType>(initialLayoutType)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { label: 'หน้าแรก', path: '/' }
  ])
  const [theme] = useState<'light' | 'dark'>('light')

  const openRightPanel = () => setIsRightPanelOpen(true)
  const closeRightPanel = () => setIsRightPanelOpen(false)
  const toggleRightPanel = () => setIsRightPanelOpen(prev => !prev)

  const openLeftPanel = () => setIsLeftPanelOpen(true)
  const closeLeftPanel = () => setIsLeftPanelOpen(false)
  const toggleLeftPanel = () => setIsLeftPanelOpen(prev => !prev)

  const updateBreadcrumbs = (items: BreadcrumbItem[]) => {
    setBreadcrumbs(items)
  }

  const addBreadcrumb = (item: BreadcrumbItem) => {
    setBreadcrumbs(prev => [...prev, item])
  }

  const clearBreadcrumbs = () => {
    setBreadcrumbs([{ label: 'หน้าแรก', path: '/' }])
  }

  const value: LayoutContextType = {
    layoutType,
    isRightPanelOpen,
    isLeftPanelOpen,
    currentPage,
    breadcrumbs,
    theme,
    setLayoutType,
    openRightPanel,
    closeRightPanel,
    toggleRightPanel,
    openLeftPanel,
    closeLeftPanel,
    toggleLeftPanel,
    setCurrentPage,
    updateBreadcrumbs,
    addBreadcrumb,
    clearBreadcrumbs
  }

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

export default LayoutContext
