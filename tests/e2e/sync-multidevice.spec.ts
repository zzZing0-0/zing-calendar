import { expect, test, type BrowserContext, type Page } from '@playwright/test'

type Bundle = { protocolVersion: 1; exportedAt: string; deviceId: string; records: any[]; tombstones: any[] }
const emptyRemote = (): Bundle => ({ protocolVersion: 1, exportedAt: '2026-10-04T00:00:00.000Z', deviceId: 'remote', records: [], tombstones: [] })

async function attachFakeSyncServer(context: BrowserContext, remote: { bundle: Bundle }) {
  await context.route('**/api/sync/bundle', async route => {
    const request = route.request()
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(remote.bundle) })
    if (request.method() === 'PUT') {
      remote.bundle = JSON.parse(request.postData() || '{}') as Bundle
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(remote.bundle) })
    }
    return route.fulfill({ status: 405 })
  })
}

async function moduleCall<T>(page: Page, expression: string): Promise<T> {
  return page.evaluate(async expression => {
    const db: any = await import('/src/db/calendar.ts')
    return await Function('db', `return (async()=>(${expression}))()`)(db)
  }, expression) as Promise<T>
}

async function saveTask(page: Page, id: string, title: string, updatedAt: string) {
  await moduleCall(page, `db.saveTasks([{id:${JSON.stringify(id)},title:${JSON.stringify(title)},date:'2026-10-04',updatedAt:${JSON.stringify(updatedAt)}}])`)
}
async function tasks(page: Page) { return moduleCall<any[]>(page, 'db.loadTasks()') }
async function sync(page: Page) { return moduleCall(page, `db.syncRoundTrip({baseUrl:location.origin})`) }

async function tombstoneTask(page: Page, id: string, deletedAt: string, deviceId: string) {
  await moduleCall(page, `(async()=>{await db.saveTasks([]);await db.saveSyncTombstone({key:'task:${id}',entityType:'task',entityId:${JSON.stringify(id)},deletedAt:${JSON.stringify(deletedAt)},deviceId:${JSON.stringify(deviceId)}})})()`)
}

