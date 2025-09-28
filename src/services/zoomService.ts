import { invoke } from '@tauri-apps/api/tauri'

export interface ZoomService {
  zoomIn: () => Promise<void>
  zoomOut: () => Promise<void>
  zoomReset: () => Promise<void>
}

const zoomService: ZoomService = {
  async zoomIn(): Promise<void> {
    try {
      await invoke('zoom_in')
    } catch (error) {
      console.error('Failed to zoom in:', error)
      throw error
    }
  },

  async zoomOut(): Promise<void> {
    try {
      await invoke('zoom_out')
    } catch (error) {
      console.error('Failed to zoom out:', error)
      throw error
    }
  },

  async zoomReset(): Promise<void> {
    try {
      await invoke('zoom_reset')
    } catch (error) {
      console.error('Failed to reset zoom:', error)
      throw error
    }
  }
}

export default zoomService
