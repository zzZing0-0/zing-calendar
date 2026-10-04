export const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' } as const

export const MAX_GITHUB_ENVELOPE_BYTES = 6 * 1024 * 1024
export const MAX_GITHUB_TOKEN_CHARS = 1024
export const MAX_GITHUB_PATH_CHARS = 2048
export const MAX_GITHUB_BODY_CHARS = 5 * 1024 * 1024

export function browserRequestLooksCrossSite(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site')?.toLowerCase()
  if (site === 'cross-site') return true
  const origin = request.headers.get('origin')
  if (!origin) return false
  try { return new URL(origin).origin !== new URL(request.url).origin }
  catch { return true }
}

export function requestBodyTooLarge(request: Request, maxBytes = MAX_GITHUB_ENVELOPE_BYTES): boolean {
  const raw = request.headers.get('content-length')
  if (!raw) return false
  const value = Number(raw)
  return !Number.isFinite(value) || value < 0 || value > maxBytes
}

function safeRepoPart(value: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(value) && value !== '.' && value !== '..'
}

function safeEncodedPathPart(value: string): boolean {
  if (!value || /[\\\0]/.test(value)) return false
  let decoded: string
  try { decoded = decodeURIComponent(value) } catch { return false }
  return decoded !== '.' && decoded !== '..' && !decoded.includes('/') && !decoded.includes('\\') && !decoded.includes('\0')
}

export function safeGitHubPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_GITHUB_PATH_CHARS || !raw.startsWith('/repos/')) return null
  if (/[#\\]/.test(raw)) return null
  const q = raw.indexOf('?')
  const pathname = q >= 0 ? raw.slice(0, q) : raw
  const query = q >= 0 ? raw.slice(q + 1) : ''
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length < 5 || parts[0] !== 'repos' || !safeRepoPart(parts[1]) || !safeRepoPart(parts[2])) return null

  if (parts[3] === 'contents') {
    const contentParts = parts.slice(4)
    if (contentParts.length === 0 || !contentParts.every(safeEncodedPathPart)) return null
    if (query) {
      const params = new URLSearchParams(query)
      if ([...params.keys()].some(key => key !== 'ref') || !params.get('ref') || params.getAll('ref').length !== 1) return null
    }
    return raw
  }

  if (parts[3] === 'git' && parts[4] === 'blobs' && parts.length === 6 && !query) {
    const sha = parts[5]
    if (!/^[0-9a-f]{7,64}$/i.test(sha)) return null
    return raw
  }
  return null
}

export function validateGitHubPutBody(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_GITHUB_BODY_CHARS) return undefined
  let parsed: any
  try { parsed = JSON.parse(raw) } catch { return undefined }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
  const keys = Object.keys(parsed)
  if (keys.some(key => !['message', 'branch', 'content', 'sha'].includes(key))) return undefined
  if (typeof parsed.message !== 'string' || parsed.message.length < 1 || parsed.message.length > 300) return undefined
  if (typeof parsed.branch !== 'string' || parsed.branch.length < 1 || parsed.branch.length > 255 || /[\x00-\x20~^:?*\[\\]/.test(parsed.branch)) return undefined
  if (typeof parsed.content !== 'string' || parsed.content.length < 1 || parsed.content.length > MAX_GITHUB_BODY_CHARS || !/^[A-Za-z0-9+/=\r\n]+$/.test(parsed.content)) return undefined
  if (parsed.sha !== undefined && (typeof parsed.sha !== 'string' || !/^[0-9a-f]{7,64}$/i.test(parsed.sha))) return undefined
  return raw
}

export function safeB2Key(raw: string | null): string | null {
  if (!raw || raw.length > 96) return null
  if (!/^(?:attachment|journal|journal-audio):[0-9a-f-]{16,}$/i.test(raw)) return null
  return raw
}
