import { useEffect } from 'react'

/**
 * Custom hook for layout type synchronization
 * Updates layout context when layoutType prop changes
 * 
 * Phase 1.2: Extracted from BaseLayout to reduce useEffect complexity
 */
export function useLayoutTypeSync<T = string>(
  layoutType: T,
  setLayoutType: (type: T) => void,
  setCurrentPage: (page: string) => void
) {
  useEffect(() => {
    setLayoutType(layoutType)
    setCurrentPage(layoutType as string)
  }, [layoutType, setLayoutType, setCurrentPage])
}
