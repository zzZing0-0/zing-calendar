import { test, expect } from '@playwright/test'
import { databaseCall, safetyHarness, seedTask } from '../helpers/safetyHarness'

test.beforeEach(async ({ page }) => safetyHarness(page))
const emptyRestore = `journals:[],notes:[],notebooks:[],moods:[],energies:[],environments:[],periods:[],tags:[],anniversaries:[],focusSessions:[],habits:[],habitCheckIns:[]`

for (const failure of ['syncTombstones', 'syncChanges']) {
  test(`failure writing ${failure} rolls back both entity deletion and the entire sync journal`, async ({ page }) => {
    await seedTask(page)
    const result = await page.evaluate(async failure => {
      const db = await import('/src/db/calendar.ts')
      const put = IDBObjectStore.prototype.put, add = IDBObjectStore.prototype.add
      IDBObjectStore.prototype.put = function (...args: any[]) {
        if (this.name === failure) throw new DOMException('injected log failure', 'QuotaExceededError')
        return put.apply(this, args)
      }
      IDBObjectStore.prototype.add = function (...args: any[]) {
        if (this.name === failure) throw new DOMException('injected journal failure', 'QuotaExceededError')
        return add.apply(this, args)
      }
      let failed = false
      try { await db.saveEntityWithSync('task', []) } catch { failed = true }
      finally { IDBObjectStore.prototype.put = put; IDBObjectStore.prototype.add = add }
      return { failed, tasks: await db.loadTasks(), tombstones: await db.loadSyncTombstones(), changes: await db.loadSyncChangesAfter() }
    }, failure)
    expect(result.failed).toBe(true)
    expect(result.tasks).toHaveLength(1); expect(result.tasks[0].id).toBe('original')
    expect(result.tombstones).toEqual([]); expect(result.changes).toEqual([])
  })
}

test('a successful delete is durable together with its tombstone and outbox after reload', async ({ page }) => {
  await seedTask(page)
  expect(await databaseCall(page, `return db.saveEntityWithSync('task',[])`)).toBe(true)
  await page.reload()
  const result = await databaseCall<any>(page, `return {tasks:await db.loadTasks(),tombstones:await db.loadSyncTombstones(),changes:await db.loadSyncChangesAfter()}`)
  expect(result.tasks).toEqual([])
  expect(result.tombstones).toEqual([expect.objectContaining({ key: 'task:original', entityType: 'task', entityId: 'original' })])
  expect(result.changes).toEqual([expect.objectContaining({ entityType: 'task', entityId: 'original', operation: 'delete' })])
  expect(result.tombstones[0].deletedAt).toBe(result.changes[0].changedAt)
  expect(result.tombstones[0].deviceId).toBe(result.changes[0].deviceId)
})

test('queued replacements compare durable rows and recreation clears only its own tombstone', async ({ page }) => {
  await seedTask(page)
  const result = await databaseCall<any>(page, `
    await db.saveSyncTombstone({key:'note:other',entityType:'note',entityId:'other',deletedAt:'2026-10-18T09:00:00.000Z',deviceId:'fixture'});
    await Promise.all([db.saveEntityWithSync('task',[]),db.saveEntityWithSync('task',[{id:'original',title:'recreated'}])]);
    const noop=await db.saveEntityWithSync('task',[{id:'original',title:'recreated'}]);
    return {noop,tasks:await db.loadTasks(),tombstones:await db.loadSyncTombstones(),changes:await db.loadSyncChangesAfter()};`)
  expect(result.noop).toBe(false)
  expect(result.tasks).toEqual([{ id: 'original', title: 'recreated' }])
  expect(result.tombstones.map((row: any) => row.key)).toEqual(['note:other'])
  expect(result.changes.map((row: any) => row.operation)).toEqual(['delete', 'upsert'])
})

test('a late settings clone failure rolls back restored data, settings and attachment bytes together', async ({ page }) => {
  await seedTask(page)
  const result = await databaseCall<any>(page, `
    await db.saveUserSettings([{id:'settings',greeting:'old'}]);await db.putAttachmentBlob('old',new Blob(['old bytes']));
    let failed=false;
    try{await db.replaceZingData({tasks:[{id:'new'}],${emptyRestore},attachments:[],settings:{id:'settings',greeting:'new',uncloneable:()=>{}}})}catch{failed=true}
    return {failed,tasks:await db.loadTasks(),settings:await db.loadUserSettings(),bytes:await(await db.getAttachmentBlob('old'))?.text()};`)
  expect(result.failed).toBe(true)
  expect(result.tasks[0].id).toBe('original')
  expect(result.settings).toEqual([{ id: 'settings', greeting: 'old' }])
  expect(result.bytes).toBe('old bytes')
})

test('reopening after a committed restore repairs stale preference caches before mounting persistence', async ({ page }) => {
  await databaseCall(page, `await db.replaceZingData({tasks:[{id:'restored',title:'restored',date:'2026-10-18',updatedAt:'2026-10-18T09:00:00.000Z'}],${emptyRestore},attachments:[{key:'restored-bytes',blob:new Blob(['restored'])}],settings:{id:'settings',updatedAt:'2026-10-18T09:00:00.000Z',greeting:'恢复问候',dateFormat:'mdy',weekStart:'sunday',wordCloudIgnored:[]}});`)
  // Simulate interruption immediately after the authoritative commit, before any cache writes.
  await page.evaluate(() => { localStorage.setItem('zing:greeting', 'STALE'); localStorage.setItem('zing:dateFormat', 'dmy') })
  await page.goto('/')
  await expect(page.locator('.bottom-nav')).toBeVisible()
  await expect.poll(() => page.evaluate(() => ({ greeting: localStorage.getItem('zing:greeting'), date: localStorage.getItem('zing:dateFormat') }))).toEqual({ greeting: '恢复问候', date: 'mdy' })
  const result = await databaseCall<any>(page, `return {tasks:await db.loadTasks(),settings:await db.loadUserSettings(),bytes:await(await db.getAttachmentBlob('restored-bytes'))?.text()}`)
  expect(result.tasks[0].id).toBe('restored'); expect(result.settings[0].greeting).toBe('恢复问候'); expect(result.bytes).toBe('restored')
})

test('a cache quota failure during recovery cannot mount stale state or overwrite the committed restore', async ({ page }) => {
  await databaseCall(page, `await db.replaceZingData({tasks:[{id:'restored'}],${emptyRestore},attachments:[],settings:{id:'settings',greeting:'durable'}});`)
  await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('test quota', 'QuotaExceededError') } })
  await page.goto('/')
  await expect(page.locator('body')).toContainText('无法安全读取本地设置')
  await expect(page.locator('.bottom-nav')).toHaveCount(0)
  const result = await databaseCall<any>(page, 'return {tasks:await db.loadTasks(),settings:await db.loadUserSettings()}')
  expect(result.tasks).toEqual([{ id: 'restored' }]); expect(result.settings[0].greeting).toBe('durable')
})

test('legacy installs with no settings row retain their local preference format', async ({ page }) => {
  await page.evaluate(() => { localStorage.setItem('zing:dateFormat', 'mdy'); localStorage.setItem('zing:greeting', 'legacy') })
  await page.goto('/')
  await expect(page.locator('.bottom-nav')).toBeVisible()
  await expect.poll(async () => (await databaseCall<any[]>(page, 'return db.loadUserSettings()'))[0]?.dateFormat).toBe('mdy')
  expect(await page.evaluate(() => localStorage.getItem('zing:greeting'))).toBe('legacy')
})
