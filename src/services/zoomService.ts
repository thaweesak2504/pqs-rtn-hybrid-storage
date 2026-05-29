import { invoke } from '@tauri-apps/api/tauri'
import { logger } from '../utils/logger';

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
      logger.error('Failed to zoom in:', error)
      throw error
    }
  },

  async zoomOut(): Promise<void> {
    try {
      await invoke('zoom_out')
    } catch (error) {
      logger.error('Failed to zoom out:', error)
      throw error
    }
  },

  async zoomReset(): Promise<void> {
    try {
      await invoke('zoom_reset')
    } catch (error) {
      logger.error('Failed to reset zoom:', error)
      throw error
    }
  }
}

export default zoomService
