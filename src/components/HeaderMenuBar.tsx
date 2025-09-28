import React from 'react'
import AboutDialog from './AboutDialog'

const HeaderMenuBar: React.FC = () => {
  // Tauri-only implementation - no Electron or Web fallbacks needed
  const [showAbout, setShowAbout] = React.useState(false)

  const [open, setOpen] = React.useState<string | null>(null)
  const barRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey) }
  }, [])

  type Item = { label: string; accel?: string; action?: () => void; type?: 'separator'; disabled?: boolean }
  const mk = (label: string, action?: () => void, accel?: string, disabled?: boolean): Item => ({ label, action, accel, disabled })
  const sep: Item = { label: '-', type: 'separator' }

  const fileItems: Item[] = [
    mk('Close Window', async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        await currentWindow.close()
      } catch (error) {
        console.error('Close window failed:', error)
      }
    }, 'Ctrl+W'),
    sep,
    mk('Exit', async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        await currentWindow.close()
      } catch (error) {
        console.error('Exit failed:', error)
      }
    }, 'Alt+F4'),
  ]
  const [canEdit, setCanEdit] = React.useState({ any: false, input: false })
  React.useEffect(() => {
  const update = () => {
      const ae = document.activeElement as HTMLElement | null
      const editableTags = ['INPUT','TEXTAREA']
      const isContentEditable = !!ae?.isContentEditable
      const isInput = !!(ae && (editableTags.includes(ae.tagName) || isContentEditable))
      setCanEdit({ any: !!ae, input: isInput })
    }
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    document.addEventListener('selectionchange', update)
    update()
    return () => {
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
      document.removeEventListener('selectionchange', update)
    }
  }, [])

  const editItems: Item[] = [
    mk('Undo', () => {
      // Tauri doesn't have built-in edit operations, disable for now
      console.log('Undo not implemented in Tauri')
    }, 'Ctrl+Z', true),
    mk('Redo', () => {
      // Tauri doesn't have built-in edit operations, disable for now
      console.log('Redo not implemented in Tauri')
    }, 'Ctrl+Y', true),
    sep,
    mk('Cut', () => {
      // Tauri doesn't have built-in edit operations, disable for now
      console.log('Cut not implemented in Tauri')
    }, 'Ctrl+X', true),
    mk('Copy', () => {
      // Tauri doesn't have built-in edit operations, disable for now
      console.log('Copy not implemented in Tauri')
    }, 'Ctrl+C', true),
    mk('Paste', () => {
      // Tauri doesn't have built-in edit operations, disable for now
      console.log('Paste not implemented in Tauri')
    }, 'Ctrl+V', true),
    mk('Select All', () => {
      // Tauri doesn't have built-in edit operations, disable for now
      console.log('Select All not implemented in Tauri')
    }, 'Ctrl+A', true),
  ]
  const viewItems: Item[] = [
    mk('Zoom In', async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/tauri')
        await invoke('zoom_in')
      } catch (error) {
        console.error('Zoom in failed:', error)
      }
    }, 'Ctrl+Plus'),
    mk('Zoom Out', async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/tauri')
        await invoke('zoom_out')
      } catch (error) {
        console.error('Zoom out failed:', error)
      }
    }, 'Ctrl+Minus'),
    mk('Actual Size', async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/tauri')
        await invoke('zoom_reset')
      } catch (error) {
        console.error('Zoom reset failed:', error)
      }
    }, 'Ctrl+0'),
    sep,
    mk('Reload', () => {
      try {
        window.location.reload()
      } catch (error) {
        console.error('Reload failed:', error)
      }
    }, 'Ctrl+R'),
    mk('Force Reload', () => {
      try {
        window.location.reload(true)
      } catch (error) {
        console.error('Force reload failed:', error)
      }
    }, 'Ctrl+Shift+R'),
    sep,
    mk('Toggle Developer Tools', async () => {
      try {
        // Tauri supports dev tools via keyboard shortcut
        // We can simulate the keyboard event or use a different approach
        const { invoke } = await import('@tauri-apps/api/tauri')
        // Try to invoke a custom command if available
        try {
          await invoke('toggle_devtools')
        } catch (error) {
          // Fallback: show message that user should use Ctrl+Shift+I
          console.log('Use Ctrl+Shift+I to toggle developer tools')
          alert('Use Ctrl+Shift+I to toggle developer tools')
        }
      } catch (error) {
        console.error('Toggle dev tools failed:', error)
      }
    }, 'F12'),
  ]
  const windowItems: Item[] = [
    mk('Minimize', async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        await currentWindow.minimize()
      } catch (error) {
        console.error('Minimize failed:', error)
      }
    }, 'Ctrl+M'),
    mk('Maximize/Restore', async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        await currentWindow.toggleMaximize()
      } catch (error) {
        console.error('Toggle maximize failed:', error)
      }
    }),
    mk('Close', async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()
        await currentWindow.close()
      } catch (error) {
        console.error('Close failed:', error)
      }
    }, 'Ctrl+W'),
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
