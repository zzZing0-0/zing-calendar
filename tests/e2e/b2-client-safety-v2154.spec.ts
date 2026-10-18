import { test, expect } from '@playwright/test'
import { databaseCall, safetyHarness } from '../helpers/safetyHarness'

test('note attachment requests authenticate only to the relay and bind create-only writes to B2', async ({ page }) => {
  await safetyHarness(page)
  await databaseCall(page, `await db.saveNotes([{id:'note',title:'isolated',attachments:[{storageKey:'attachment:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',mimeType:'image/png',size:4}],updatedAt:'2026-10-18T10:00:00.000Z'}]);await db.putAttachmentBlob('attachment:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',new Blob(['fake'],{type:'image/png'}));`)
  await page.route('**/api/github-sync', route => route.fulfill({ status: route.request().postDataJSON().method === 'GET' ? 404 : 201, json: {} }))
  const signed: string[] = [], putHeaders: Record<string,string>[] = []
  await page.route('**/api/b2-sign?*', async route => {
    expect(route.request().headers().authorization).toBe('Bearer isolated-device-token')
    const method = new URL(route.request().url()).searchParams.get('method')!
    signed.push(method)
    await route.fulfill({ json: { url: `https://b2.mock.invalid/object?operation=${method}` } })
  })
  await page.route('https://b2.mock.invalid/**', async route => {
    const req = route.request()
    expect(req.headers().authorization).toBeUndefined()
    if (req.method() === 'GET') return route.fulfill({ status: 404 })
    putHeaders.push(req.headers())
    expect(req.postDataBuffer()?.toString()).toBe('fake')
    return route.fulfill({ status: 200 })
  })
  const result = await databaseCall<any>(page, `return db.syncWithGitHub({owner:'fixture',repo:'ledger',token:'isolated-device-token'})`)
  expect(signed).toEqual(['GET','PUT'])
  expect(putHeaders).toHaveLength(1); expect(putHeaders[0]['if-none-match']).toBe('*')
  expect(result.attachments).toMatchObject({ total: 1, uploaded: 1 })
  expect(await databaseCall(page, `return (await db.getAttachmentBlob('attachment:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).text()`)).toBe('fake')
})
