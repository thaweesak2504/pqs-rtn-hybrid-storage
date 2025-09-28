import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

export const useZoomShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl key is pressed
      const isCtrlPressed = e.ctrlKey || e.metaKey
      if (!isCtrlPressed) return

      // Use e.code instead of e.key for language-independent detection
      const code = e.code
      
      // Zoom In: Ctrl + Plus (both regular and numpad)
      if (code === 'Equal' || code === 'NumpadAdd') {
        e.preventDefault()
        invoke('zoom_in').catch(console.error)
        return
      }

      // Zoom Out: Ctrl + Minus (both regular and numpad)
      if (code === 'Minus' || code === 'NumpadSubtract') {
        e.preventDefault()
        invoke('zoom_out').catch(console.error)
        return
      }

      // Zoom Reset: Ctrl + 0 (both regular and numpad)
      if (code === 'Digit0' || code === 'Numpad0') {
        e.preventDefault()
        invoke('zoom_reset').catch(console.error)
        return
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}

export default useZoomShortcuts
