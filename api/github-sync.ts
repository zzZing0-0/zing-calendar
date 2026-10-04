// Same-origin relay for Zing Calendar's private GitHub sync ledger.
// The fine-grained GitHub token remains device-owned: the browser sends it only
// for this request; this function forwards it to GitHub and never stores/logs it.
import {
  MAX_GITHUB_TOKEN_CHARS,
  PRIVATE_NO_STORE,
  browserRequestLooksCrossSite,
  requestBodyTooLarge,
  safeGitHubPath,
  validateGitHubPutBody,
} from '../server/api-security.js'

const ALLOWED_METHODS = new Set(['GET', 'PUT'])
const jsonError = (message: string, status: number) => Response.json({ error: message }, { status, headers: PRIVATE_NO_STORE })

export async function POST(request: Request): Promise<Response> {
  try {
    if (browserRequestLooksCrossSite(request)) return jsonError('Cross-site request rejected', 403)
    if (requestBodyTooLarge(request)) return jsonError('GitHub sync proxy request too large', 413)
    const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
    if (contentType !== 'application/json') return jsonError('GitHub sync proxy requires application/json', 415)

    const payload = await request.json() as { token?: unknown; method?: unknown; path?: unknown; body?: unknown }
    const token = typeof payload.token === 'string' ? payload.token.trim() : ''
    const method = typeof payload.method === 'string' ? payload.method.toUpperCase() : ''
    const path = safeGitHubPath(payload.path)
    const body = method === 'PUT' ? validateGitHubPutBody(payload.body) : undefined

    if (!token || token.length > MAX_GITHUB_TOKEN_CHARS || !ALLOWED_METHODS.has(method) || !path || (method === 'PUT' && body === undefined) || (method === 'GET' && payload.body !== undefined)) {
      return jsonError('Invalid GitHub sync proxy request', 400)
    }

    const githubResponse = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
      cache: 'no-store',
    })

    const responseBody = await githubResponse.text()
    const headers = new Headers({
      'Content-Type': githubResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      ...PRIVATE_NO_STORE,
    })
    for (const name of ['x-ratelimit-limit','x-ratelimit-remaining','x-ratelimit-reset','x-github-request-id']) {
      const value = githubResponse.headers.get(name)
      if (value) headers.set(name, value)
    }
    return new Response(responseBody, { status: githubResponse.status, headers })
  } catch (error) {
    // Never include the token, request body, or upstream URL in logs/errors.
    console.error('GitHub sync proxy error', error instanceof Error ? error.message : 'unknown error')
    return jsonError('GitHub sync proxy failed', 502)
  }
}
