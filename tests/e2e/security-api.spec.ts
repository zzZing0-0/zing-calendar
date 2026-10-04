import { expect, test } from '@playwright/test'
import { POST as githubSyncPost } from '../../api/github-sync'
import { GET as b2SignGet } from '../../api/b2-sign'
import { safeB2Key, safeGitHubPath, validateGitHubPutBody } from '../../server/api-security.js'

const validPutBody = JSON.stringify({ message:'sync: Zing data 2026-10-04', branch:'main', content:Buffer.from('{}').toString('base64') })
const request = (body: any, headers: Record<string,string> = {}) => new Request('https://zing.example/api/github-sync', {
  method:'POST', headers:{'content-type':'application/json', ...headers}, body:JSON.stringify(body),
})

test.describe('API security boundary regression', () => {
  test('GitHub path allowlist accepts only sync-required endpoint shapes', () => {
    expect(safeGitHubPath('/repos/owner/repo/contents/zing/sync-bundle.json?ref=main')).toBeTruthy()
    expect(safeGitHubPath('/repos/owner/repo/git/blobs/0123456789abcdef')).toBeTruthy()
    for (const value of [
      '/user', '/repos/o/r/issues', '/repos/o/r/contents/../../issues',
      '/repos/o/r/contents/%2e%2e/%2e%2e/issues', '/repos/o/r/contents/x?ref=main&x=1',
      '/repos/o/r/git/blobs/not-a-sha', '/repos/o/r/git/blobs/01234567?x=1',
    ]) expect(safeGitHubPath(value)).toBeNull()
  })

  test('GitHub PUT body validator rejects malformed, oversized or unexpected commands', () => {
    expect(validateGitHubPutBody(validPutBody)).toBe(validPutBody)
    expect(validateGitHubPutBody('{bad')).toBeUndefined()
    expect(validateGitHubPutBody(JSON.stringify({message:'x',branch:'main',content:'e30=',extra:'no'}))).toBeUndefined()
    expect(validateGitHubPutBody(JSON.stringify({message:'x',branch:'bad branch',content:'e30='}))).toBeUndefined()
    expect(validateGitHubPutBody(JSON.stringify({message:'x',branch:'main',content:'not base64!'}))).toBeUndefined()
  })

  test('GitHub relay rejects cross-site, wrong content type, invalid method/path and GET bodies before upstream fetch', async () => {
    expect((await githubSyncPost(request({token:'t',method:'GET',path:'/repos/o/r/contents/x?ref=main'}, {'sec-fetch-site':'cross-site'}))).status).toBe(403)
    const wrongType = new Request('https://zing.example/api/github-sync',{method:'POST',headers:{'content-type':'text/plain'},body:'{}'})
    expect((await githubSyncPost(wrongType)).status).toBe(415)
    expect((await githubSyncPost(request({token:'t',method:'DELETE',path:'/repos/o/r/contents/x'}))).status).toBe(400)
    expect((await githubSyncPost(request({token:'t',method:'GET',path:'/repos/o/r/issues'}))).status).toBe(400)
    expect((await githubSyncPost(request({token:'t',method:'GET',path:'/repos/o/r/contents/x?ref=main',body:'x'}))).status).toBe(400)
  })

  test('GitHub relay forwards a valid request without logging or returning the token', async () => {
    const original = globalThis.fetch
    let auth = '', target = ''
    globalThis.fetch = (async (input:any, init:any) => { target=String(input); auth=String(init.headers.Authorization); return new Response('{"ok":true}',{status:200,headers:{'content-type':'application/json'}}) }) as typeof fetch
    try {
      const response = await githubSyncPost(request({token:'secret-device-token',method:'PUT',path:'/repos/o/r/contents/zing/sync-bundle.json',body:validPutBody}))
      expect(response.status).toBe(200)
      expect(target).toBe('https://api.github.com/repos/o/r/contents/zing/sync-bundle.json')
      expect(auth).toBe('Bearer secret-device-token')
      expect(await response.text()).not.toContain('secret-device-token')
    } finally { globalThis.fetch = original }
  })

  test('B2 key allowlist preserves current and legacy keys but rejects path-like or oversized keys', () => {
    expect(safeB2Key('attachment:12345678-1234-1234-1234-123456789abc')).toBeTruthy()
    expect(safeB2Key('journal:1234567890abcdef')).toBeTruthy()
    expect(safeB2Key('journal-audio:1234567890abcdef')).toBeTruthy()
    expect(safeB2Key('attachment:../../secret')).toBeNull()
    expect(safeB2Key(`attachment:${'a'.repeat(100)}`)).toBeNull()
  })

  test('B2 signer rejects cross-site and invalid operations before credentials are read', async () => {
    const cross = new Request('https://zing.example/api/b2-sign?key=attachment:12345678-1234-1234-1234-123456789abc&method=GET',{headers:{'sec-fetch-site':'cross-site'}})
    expect((await b2SignGet(cross)).status).toBe(403)
    const invalid = new Request('https://zing.example/api/b2-sign?key=attachment:12345678-1234-1234-1234-123456789abc&method=DELETE')
    expect((await b2SignGet(invalid)).status).toBe(400)
  })

  test('B2 signer creates only short-lived URLs and does not expose the application key', async () => {
    const old = { id:process.env.B2_KEY_ID, key:process.env.B2_APPLICATION_KEY, bucket:process.env.B2_BUCKET_NAME, endpoint:process.env.B2_ENDPOINT }
    Object.assign(process.env,{B2_KEY_ID:'test-id',B2_APPLICATION_KEY:'super-secret-key',B2_BUCKET_NAME:'private-bucket',B2_ENDPOINT:'s3.us-west-004.backblazeb2.com'})
    try {
      const req = new Request('https://zing.example/api/b2-sign?key=attachment:12345678-1234-1234-1234-123456789abc&method=GET')
      const response = await b2SignGet(req); const payload:any = await response.json()
      expect(response.status).toBe(200)
      expect(payload.url).toContain('X-Amz-Expires=300')
      expect(payload.url).not.toContain('super-secret-key')
      expect(response.headers.get('cache-control')).toContain('no-store')
    } finally {
      const restore=(name:string,value:string|undefined)=> value===undefined ? delete process.env[name] : process.env[name]=value
      restore('B2_KEY_ID',old.id); restore('B2_APPLICATION_KEY',old.key); restore('B2_BUCKET_NAME',old.bucket); restore('B2_ENDPOINT',old.endpoint)
    }
  })
})


test('security API regression › Vercel function imports use deployment-safe ESM specifiers', async () => {
  const fs = await import('node:fs/promises')
  for (const file of ['api/github-sync.ts', 'api/b2-sign.ts']) {
    const source = await fs.readFile(file, 'utf8')
    expect(source).toContain("../server/api-security.js")
    expect(source).not.toMatch(/from ['"]\.\.\/server\/api-security['"]/)
  }
})
