export {}

declare global {
  interface Window {
    api?: {
      window?: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        unmaximize: () => Promise<void>
        toggleMaximize: () => Promise<{ maximized: boolean }>
        isMaximized: () => Promise<{ maximized: boolean }>
        close: () => Promise<void>
        toggleFullscreen: () => Promise<{ fullscreen: boolean }>
        onState?: (cb: (p: { maximized?: boolean }) => void) => () => void
      }
      menu?: {
        zoomIn: () => Promise<void>
        zoomOut: () => Promise<void>
        zoomReset: () => Promise<void>
        reload: () => Promise<void>
        forceReload: () => Promise<void>
        toggleDevTools: () => Promise<void>
        toggleFullscreen: () => Promise<{ fullscreen: boolean }>
        about: () => Promise<void>
        quit: () => Promise<void>
      }
      edit?: {
        undo: () => Promise<void>
        redo: () => Promise<void>
        cut: () => Promise<void>
        copy: () => Promise<void>
        paste: () => Promise<void>
        selectAll: () => Promise<void>
      }
    }
  }
}
export {}

declare global {
  interface Window {
    api: {
      ping: () => string
      window?: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        unmaximize: () => Promise<void>
        toggleMaximize: () => Promise<{ maximized: boolean }>
        isMaximized: () => Promise<{ maximized: boolean }>
        close: () => Promise<void>
        toggleFullscreen: () => Promise<{ fullscreen: boolean }>
        onState: (cb: (payload: { maximized?: boolean }) => void) => () => void
      }
      menu?: {
        zoomIn: () => Promise<void>
        zoomOut: () => Promise<void>
        zoomReset: () => Promise<void>
        reload: () => Promise<void>
        forceReload: () => Promise<void>
        toggleDevTools: () => Promise<void>
        toggleFullscreen: () => Promise<{ fullscreen: boolean }>
        about: () => Promise<void>
        quit: () => Promise<void>
      }
    }
  }
}
export {}

declare global {
  interface Window {
    api: {
      ping: () => string
    }
    __TAURI__?: any
  }
}
