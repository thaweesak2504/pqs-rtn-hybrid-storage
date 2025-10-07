import { useEffect } from 'react'

/**
 * Custom hook for right panel control
 * Automatically closes right panel when showRightPanel prop is false
 * 
 * Phase 1.2: Extracted from BaseLayout to reduce useEffect complexity
 */
export function useRightPanelControl(
  showRightPanel: boolean,
  closeRightPanel: () => void
) {
  useEffect(() => {
    if (!showRightPanel) {
      closeRightPanel()
    }
  }, [showRightPanel, closeRightPanel])
}
