import { expect, test } from '@playwright/test'
import { databaseCall, safetyHarness, seedTask } from '../helpers/safetyHarness'

test.beforeEach(async ({ page }) => { await safetyHarness(page) })

for (const failure of ['missing-key', 'uncloneable']) {
  test(`a synchronous ${failure} failure rolls back the entire store replacement`, async ({ page }) => {
    await seedTask(page)
    const result = await databaseCall<any>(page, `
      let failed=false;
      try { await db.saveTasks([{id:'partial',title:'must rollback'},${failure === 'missing-key' ? "{title:'missing id'}" : "{id:'bad',callback:()=>{}}"}]); } catch { failed=true; }
      return {failed,rows:await db.loadTasks()};`)
    expect(result.failed).toBe(true)
    expect(result.rows).toEqual([{ id:'original', title:'原始数据', date:'2026-10-18', updatedAt:'2026-10-18T09:00:00.000Z' }])
  })
}

test('failed full restore retains every prior store and original attachment bytes', async ({ page }) => {
  await seedTask(page)
  const result = await databaseCall<any>(page, `
    await db.saveNotes([{id:'kept-note',title:'保留笔记'}]);
    await db.putAttachmentBlob('blob:original',new Blob(['keep']));
    let failed=false;
    try { await db.replaceZingData({tasks:[{id:'replacement'}],journals:[],notes:[{title:'invalid'}],moods:[],energies:[],environments:[],periods:[],tags:[],anniversaries:[],focusSessions:[],attachments:[]}); } catch { failed=true; }
    return {failed,tasks:await db.loadTasks(),notes:await db.loadNotes(),blob:await (await db.getAttachmentBlob('blob:original'))?.text()};`)
  expect(result.failed).toBe(true)
  expect(result.tasks[0].id).toBe('original')
  expect(result.notes).toEqual([{id:'kept-note',title:'保留笔记'}])
  expect(result.blob).toBe('keep')
})

test('duplicate keys are rejected before a destructive replacement', async ({ page }) => {
  await seedTask(page)
  const result = await databaseCall<any>(page, `let failed=false;try{await db.saveTasks([{id:'same',title:'a'},{id:'same',title:'b'}])}catch{failed=true}return {failed,rows:await db.loadTasks()}`)
  expect(result.failed).toBe(true)
  expect(result.rows[0].id).toBe('original')
})

test('schema v1 upgrades additively, retaining legacy records and attachment bytes', async ({ page }) => {
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('zing-calendar', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore('tasks', {keyPath:'id'}).put({id:'legacy',title:'旧任务',date:'2020-02-29'})
      db.createObjectStore('attachments').put(new Blob(['legacy-bytes']), 'legacy-key')
    }
    request.onerror=()=>reject(request.error)
    request.onsuccess=()=>{request.result.close();resolve()}
  }))
  const result=await databaseCall<any>(page, `return {tasks:await db.loadTasks(),notes:await db.loadNotes(),blob:await (await db.getAttachmentBlob('legacy-key'))?.text()}`)
  expect(result).toEqual({tasks:[{id:'legacy',title:'旧任务',date:'2020-02-29'}],notes:[],blob:'legacy-bytes'})
})

test('offline store edits survive reload and preserve repeated-task exception and focus context', async ({ page, context }) => {
  await seedTask(page)
  await context.setOffline(true)
  await databaseCall(page, `await db.saveTasks([{id:'offline',title:'离线编辑',date:'2026-10-18',recurrenceExceptions:{'2026-10-19':{status:'completed',attachments:[]}}}]);await db.saveFocusSessions([{id:'f',mode:'stopwatch',startedAt:'2026-10-18T09:00:00.000Z',context:{kind:'task',taskId:'offline'},tagIds:['default']}]);`)
  await context.setOffline(false)
  await page.reload()
  const result=await databaseCall<any>(page,'return {tasks:await db.loadTasks(),focus:await db.loadFocusSessions()}')
  expect(result.tasks[0]).toMatchObject({id:'offline',title:'离线编辑',recurrenceExceptions:{'2026-10-19':{status:'completed'}}})
  expect(result.focus[0].context).toEqual({kind:'task',taskId:'offline'})
})

test('local attachment cleanup rechecks persisted owners, including trash and recurrence exceptions', async ({ page }) => {
  const result=await databaseCall<any>(page, `
    await db.saveNotes([{id:'note',trashedAt:'2026-10-18T10:00:00.000Z',attachments:[{storageKey:'kept-note'}]}]);
    await db.saveTasks([{id:'series',recurrenceExceptions:{'2026-10-18':{trashedAt:'2026-10-18T10:00:00.000Z',attachments:[{storageKey:'kept-exception'}]}}}]);
    for (const key of ['kept-note','kept-exception','orphan']) await db.putAttachmentBlob(key,new Blob([key]));
    const removed=await db.cleanupOrphanAttachmentBlobs([]);
    return {removed,note:!!await db.getAttachmentBlob('kept-note'),exception:!!await db.getAttachmentBlob('kept-exception'),orphan:!!await db.getAttachmentBlob('orphan')};`)
  expect(result).toEqual({removed:1,note:true,exception:true,orphan:false})
})
