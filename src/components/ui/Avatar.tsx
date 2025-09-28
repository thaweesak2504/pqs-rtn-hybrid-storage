import React from 'react'
import { User as UserIcon } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  version?: string | null // cache bust token
  onImageError?: () => void
}

// Size presets
const SIZE_MAP: Record<string, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl'
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '', version, onImageError }) => {
  // Track load error so we can gracefully fall back to initials (previously we only hid the <img>)
  const [hadError, setHadError] = React.useState(false)

  // Reset error flag if src changes
  React.useEffect(() => { setHadError(false) }, [src, version])
  const initials = React.useMemo(() => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }, [name])

  const sizeCls = SIZE_MAP[size]

  return (
    <div
      className={
        `relative rounded-full border border-github-border-primary bg-github-bg-secondary overflow-hidden flex items-center justify-center select-none ${sizeCls} ${className}`
      }
      aria-label={name || 'User Avatar'}
    >
      {(function(){
        if (!src || hadError) return null
        // Block file:// or raw filesystem path usage under dev http origin (will cause console error). Fallback to initials.
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'file://'
          const looksLikeFs = /^(?:file:|[a-zA-Z]:\\|\\\\|\/)/.test(src)
          if (!origin.startsWith('file://') && looksLikeFs && !/^data:/.test(src)) {
            return null
          }
        } catch (error) {
          console.warn('Avatar path validation error:', error);
        }
        const finalSrc = (function(){
          let s = src
          if (/^(?:[a-zA-Z]:\\|\\\\|\/)/.test(s) && !/^file:/.test(s)) {
            const normalized = s.replace(/\\/g,'/')
            s = 'file:///' + normalized.replace(/^\/+/,'')
          }
          if (/^(data:|blob:)/.test(s)) return s
          const withVersion = version ? `${s}${s.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}` : s
          return withVersion
        })()
        if (!finalSrc) return null
        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <img
            src={finalSrc}
            alt={name || 'Avatar'}
            className="absolute inset-0 h-full w-full object-cover object-top"
            draggable={false}
            onError={() => {
              setHadError(true)
              try { 
                onImageError?.() 
              } catch (error) {
                console.warn('Avatar onImageError callback error:', error);
              }
            }}
          />
        )
      })() || (
        <span className="font-medium text-github-text-primary flex items-center justify-center">
          {initials || <UserIcon className="h-4 w-4" />}
        </span>
      )}
      {/* Online indicator reserved (future) */}
    </div>
  )
}

export default Avatar
