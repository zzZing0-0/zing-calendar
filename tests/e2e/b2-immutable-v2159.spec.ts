import { test, expect } from '@playwright/test'
import { databaseCall, safetyHarness } from '../helpers/safetyHarness'


test('content-addressed keys are stable, distinct, and reject altered bytes', async ({ page }) => {
  await safetyHarness(page)
  const result = await databaseCall<any>(page, `
    const m = await import('/src/domain/attachmentIntegrity.ts');
    const a = new Blob(['same']); const b = new Blob(['different']);
    const first = await m.immutableAttachmentKey(a);
    const repeat = await m.immutableAttachmentKey(a);
    const other = await m.immutableAttachmentKey(b);
    await m.assertAttachmentIntegrity(first, a);
    let rejected = false;
    try { await m.assertAttachmentIntegrity(first, b) } catch { rejected = true }
    await m.assertAttachmentIntegrity('attachment:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', b);
    return { first, repeat, other, rejected };
  `)
  expect(result.first).toMatch(/^attachment:[0-9a-f]{64}$/)
  expect(result.first).toBe(result.repeat)
  expect(result.other).not.toBe(result.first)
  expect(result.rejected).toBe(true)
})

test('content-addressed key with mismatched local bytes blocks cloud upload', async ({ page }) => {
  await safetyHarness(page)
  const key = `attachment:${'0'.repeat(64)}`
  await databaseCall(page, `await db.saveNotes([{id:'n',title:'safe',attachments:[{storageKey:'${key}',mimeType:'image/png',size:4}],updatedAt:'2026-10-18T10:00:00.000Z'}]); await db.putAttachmentBlob('${key}', new Blob(['fake']));`)
  let signed = 0
  await page.route('**/api/github-sync', route => route.fulfill({status: route.request().postDataJSON().method === 'GET' ? 404 : 201, json: {}}))
  await page.route('**/api/b2-sign?*', route => { signed++; return route.fulfill({json:{url:'https://b2.mock.invalid/object'}}) })
  const outcome = await databaseCall<any>(page, `return db.syncWithGitHub({owner:'fixture',repo:'ledger',token:'isolated-device-token'})`)
  expect(outcome.attachmentWarning).toContain('附件内容校验失败')
  expect(signed).toBe(0)
  expect(await databaseCall(page, `return (await db.getAttachmentBlob('${key}')).text()`)).toBe('fake')
})

test('legacy UUID attachment remains downloadable without hash-based rejection', async ({ page }) => {
  await safetyHarness(page)
  const key = 'attachment:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  await databaseCall(page, `await db.saveNotes([{id:'legacy',title:'old',attachments:[{storageKey:'${key}',mimeType:'image/png',size:4}],updatedAt:'2026-10-18T10:00:00.000Z'}]);`)
  await page.route('**/api/github-sync', route => route.fulfill({status: route.request().postDataJSON().method === 'GET' ? 404 : 201, json: {}}))
  await page.route('**/api/b2-sign?*', route => route.fulfill({json:{url:'https://b2.mock.invalid/legacy'}}))
  await page.route('https://b2.mock.invalid/**', route => route.fulfill({status:200,body:'old!',contentType:'image/png'}))
  const outcome = await databaseCall<any>(page, `return db.syncWithGitHub({owner:'fixture',repo:'ledger',token:'isolated-device-token'})`)
  expect(outcome.attachments.downloaded).toBe(1)
  expect(await databaseCall(page, `return (await db.getAttachmentBlob('${key}')).text()`)).toBe('old!')
})

test('corrupted remote content-addressed object is rejected and not saved locally', async ({ page }) => {
  await safetyHarness(page)
  const key = `attachment:${'0'.repeat(64)}`
  await databaseCall(page, `await db.saveNotes([{id:'new',title:'hashed',attachments:[{storageKey:'${key}',mimeType:'image/png',size:4}],updatedAt:'2026-10-18T10:00:00.000Z'}]);`)
  await page.route('**/api/github-sync', route => route.fulfill({status: route.request().postDataJSON().method === 'GET' ? 404 : 201, json: {}}))
  await page.route('**/api/b2-sign?*', route => route.fulfill({json:{url:'https://b2.mock.invalid/corrupt'}}))
  await page.route('https://b2.mock.invalid/**', route => route.fulfill({status:200,body:'evil',contentType:'image/png'}))
  const outcome = await databaseCall<any>(page, `return db.syncWithGitHub({owner:'fixture',repo:'ledger',token:'isolated-device-token'})`)
  expect(outcome.attachmentWarning).toContain('附件内容校验失败')
  expect(await databaseCall(page, `return (await db.getAttachmentBlob('${key}')) === undefined`)).toBe(true)
})
