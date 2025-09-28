// Utility to resolve avatar source with version/cache busting
export interface AvatarSourceOptions {
  raw?: string | null
  version?: string
}

export const resolveAvatarSource = (options: AvatarSourceOptions): string | null => {
  const { raw, version } = options
  
  if (!raw) return null
  
  // If it's already a data URL (base64), return as-is
  if (raw.startsWith('data:')) {
    return raw
  }
  
  // If it's a file path and we have version, add version param for cache busting
  if (version) {
    const separator = raw.includes('?') ? '&' : '?'
    return `${raw}${separator}v=${encodeURIComponent(version)}`
  }
  
  return raw
}
