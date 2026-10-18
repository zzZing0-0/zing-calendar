import { test, expect } from '@playwright/test'
import { GET as sign } from '../../api/b2-sign'
import { POST as gc } from '../../api/b2-gc'
import { mockB2Authorization } from '../helpers/b2AuthorizationMock'

const key = 'attachment:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const request = (method = 'GET', headers: Record<string,string> = { Authorization: 'Bearer isolated-token' }) => new Request(`https://zing.example/api/b2-sign?key=${key}&method=${method}`, { headers })
const cleanup = (references: string[] = []) => new Request('https://zing.example/api/b2-gc', { method: 'POST', headers: { Authorization: 'Bearer isolated-token', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'delete', referencedKeys: references, orphanKeys: [key] }) })

test('missing server identity configuration fails closed for signer and cleanup', async () => {
  const dispose = mockB2Authorization()
  try {
    delete process.env.ZING_B2_GITHUB_USER_IDS
    expect((await sign(request())).status).toBe(503)
    expect((await gc(cleanup())).status).toBe(503)
  } finally { dispose() }
})

test('same-origin headers and forged identity headers cannot replace a bearer credential', async () => {
  const dispose = mockB2Authorization()
  try {
    for (const headers of [{}, { Origin: 'https://zing.example', 'sec-fetch-site': 'same-origin', 'x-github-user-id': '123' }, { Authorization: 'Basic fake' }]) {
      expect((await sign(request('GET', headers))).status).toBe(401)
    }
  } finally { dispose() }
})

for (const scenario of ['revoked', 'wrong-user', 'wrong-repo-id', 'public-repo', 'read-only', 'outage'] as const) {
  test(`B2 access rejects ${scenario} before signing or touching bucket objects`, async () => {
    const dispose = mockB2Authorization()
    const calls: string[] = []
    globalThis.fetch = (async (input, init) => {
      const url = String(input); calls.push(url)
      expect(init?.redirect).toBe('error')
      expect(init?.cache).toBe('no-store')
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer isolated-token')
      if (scenario === 'outage') throw new Error('mock timeout including private upstream details')
      if (url.endsWith('/user')) return scenario === 'revoked' ? new Response(null, { status: 401 }) : Response.json({ id: scenario === 'wrong-user' ? 999 : 123 })
      if (url.endsWith('/repos/fixture/ledger')) return Response.json({ id: scenario === 'wrong-repo-id' ? 999 : 456, full_name: 'fixture/ledger', private: scenario !== 'public-repo', permissions: { push: scenario !== 'read-only' } })
      throw new Error('External bucket request is forbidden')
    }) as typeof fetch
    try {
      const expected = scenario === 'revoked' ? 401 : scenario === 'outage' ? 503 : 403
      for (const response of [await sign(request()), await gc(cleanup())]) {
        expect(response.status).toBe(expected)
        const body = await response.text()
        expect(body).not.toContain('isolated-token'); expect(body).not.toContain('private upstream')
      }
      expect(calls.every(url => url.startsWith('https://api.github.com/'))).toBe(true)
    } finally { dispose() }
  })
}

test('an authorized owner still cannot delete when bucket scope cannot be verified', async () => {
  const dispose = mockB2Authorization()
  try {
    for (const references of [[], [key]]) expect((await gc(cleanup(references))).status).toBe(503)
  } finally { dispose() }
})

test('authorized signing rechecks revocation on every request and signs B2-compatible PUT without unsupported conditional headers', async () => {
  const dispose = mockB2Authorization()
  const names = ['B2_KEY_ID','B2_APPLICATION_KEY','B2_BUCKET_NAME','B2_ENDPOINT']
  const old = names.map(name => process.env[name])
  Object.assign(process.env, { B2_KEY_ID: 'fake-id', B2_APPLICATION_KEY: 'fake-secret', B2_BUCKET_NAME: 'isolated', B2_ENDPOINT: 's3.us-west-004.backblazeb2.com' })
  try {
    const response = await sign(request('PUT'))
    expect(response.status).toBe(200)
    const body = await response.json()
    const url = new URL(body.url)
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(body.url).not.toContain('fake-secret')
    globalThis.fetch = async () => new Response(null, { status: 401 })
    expect((await sign(request())).status).toBe(401)
  } finally {
    names.forEach((name, index) => { if (old[index] === undefined) delete process.env[name]; else process.env[name] = old[index] })
    dispose()
  }
})

// A B2-compatible PUT is not an atomic create-only operation. Keep the auth boundary
// explicitly covered instead of deleting the original security intent.
test('PUT signing rejects missing bearer and cross-site attempts', async () => {
  const dispose = mockB2Authorization()
  try {
    expect((await sign(request('PUT', {}))).status).toBe(401)
    expect((await sign(request('PUT', { Authorization: 'Bearer isolated-token', Origin: 'https://attacker.invalid', 'sec-fetch-site': 'cross-site' }))).status).toBe(403)
  } finally { dispose() }
})

test('PUT signing rejects revoked and unauthorized identities', async () => {
  const dispose = mockB2Authorization()
  try {
    globalThis.fetch = async () => new Response(null, { status: 401 })
    expect((await sign(request('PUT'))).status).toBe(401)
  } finally { dispose() }
})