test.describe('multi-device sync integration regression', () => {
  test('notes and notebooks participate in the sync transaction and converge across devices', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await moduleCall(pa, `(async()=>{
      await db.saveNotebooks([{id:'nb-sync',name:'计划',order:1,createdAt:'2026-10-07T01:00:00.000Z',updatedAt:'2026-10-07T01:00:00.000Z'}]);
      await db.saveNotes([{id:'note-sync',notebookId:'nb-sync',title:'英语计划',content:'# Plan',active:true,activeOrder:1,tagIds:[],attachments:[],createdAt:'2026-10-07T01:01:00.000Z',updatedAt:'2026-10-07T01:01:00.000Z'}]);
    })()`);
    await sync(pa); await sync(pb)
    const notebooks = await moduleCall<any[]>(pb, 'db.loadNotebooks()')
    const notes = await moduleCall<any[]>(pb, 'db.loadNotes()')
    expect(notebooks.find(x => x.id === 'nb-sync')?.name).toBe('计划')
    expect(notes.find(x => x.id === 'note-sync')?.content).toBe('# Plan')
    await a.close(); await b.close()
  })

  test('device A upload is pulled by isolated device B', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await saveTask(pa, 'shared', 'from A', '2026-10-04T10:00:00.000Z'); await sync(pa); await sync(pb)
    expect((await tasks(pb)).find(x => x.id === 'shared')?.title).toBe('from A')
    await a.close(); await b.close()
  })

  test('concurrent independent additions converge without losing either device data', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await saveTask(pa, 'a', 'A only', '2026-10-04T10:00:00.000Z')
    await saveTask(pb, 'b', 'B only', '2026-10-04T10:01:00.000Z')
    await sync(pa); await sync(pb); await sync(pa)
    expect((await tasks(pa)).map(x => x.id).sort()).toEqual(['a', 'b'])
    expect((await tasks(pb)).map(x => x.id).sort()).toEqual(['a', 'b'])
    await a.close(); await b.close()
  })

  test('newer edit wins and both devices converge to it', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await saveTask(pa, 'same', 'older A', '2026-10-04T10:00:00.000Z'); await sync(pa); await sync(pb)
    await saveTask(pa, 'same', 'A edit', '2026-10-04T11:00:00.000Z')
    await saveTask(pb, 'same', 'newer B edit', '2026-10-04T12:00:00.000Z')
    await sync(pa); await sync(pb); await sync(pa)
    expect((await tasks(pa))[0].title).toBe('newer B edit')
    expect((await tasks(pb))[0].title).toBe('newer B edit')
    await a.close(); await b.close()
  })

  test('newer deletion propagates and does not resurrect on the other device', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await saveTask(pa, 'gone', 'delete me', '2026-10-04T10:00:00.000Z'); await sync(pa); await sync(pb)
    await tombstoneTask(pa, 'gone', '2026-10-04T12:00:00.000Z', 'A'); await sync(pa); await sync(pb); await sync(pa)
    expect((await tasks(pa)).find(x => x.id === 'gone')).toBeUndefined()
    expect((await tasks(pb)).find(x => x.id === 'gone')).toBeUndefined()
    expect(remote.bundle.tombstones.some(x => x.key === 'task:gone')).toBeTruthy()
    await a.close(); await b.close()
  })

  test('later recreation beats an older tombstone and converges as live data', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await saveTask(pa, 'reborn', 'original', '2026-10-04T10:00:00.000Z'); await sync(pa); await sync(pb)
    await tombstoneTask(pa, 'reborn', '2026-10-04T11:00:00.000Z', 'A'); await sync(pa)
    await saveTask(pb, 'reborn', 'recreated', '2026-10-04T12:00:00.000Z'); await sync(pb); await sync(pa)
    expect((await tasks(pa)).find(x => x.id === 'reborn')?.title).toBe('recreated')
    expect(remote.bundle.records.some(x => x.entityType === 'task' && x.entityId === 'reborn')).toBeTruthy()
    await a.close(); await b.close()
  })

  test('repeating sync with no changes is idempotent', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await saveTask(pa, 'stable', 'stable', '2026-10-04T10:00:00.000Z'); await sync(pa); await sync(pb)
    const before = JSON.stringify(remote.bundle.records.map(({entityType,entityId,updatedAt,payload})=>({entityType,entityId,updatedAt,payload})))
    await sync(pa); await sync(pb)
    const after = JSON.stringify(remote.bundle.records.map(({entityType,entityId,updatedAt,payload})=>({entityType,entityId,updatedAt,payload})))
    expect(after).toBe(before)
    expect((await tasks(pa)).filter(x => x.id === 'stable')).toHaveLength(1)
    expect((await tasks(pb)).filter(x => x.id === 'stable')).toHaveLength(1)
    await a.close(); await b.close()
  })
})

