const cacheKey = 'edu-system-avatar-cache'
const defaultImageBaseUrl = 'http://x6.sjcmc.cn:34084'

function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(cacheKey) || '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function resolveAvatarUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = String(import.meta.env.VITE_IMAGE_BASE_URL || defaultImageBaseUrl).replace(/\/+$/, '')
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}

export function cacheAvatar(username: string | undefined, avatarPath: string | null | undefined) {
  if (!username || !avatarPath) return
  const cache = readCache()
  cache[username] = avatarPath
  localStorage.setItem(cacheKey, JSON.stringify(cache))
}

export function getCachedAvatar(username: string | undefined): string {
  if (!username) return ''
  return readCache()[username] || ''
}
