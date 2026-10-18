import { test, expect } from '@playwright/test'
import { databaseCall, safetyHarness } from '../helpers/safetyHarness'

const key = 'attachment:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const note = (text: string) => `await db.saveNotes([{id:'note',title:'isolated',attachments:[{storageKey:'${key}',mimeType:'image/png',size:4}],updatedAt:'2026-10-18T10:00:00.000Z'}]);${text}`

async function mockSync(page: import('@playwright/test').Page, remoteStatus: 200 | 404, remoteBytes = 'fake') {
  const signed: string[] = [], putHeaders: Record<string,string>[] = [], uploads: string[] = []
  await page.route('**/api/github-sync', route => route.fulfill({ status: route.request().postDataJSON().method === 'GET' ? 404 : 201, json: {} }))
  await page.route('**/api/b2-sign?*', async route => {
    expect(route.request().headers().authorization).toBe('Bearer isolated-device-token')
    const method = new URL(route.request().url()).searchParams.get('method')!
    signed.push(method)
    await route.fulfill({ json: { url: `https://b2.mock.invalid/object?operation=${method}` } })
  })
  await page.route('https://b2.mock.invalid/**', async route => {
    const req = route.request()
    expect(req.headers().authorization).toBeUndefined()
    if (req.method() === 'GET') return route.fulfill(remoteStatus === 404 ? { status: 404 } : { status: 200, body: remoteBytes, contentType: 'image/png' })
    expect(req.method()).toBe('PUT')
    putHeaders.push(req.headers())
    uploads.push(req.postDataBuffer()?.toString() ?? '')
    return route.fulfill({ status: 200 })
  })
  return { signed, putHeaders, uploads }
}

test('missing B2 object uploads without unsupported conditional header; credentials stay on relay', async ({ page }) => {
  await safetyHarness(page)
  await databaseCall(page, note(`await db.putAttachmentBlob('${key}',new Blob(['fake'],{type:'image/png'}));`))
  const requests = await mockSync(page, 404)
  const result = await databaseCall<any>(page, `return db.syncWithGitHub({owner:'fixture',repo:'ledger',token:'isolated-device-token'})`)
  expect(requests.signed).toEqual(['GET','PUT'])
  expect(requests.putHeaders).toHaveLength(1)
  expect(requests.putHeaders[0]['if-none-match']).toBeUndefined()
  expect(requests.uploads).toEqual(['fake'])
  expect(result.attachments).toMatchObject({ total: 1, uploaded: 1 })
  expect(await databaseCall(page, `return (await db.getAttachmentBlob('${key}')).text()`)).toBe('fake')
})

test('existing identical B2 object is not overwritten', async ({ page }) => {
  await safetyHarness(page)
  await databaseCall(page, note(`await db.putAttachmentBlob('${key}',new Blob(['fake'],{type:'image/png'}));`))
  const requests = await mockSync(page, 200, 'fake')
  const result = await databaseCall<any>(page, `return db.syncWithGitHub({owner:'fixture',repo:'ledger',token:'isolated-device-token'})`)
  expect(requests.signed).toEqual(['GET'])
  expect(requests.uploads).toEqual([])
  expect(result.attachments.uploaded).toBe(0)
})

test('existing divergent B2 object reports a warning without overwriting it', async ({ page }) => {
  await safetyHarness(page)
  await databaseCall(page, note(`await db.putAttachmentBlob('${key}',new Blob(['fake'],{type:'image/png'}));`))
  const requests = await mockSync(page, 200, 'evil')
  const outcome = await databaseCall<any>(page, `return db.syncWithGitHub({owner:'fixture',repo:'ledger',token:'isolated-device-token'})`)
  expect(outcome.attachmentWarning).toContain('附件内容冲突')
  expect(outcome.attachments).toMatchObject({ uploaded: 0, downloaded: 0, total: 1 })
  expect(requests.signed).toEqual(['GET'])
  expect(requests.uploads).toEqual([])
  expect(await databaseCall(page, `return (await db.getAttachmentBlob('${key}')).text()`)).toBe('fake')
})
