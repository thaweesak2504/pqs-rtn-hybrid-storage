import React from 'react'

const EditShortcuts: React.FC = () => {
  React.useEffect(() => {
    const editApi = (typeof window !== 'undefined' ? window.api?.edit : undefined)

    if (!editApi) return

    const onKey = (e: KeyboardEvent) => {
      // Only handle when Ctrl/Cmd is pressed
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const k = (e.key || '').toLowerCase()

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (k === 'y') {
        e.preventDefault()
        editApi.redo().catch(() => {})
        return
      }
      if (k === 'z' && e.shiftKey) {
        e.preventDefault()
        editApi.redo().catch(() => {})
        return
      }

      // Undo: Ctrl+Z (no shift)
      if (k === 'z') {
        e.preventDefault()
        editApi.undo().catch(() => {})
        return
      }

      // Cut/Copy/Paste/Select All
      if (k === 'x') { e.preventDefault(); editApi.cut().catch(() => {}) ; return }
      if (k === 'c') { e.preventDefault(); editApi.copy().catch(() => {}) ; return }
      if (k === 'v') { e.preventDefault(); editApi.paste().catch(() => {}) ; return }
      if (k === 'a') { e.preventDefault(); editApi.selectAll().catch(() => {}) ; return }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return null
}

export default EditShortcuts
