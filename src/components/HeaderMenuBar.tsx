import React from 'react'
import AboutDialog from './AboutDialog'
import { logger } from '../utils/logger';

const HeaderMenuBar: React.FC = () => {
  // Tauri-only implementation - no Electron or Web fallbacks needed
  const [showAbout, setShowAbout] = React.useState(false)

  const [open, setOpen] = React.useState<string | null>(null)
  const barRef = React.useRef<HTMLDivElement | null>(null)
  // Actions
  const handleNewWindow = async () => {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/window')
      const label = `win-${Date.now()}`
      const webview = new WebviewWindow(label, {
        url: 'index.html',
        title: 'Pqs Hybrid Storage',
        width: 1200,
        height: 800,
      })
      webview.once('tauri://created', function () {
        logger.info('New window created')
      })
      webview.once('tauri://error', function (e) {
        logger.error('Error creating new window', e)
      })
    } catch (error) {
      logger.error('New window failed:', error)
    }
  }

  const handleCloseWindow = async () => {
    try {
      const { getCurrent } = await import('@tauri-apps/api/window')
      const currentWindow = getCurrent()
      await currentWindow.close()
    } catch (error) {
      logger.error('Close window failed:', error)
    }
  }

  const handleZoomIn = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri')
      await invoke('zoom_in')
    } catch (error) {
      logger.error('Zoom in failed:', error)
    }
  }

  const handleZoomOut = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri')
      await invoke('zoom_out')
    } catch (error) {
      logger.error('Zoom out failed:', error)
    }
  }

  const handleZoomReset = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri')
      await invoke('zoom_reset')
    } catch (error) {
      logger.error('Zoom reset failed:', error)
    }
  }

  const handleReload = () => {
    try {
      window.location.reload()
    } catch (error) {
      logger.error('Reload failed:', error)
    }
  }

  const handleToggleDevTools = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri')
      try {
        await invoke('toggle_devtools')
// eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        logger.info('Use Ctrl+Shift+I to toggle developer tools')
      }
    } catch (error) {
      logger.error('Toggle dev tools failed:', error)
    }
  }

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null) }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)

      // Shortcuts - Use e.code to be layout-independent (works with Thai keyboard)
      if (e.ctrlKey) {
        switch (e.code) {
          case 'KeyN':
            e.preventDefault() // Prevent default browser new window
            handleNewWindow()
            break
          case 'KeyW':
            e.preventDefault()
            handleCloseWindow()
            break
          case 'Equal':
          case 'NumpadAdd':
            e.preventDefault()
            handleZoomIn()
            break
          case 'Minus':
          case 'NumpadSubtract':
            e.preventDefault()
            handleZoomOut()
            break
          case 'Digit0':
          case 'Numpad0':
            e.preventDefault()
            handleZoomReset()
            break
          case 'KeyR':
            // Allow default reload or handle custom
            // Ctrl+Shift+R is handled by browser usually, but we can intercept if needed
            break
          default:
            break
        }
      }

      if (e.code === 'F12') {
        handleToggleDevTools()
      }
    }

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey) }
  }, [])

  type Item = { label: string; accel?: string; action?: () => void; type?: 'separator'; disabled?: boolean }
  const mk = (label: string, action?: () => void, accel?: string, disabled?: boolean): Item => ({ label, action, accel, disabled })
  const sep: Item = { label: '-', type: 'separator' }

  const fileItems: Item[] = [
    mk('New Window', handleNewWindow, 'Ctrl+N'),
    sep,
    mk('Close Window', handleCloseWindow, 'Ctrl+W'),
    sep,
    mk('Exit', async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        await currentWindow.close()
      } catch (error) {
        logger.error('Exit failed:', error)
      }
    }, 'Alt+F4'),
  ]

  const editItems: Item[] = [
    mk('Undo', () => {
      logger.info('Undo not implemented in Tauri')
    }, 'Ctrl+Z', true),
    mk('Redo', () => {
      logger.info('Redo not implemented in Tauri')
    }, 'Ctrl+Y', true),
    sep,
    mk('Cut', () => {
      logger.info('Cut not implemented in Tauri')
    }, 'Ctrl+X', true),
    mk('Copy', () => {
      logger.info('Copy not implemented in Tauri')
    }, 'Ctrl+C', true),
    mk('Paste', () => {
      logger.info('Paste not implemented in Tauri')
    }, 'Ctrl+V', true),
    mk('Select All', () => {
      logger.info('Select All not implemented in Tauri')
    }, 'Ctrl+A', true),
  ]
  const viewItems: Item[] = [
    mk('Zoom In', handleZoomIn, 'Ctrl+Plus'),
    mk('Zoom Out', handleZoomOut, 'Ctrl+Minus'),
    mk('Actual Size', handleZoomReset, 'Ctrl+0'),
    sep,
    mk('Reload', handleReload, 'Ctrl+R'),
    mk('Force Reload', () => {
      try {
        window.location.reload()
      } catch (error) {
        logger.error('Force reload failed:', error)
      }
    }, 'Ctrl+Shift+R'),
    sep,
    mk('Toggle Developer Tools', handleToggleDevTools, 'F12'),
  ]
  const windowItems: Item[] = [
    mk('New Window', handleNewWindow, 'Ctrl+N'),
    sep,
    mk('Minimize', async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        await currentWindow.minimize()
      } catch (error) {
        logger.error('Minimize failed:', error)
      }
    }, 'Ctrl+M'),
    mk('Maximize/Restore', async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        await currentWindow.toggleMaximize()
      } catch (error) {
        logger.error('Toggle maximize failed:', error)
      }
    }),
    mk('Close', handleCloseWindow, 'Ctrl+W'),
  ]
  const helpItems: Item[] = [
    mk('About', () => {
      setShowAbout(true)
      setOpen(null)
    })
  ]

  // Dropdown anchored to the button wrapper to avoid inline styles
  const TopBtn: React.FC<{ id: string; label: string; items: Item[] }> = ({ id, label, items }) => {
    const openMenu = (next: boolean) => {
      if (!next) { setOpen(null); return }
      setOpen(id)
    }
    return (
      <div className="relative">
        <button
          className={`app-no-drag px-2 h-10 text-base tracking-wide text-github-text-primary font-light ${open === id ? 'bg-github-bg-active' : 'hover:bg-github-bg-hover active:bg-github-bg-active'}`}
          onMouseDown={(e) => { e.stopPropagation(); openMenu(open !== id) }}
          onMouseEnter={() => { if (open && open !== id) openMenu(true) }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {label}
        </button>
        {open === id ? (
          <div
            className="app-no-drag absolute left-0 top-full mt-px z-[9999] w-56 bg-github-bg-primary text-github-text-primary border border-github-border-primary shadow-lg pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="py-1 text-xs">
              {items.map((it, i) => it.type === 'separator' ? (
                <li key={`sep-${i}`} className="my-1 border-t border-github-border-primary" />
              ) : (
                <li key={it.label}>
                  <button
                    className={`app-no-drag w-full text-left h-7 px-3 flex items-center justify-between hover:bg-github-bg-hover font-light ${it.disabled ? 'opacity-50 pointer-events-none' : ''}`}
                    onMouseDown={(e) => { e.stopPropagation(); if (!it.disabled) { it.action?.(); } }}
                    onClick={(e) => { e.stopPropagation(); setOpen(null) }}
                  >
                    <span>{it.label}</span>
                    {it.accel ? <span className="opacity-60">{it.accel}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div ref={barRef} className="app-no-drag flex items-center h-10 relative z-10 pointer-events-auto">
        <TopBtn id="file" label="File" items={fileItems} />
        <TopBtn id="edit" label="Edit" items={editItems} />
        <TopBtn id="view" label="View" items={viewItems} />
        <TopBtn id="window" label="Window" items={windowItems} />
        <TopBtn id="help" label="Help" items={helpItems} />
      </div>

      {/* About Dialog */}
      <AboutDialog
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </>
  )
}

export default HeaderMenuBar
