import { PRIVATE_NO_STORE, MAX_GITHUB_TOKEN_CHARS } from './api-security.js'

const deny = (error: string, status: number) => Response.json({ error }, { status, headers: PRIVATE_NO_STORE })

/** The bucket is bound to one configured private ledger, never a caller-selected repo.
 * No identity/permission cache: revoked credentials must be rechecked on every request.
 */
export async function authorizeB2(request: Request): Promise<Response | null> {
  const users = process.env.ZING_B2_GITHUB_USER_IDS?.split(',').map(value => value.trim())
  const repo = process.env.ZING_B2_GITHUB_REPOSITORY
  const repoId = process.env.ZING_B2_GITHUB_REPOSITORY_ID
  if (!users?.length || !users.every(value => /^[1-9]\d*$/.test(value)) ||
      !repo || !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repo) || !repoId || !/^[1-9]\d*$/.test(repoId)) {
    return deny('B2 authorization is not configured', 503)
  }
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1]
  if (!token || token.length > MAX_GITHUB_TOKEN_CHARS) return deny('GitHub authentication required', 401)
  try {
    const read = (path: string) => fetch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    })
    const identity = await read('/user')
    if (identity.status === 401) return deny('GitHub authentication failed', 401)
    if (!identity.ok) return deny('GitHub authorization unavailable', 503)
    const user = await identity.json()
    if (!Number.isSafeInteger(user.id) || !users.includes(String(user.id))) return deny('Attachment access denied', 403)
    const response = await read(`/repos/${repo}`)
    if (response.status === 401 || response.status === 403 || response.status === 404) return deny('Attachment access denied', 403)
    if (!response.ok) return deny('GitHub authorization unavailable', 503)
    const ledger = await response.json()
    if (String(ledger.id) !== repoId || ledger.full_name?.toLowerCase() !== repo.toLowerCase() || ledger.private !== true || ledger.permissions?.push !== true) return deny('Attachment access denied', 403)
    return null
  } catch {
    // Never log upstream errors, URLs, response bodies or credentials.
    return deny('GitHub authorization unavailable', 503)
  }
}
