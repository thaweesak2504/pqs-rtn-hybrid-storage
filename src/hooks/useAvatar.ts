import { useCallback, useEffect, useRef, useState } from 'react'
import { validateAvatarFile, fileToDataUrl, maybeDownscaleImage } from '../services/avatarService'
import { resolveAvatarSource } from '../utils/resolveAvatarSource'
import { updateUserAvatarPath } from '../services/userService'

export interface UseAvatarOptions {
  initialPath?: string | null
  initialUpdatedAt?: string | null
  name?: string | null
  hydrateDev?: boolean // attempt base64 read in dev http origin
}

interface AvatarState {
  src: string | null
  path: string | null
  version: string | null
  loading: boolean
  error: string | null
  uploading: boolean
}

export const useAvatar = (userId: number | undefined, opts: UseAvatarOptions = {}) => {
  const { initialPath = null, initialUpdatedAt = null } = opts
  const [state, setState] = useState<AvatarState>({
    src: null,
    path: initialPath,
    version: initialUpdatedAt,
    loading: false,
    error: null,
    uploading: false
  })
  const cancelled = useRef(false)
  const lastUploadRef = useRef<number>(0)
  useEffect(() => () => { cancelled.current = true }, [])

  // Hydrate dev (http origin) with base64 if read available and we have path
  useEffect(() => {
    if (!userId || !state.path) return
    try {
      const origin = window.location.origin
      if (!origin.startsWith('file://') && (window as any).api?.avatar?.read) {
        ;(async () => {
          try {
            const res = await (window as any).api.avatar.read(userId)
            if (res?.ok && res.dataUrl && !cancelled.current) {
              setState(s => ({ ...s, src: res.dataUrl }))
            }
          } catch (error) {
            // Error reading avatar via IPC
            console.debug('Avatar read failed:', error)
          }
        })()
      }
    } catch (error) {
      // Error checking window origin or API availability
      console.debug('Avatar hydration check failed:', error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, state.path])

  // Sync external initialPath changes (e.g. updated elsewhere) into internal state
  useEffect(() => {
    setState(s => {
      if (initialPath && initialPath !== s.path) {
        return { ...s, path: initialPath, version: initialUpdatedAt || s.version }
      }
      if (!initialPath && s.path) {
        return { ...s, path: null }
      }
      return s
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPath, initialUpdatedAt])

  const update = useCallback(async (file: File) => {
    if (!userId) return false
  // Clear prior error immediately on new attempt
  setState(s => ({ ...s, error: null }))
  // Simple rate limit: 1 upload per 4s per user
    const nowTs = Date.now()
    const last = lastUploadRef.current
    try { window.dispatchEvent(new CustomEvent('avatar-update-invoked', { detail: { userId, nowTs, last } })) } catch (error) {
          console.warn('Error:', error);
        }
    if (nowTs - last < 4000) {
      setState(s => ({ ...s, uploading: false, error: 'โปรดรอ 4 วินาทีก่อนอัปโหลดอีกครั้ง' }))
      // Emit a custom event so UI can optionally listen for immediate feedback
      try { console.warn('[avatar] rate limited', { userId, waitMs: 4000 - (nowTs - last) }); window.dispatchEvent(new CustomEvent('avatar-rate-limit', { detail: { userId, retryAfterMs: 4000 - (nowTs - last) } })) } catch (error) {
          console.warn('Error:', error);
        }
      return false
    }
    lastUploadRef.current = nowTs
    // If already uploading guard (extra safety)
    if (state.uploading) {
      setState(s => ({ ...s, error: 'กำลังอัปโหลดอยู่' }))
      return false
    }
    const v = validateAvatarFile(file)
    let oversizeWarn = false
    if (!v.ok) {
      const sizeOnly = /300KB/.test(v.error || '')
      if (!sizeOnly) {
        setState(s => ({ ...s, error: v.error || 'invalid_file' })); return false
      }
      oversizeWarn = true
    }
    setState(s => ({ ...s, uploading: true, error: null }))
    try {
      let dataUrl = await fileToDataUrl(file)
      try {
        const down = await maybeDownscaleImage(dataUrl, file.type)
        dataUrl = down.dataUrl
      } catch (err: unknown) {
        setState(s => ({ ...s, uploading: false, error: (err as Error)?.message || 'process_fail' }))
        return false
      }
      if (!(window as any).api?.avatar?.save) throw new Error('no_ipc')
  const res = await (window as any).api.avatar.save(userId, dataUrl)
  if (!res?.ok) throw new Error(res.error || 'save_failed')
  await updateUserAvatarPath(userId, res.path || null, { mime: res.mime, size: res.size })
      const origin = window.location.origin
      const useBase64 = !origin.startsWith('file://')
      const finalVersion = res.hash || new Date().toISOString()
      setState(s => ({
        ...s,
        uploading: false,
        path: res.path || null,
        version: finalVersion,
        src: useBase64 ? dataUrl : (res.path || null),
        error: oversizeWarn ? null : null
      }))
      try { window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { userId, path: res.path || null, version: finalVersion, hash: res.hash || null } })) } catch (error) {
          console.warn('Error:', error);
        }
      return true
    } catch (e: unknown) {
      setState(s => ({ ...s, uploading: false, error: (e as Error)?.message || 'upload_fail' }))
      return false
    }
  }, [userId])

  const remove = useCallback( async () => {
    if (!userId) return false
    try {
      setState(s => ({ ...s, uploading: true, error: null }))
      if ((window as any).api?.avatar?.remove) {
        const res = await (window as any).api.avatar.remove(userId)
        if (!res?.ok) throw new Error(res.error || 'remove_failed')
      }
      await updateUserAvatarPath(userId, null)
      setState(s => ({ ...s, uploading: false, path: null, src: null, version: null }))
      return true
    } catch (e: unknown) {
      setState(s => ({ ...s, uploading: false, error: (e as Error)?.message || 'remove_fail' }))
      return false
    }
  }, [userId])

  const resolved = resolveAvatarSource({ raw: state.src || state.path, version: state.version || undefined })
  return {
    src: resolved,
    path: state.path,
    version: state.version,
    loading: state.loading,
    uploading: state.uploading,
    error: state.error,
    update,
    remove
  }
}

export default useAvatar
