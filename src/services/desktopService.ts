import { invoke } from '@tauri-apps/api/tauri'
import { getCurrent } from '@tauri-apps/api/window'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/window'

/**
 * Desktop Service - Enhanced desktop-specific functionality
 * Provides native desktop operations for better user experience
 */
export class DesktopService {
  // Window management
  static async minimizeWindow() {
    try {
      const window = getCurrent()
      await window.minimize()
    } catch (error) {
      console.error('Failed to minimize window:', error)
    }
  }

  static async maximizeWindow() {
    try {
      const window = getCurrent()
      await window.maximize()
    } catch (error) {
      console.error('Failed to maximize window:', error)
    }
  }

  static async unmaximizeWindow() {
    try {
      const window = getCurrent()
      await window.unmaximize()
    } catch (error) {
      console.error('Failed to unmaximize window:', error)
    }
  }

  static async closeWindow() {
    try {
      const window = getCurrent()
      await window.close()
    } catch (error) {
      console.error('Failed to close window:', error)
    }
  }

  static async hideWindow() {
    try {
      const window = getCurrent()
      await window.hide()
    } catch (error) {
      console.error('Failed to hide window:', error)
    }
  }

  static async showWindow() {
    try {
      const window = getCurrent()
      await window.show()
    } catch (error) {
      console.error('Failed to show window:', error)
    }
  }

  // Zoom management
  static async zoomIn() {
    try {
      await invoke('zoom_in')
    } catch (error) {
      console.error('Failed to zoom in:', error)
    }
  }

  static async zoomOut() {
    try {
      await invoke('zoom_out')
    } catch (error) {
      console.error('Failed to zoom out:', error)
    }
  }

  static async zoomReset() {
    try {
      await invoke('zoom_reset')
    } catch (error) {
      console.error('Failed to reset zoom:', error)
    }
  }

  // File operations
  static async openFileDialog() {
    try {
      const { open } = await import('@tauri-apps/api/dialog')
      return await open({
        multiple: false,
        filters: [{
          name: 'Database Files',
          extensions: ['db', 'sqlite', 'sqlite3']
        }, {
          name: 'All Files',
          extensions: ['*']
        }]
      })
    } catch (error) {
      console.error('Failed to open file dialog:', error)
      return null
    }
  }

  static async saveFileDialog() {
    try {
      const { save } = await import('@tauri-apps/api/dialog')
      return await save({
        filters: [{
          name: 'Database Files',
          extensions: ['db', 'sqlite', 'sqlite3']
        }, {
          name: 'SQL Files',
          extensions: ['sql']
        }, {
          name: 'JSON Files',
          extensions: ['json']
        }, {
          name: 'CSV Files',
          extensions: ['csv']
        }]
      })
    } catch (error) {
      console.error('Failed to save file dialog:', error)
      return null
    }
  }

  static async openDirectoryDialog() {
    try {
      const { open } = await import('@tauri-apps/api/dialog')
      return await open({
        directory: true,
        multiple: false
      })
    } catch (error) {
      console.error('Failed to open directory dialog:', error)
      return null
    }
  }

  // System operations
  static async openExternal(url: string) {
    try {
      const { open } = await import('@tauri-apps/api/shell')
      await open(url)
    } catch (error) {
      console.error('Failed to open external URL:', error)
    }
  }

  static async getAppVersion() {
    try {
      const { getVersion } = await import('@tauri-apps/api/app')
      return await getVersion()
    } catch (error) {
      console.error('Failed to get app version:', error)
      return '0.1.0'
    }
  }

  static async getAppName() {
    try {
      const { getName } = await import('@tauri-apps/api/app')
      return await getName()
    } catch (error) {
      console.error('Failed to get app name:', error)
      return 'PQS RTN'
    }
  }

  // Window state management
  static async isMaximized() {
    try {
      const window = getCurrent()
      return await window.isMaximized()
    } catch (error) {
      console.error('Failed to check if window is maximized:', error)
      return false
    }
  }

  static async isMinimized() {
    try {
      const window = getCurrent()
      return await window.isMinimized()
    } catch (error) {
      console.error('Failed to check if window is minimized:', error)
      return false
    }
  }

  static async isVisible() {
    try {
      const window = getCurrent()
      return await window.isVisible()
    } catch (error) {
      console.error('Failed to check if window is visible:', error)
      return true
    }
  }

  // Window positioning and sizing
  static async setWindowSize(width: number, height: number) {
    try {
      const window = getCurrent()
      await window.setSize(new LogicalSize(width, height))
    } catch (error) {
      console.error('Failed to set window size:', error)
    }
  }

  static async setWindowPosition(x: number, y: number) {
    try {
      const window = getCurrent()
      await window.setPosition(new LogicalPosition(x, y))
    } catch (error) {
      console.error('Failed to set window position:', error)
    }
  }

  static async centerWindow() {
    try {
      const window = getCurrent()
      await window.center()
    } catch (error) {
      console.error('Failed to center window:', error)
    }
  }

  // Desktop notifications
  static async showNotification(title: string, body: string) {
    try {
      const { sendNotification } = await import('@tauri-apps/api/notification')
      await sendNotification({
        title,
        body,
        icon: 'icons/32x32.png'
      })
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }
}

export default DesktopService