// A deliberately heterogeneous fixture: Unicode/emoji, multiline text, date-keyed
// records, recurrence-like task fields, journal metadata and focus history travel
// together through two isolated IndexedDB databases and one shared cloud ledger.
test.describe('golden multi-device data-safety fixture', () => {
  test('heterogeneous life data survives A → cloud → B without semantic loss', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await moduleCall(pa, `(async()=>{
      await db.saveTasks([{id:'gold-task',title:'跨日任务 🐱',date:'2026-10-04',endDate:'2026-10-06',priority:2,status:'todo',allDay:true,notes:'第一行\\n☐ checklist',createdAt:'2026-10-04T08:00:00.000Z',updatedAt:'2026-10-04T10:00:00.000Z',tagIds:['default'],attachments:[],attachmentLinkTombstones:{}}]);
      await db.saveJournalEntries([{id:'gold-journal',date:'2026-10-04',time:'21:30',title:'记录 🌈',content:'**Markdown**\\n中文 + emoji 🐈',impact:2,createdAt:'2026-10-04T13:30:00.000Z',updatedAt:'2026-10-04T13:31:00.000Z',tagIds:['default'],attachments:[],attachmentLinkTombstones:{}}]);
      await db.saveDailyMoods([{date:'2026-10-04',level:4,updatedAt:'2026-10-04T13:32:00.000Z'}]);
      await db.saveDailyEnergy([{date:'2026-10-04',level:2,updatedAt:'2026-10-04T13:33:00.000Z'}]);
      await db.saveDailyEnvironment([{date:'2026-10-04',weatherOptionId:'weather:sunny',thermalOptionId:'thermal:comfortable',locationCity:'上海',locationCountry:'中国',updatedAt:'2026-10-04T13:34:00.000Z'}]);
      await db.saveMenstrualPeriods([{id:'gold-period',startDate:'2026-10-01',endDate:'2026-10-05',dayLogs:[{date:'2026-10-02',notes:'day 2'}],createdAt:'2026-10-01T00:00:00.000Z',updatedAt:'2026-10-05T00:00:00.000Z'}]);
      await db.saveAnniversaries([{id:'gold-ann',title:'纪念日 🎂',type:'birthday',calendar:'solar',year:2000,month:2,day:29,repeatYearly:true,createdAt:'2026-10-04T00:00:00.000Z',updatedAt:'2026-10-04T00:00:00.000Z'}]);
      await db.saveFocusSessions([{id:'gold-focus',tagIds:['default'],mode:'countdown',plannedSeconds:1500,startedAt:'2026-10-04T14:00:00.000Z',endedAt:'2026-10-04T14:25:00.000Z',durationSeconds:1500,createdAt:'2026-10-04T14:00:00.000Z',updatedAt:'2026-10-04T14:25:00.000Z'}]);
    })()`)
    await sync(pa); await sync(pb)
    const snapshot = await moduleCall<any>(pb, `(async()=>({tasks:await db.loadTasks(),journals:await db.loadJournalEntries(),moods:await db.loadDailyMoods(),energy:await db.loadDailyEnergy(),environment:await db.loadDailyEnvironment(),periods:await db.loadMenstrualPeriods(),anniversaries:await db.loadAnniversaries(),focus:await db.loadFocusSessions()}))()`)
    expect(snapshot.tasks.find((x:any)=>x.id==='gold-task')).toMatchObject({title:'跨日任务 🐱',endDate:'2026-10-06',notes:'第一行\n☐ checklist'})
    expect(snapshot.journals.find((x:any)=>x.id==='gold-journal')).toMatchObject({title:'记录 🌈',content:'**Markdown**\n中文 + emoji 🐈',impact:2})
    expect(snapshot.moods.find((x:any)=>x.date==='2026-10-04')?.level).toBe(4)
    expect(snapshot.energy.find((x:any)=>x.date==='2026-10-04')?.level).toBe(2)
    expect(snapshot.environment.find((x:any)=>x.date==='2026-10-04')).toMatchObject({locationCity:'上海',locationCountry:'中国'})
    expect(snapshot.periods.find((x:any)=>x.id==='gold-period')?.dayLogs).toEqual([{date:'2026-10-02',notes:'day 2'}])
    expect(snapshot.anniversaries.find((x:any)=>x.id==='gold-ann')).toMatchObject({year:2000,month:2,day:29})
    expect(snapshot.focus.find((x:any)=>x.id==='gold-focus')).toMatchObject({plannedSeconds:1500,durationSeconds:1500})
    await a.close(); await b.close()
  })

  test('attachment metadata survives a concurrent unrelated task edit', async ({ browser }) => {
    const remote = { bundle: emptyRemote() }, a = await browser.newContext(), b = await browser.newContext()
    await attachFakeSyncServer(a, remote); await attachFakeSyncServer(b, remote)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await moduleCall(pa, `db.saveTasks([{id:'attach',title:'original',date:'2026-10-04',updatedAt:'2026-10-04T10:00:00.000Z',attachments:[{id:'a1',type:'image',filename:'猫咪.png',mimeType:'image/png',size:4,storageKey:'blob:cat',createdAt:'2026-10-04T10:00:00.000Z'}],attachmentLinkTombstones:{}}])`)
    await sync(pa); await sync(pb)
    await moduleCall(pb, `(async()=>{const rows=await db.loadTasks();await db.saveTasks(rows.map(x=>x.id==='attach'?{...x,title:'edited on B',updatedAt:'2026-10-04T11:00:00.000Z'}:x))})()`)
    await sync(pb); await sync(pa)
    const row = (await tasks(pa)).find(x=>x.id==='attach')
    expect(row.title).toBe('edited on B')
    expect(row.attachments).toHaveLength(1)
    expect(row.attachments[0]).toMatchObject({storageKey:'blob:cat',filename:'猫咪.png',size:4})
    await a.close(); await b.close()
  })
})
