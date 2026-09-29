// Same-origin relay for Zing Calendar's private GitHub sync ledger.
// The fine-grained GitHub token remains device-owned: the browser sends it only
// for this request; this function forwards it to GitHub and never stores/logs it.

const ALLOWED_METHODS = new Set(['GET', 'PUT'])

function safeGitHubPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/repos/')) return null
  // Zing only needs Contents and Git Blobs endpoints. Do not make this an open proxy.
  if (!/^\/repos\/[^/?#]+\/[^/?#]+\/(?:contents\/[^?#]+|git\/blobs\/[^/?#]+)(?:\?[^#]*)?$/.test(raw)) return null
  return raw
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json() as {
      token?: unknown
      method?: unknown
      path?: unknown
      body?: unknown
    }

    const token = typeof payload.token === 'string' ? payload.token.trim() : ''
    const method = typeof payload.method === 'string' ? payload.method.toUpperCase() : ''
    const path = safeGitHubPath(payload.path)

    if (!token || !ALLOWED_METHODS.has(method) || !path) {
      return Response.json({ error: 'Invalid GitHub sync proxy request' }, {
        status: 400,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    const githubResponse = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method === 'PUT' && typeof payload.body === 'string' ? payload.body : undefined,
      cache: 'no-store',
    })

    const body = await githubResponse.text()
    const headers = new Headers({
      'Content-Type': githubResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
    })
    for (const name of ['x-ratelimit-limit','x-ratelimit-remaining','x-ratelimit-reset','x-github-request-id']) {
      const value = githubResponse.headers.get(name)
      if (value) headers.set(name, value)
    }
    return new Response(body, { status: githubResponse.status, headers })
  } catch (error) {
    // Never include the token or request payload in logs/errors.
    console.error('GitHub sync proxy error', error instanceof Error ? error.message : 'unknown error')
    return Response.json(
      { error: error instanceof Error ? error.message : 'GitHub sync proxy failed' },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
