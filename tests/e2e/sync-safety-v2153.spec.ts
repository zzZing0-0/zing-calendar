import { expect, test, type Page } from '@playwright/test'
import { databaseCall, safetyHarness, seedTask } from '../helpers/safetyHarness'

const stamp='2026-10-18T10:00:00.000Z'
const config="{owner:'isolated',repo:'mock-ledger',branch:'main',token:'mock-token'}"
const taskRecord=()=>({entityType:'task',entityId:'original',updatedAt:stamp,payload:{id:'original',title:'远程修改',date:'2026-10-18',updatedAt:stamp}})
const bundle=(records:any[]=[taskRecord()])=>({protocolVersion:1,exportedAt:stamp,deviceId:'mock',records,tombstones:[]})

async function mockGitHub(page:Page, remote:any, onPut?:(request:any)=>Promise<{status:number;body?:string}>) {
  let writes=0
  await page.route('**/api/github-sync',async route=>{
    const envelope=route.request().postDataJSON()
    if(envelope.method==='GET') return route.fulfill({json:{type:'file',sha:'a'.repeat(40),encoding:'base64',content:Buffer.from(JSON.stringify(remote)).toString('base64')}})
    writes++
    const result=onPut?await onPut(JSON.parse(envelope.body)): {status:201,body:'{}'}
    return route.fulfill({status:result.status,body:result.body??'failed'})
  })
  return ()=>writes
}

test.beforeEach(async({page})=>{await safetyHarness(page);await seedTask(page)})

for(const status of [401,429,500]) {
  test(`GitHub upload HTTP ${status} preserves local records and the last successful checkpoint`,async({page})=>{
    await mockGitHub(page,bundle(),async()=>({status}))
    const result=await databaseCall<any>(page,`const before=await db.loadTasks();const state=await db.loadSyncState();let failed=false;try{await db.syncWithGitHub(${config})}catch{failed=true}return {failed,before,after:await db.loadTasks(),state,afterState:await db.loadSyncState(),recovery:await db.loadSyncRecoveryBundle()}`)
    expect(result.failed).toBe(true)
    expect(result.after).toEqual(result.before)
    expect(result.afterState).toEqual(result.state)
    expect(result.recovery).toBeUndefined()
  })
}

test('a lost network response leaves local records intact and the next explicit retry converges',async({page})=>{
  await page.route('**/api/github-sync', route=>route.abort('connectionreset'))
  const failed=await databaseCall<any>(page,`let failed=false;try{await db.syncWithGitHub(${config})}catch{failed=true}return {failed,rows:await db.loadTasks()}`)
  expect(failed.failed).toBe(true);expect(failed.rows[0].title).toBe('原始数据')
  await page.unroute('**/api/github-sync')
  await mockGitHub(page,bundle())
  await databaseCall(page,`await db.syncWithGitHub(${config});`)
  expect((await databaseCall<any[]>(page,'return db.loadTasks()'))[0].title).toBe('远程修改')
})

test('repeated SHA conflicts never apply an unacknowledged remote merge locally',async({page})=>{
  const writes=await mockGitHub(page,bundle(),async()=>({status:409}))
  const result=await databaseCall<any>(page,`let error='';try{await db.syncWithGitHub(${config})}catch(e){error=e.message}return {error,rows:await db.loadTasks()}`)
  expect(writes()).toBe(3)
  expect(result.error).toContain('冲突')
  expect(result.rows[0].title).toBe('原始数据')
})

for(const invalid of ['unknown-type','mismatched-id','duplicate','invalid-time']) {
  test(`malformed remote ${invalid} is rejected without a local write or cloud PUT`,async({page})=>{
    const remote=bundle()
    if(invalid==='unknown-type') remote.records[0].entityType='untrusted-store'
    if(invalid==='mismatched-id') remote.records[0].payload.id='other'
    if(invalid==='duplicate') remote.records.push({...remote.records[0]})
    if(invalid==='invalid-time') remote.records[0].updatedAt='not-a-date'
    const writes=await mockGitHub(page,remote)
    const result=await databaseCall<any>(page,`let failed=false;try{await db.syncWithGitHub(${config})}catch{failed=true}return {failed,rows:await db.loadTasks()}`)
    expect(result.failed).toBe(true);expect(writes()).toBe(0);expect(result.rows[0].title).toBe('原始数据')
  })
}

test('edits committed while upload is in flight survive the acknowledged merge',async({page})=>{
  await mockGitHub(page,bundle(),async()=>{
    await databaseCall(page,`await db.saveTasks([{id:'original',title:'上传期间编辑',date:'2026-10-18',updatedAt:'2026-10-18T11:00:00.000Z'}]);`)
    return {status:201}
  })
  await databaseCall(page,`await db.syncWithGitHub(${config});`)
  expect((await databaseCall<any[]>(page,'return db.loadTasks()'))[0].title).toBe('上传期间编辑')
})

test('successful replacement preserves a credential-free local pre-merge recovery bundle',async({page})=>{
  await mockGitHub(page,bundle())
  const result=await databaseCall<any>(page,`await db.saveGitHubDeviceCredential('isolated-secret');await db.syncWithGitHub(${config});return {recovery:await db.loadSyncRecoveryBundle(),rows:await db.loadTasks(),state:await db.loadSyncState()}`)
  expect(result.rows[0].title).toBe('远程修改')
  expect(result.recovery.records.find((r:any)=>r.entityId==='original').payload.title).toBe('原始数据')
  expect(JSON.stringify(result.recovery)).not.toContain('isolated-secret')
  expect(result.state.lastSuccessfulSyncAt).toBeTruthy()
})

test('attachment upload failure retains local bytes and references and reports a warning',async({page})=>{
  const key='attachment:12345678-1234-1234-1234-123456789abc'
  const remote=bundle();remote.records[0].payload.attachments=[{id:'a',storageKey:key,type:'image',filename:'test.webp',mimeType:'image/webp',size:4,createdAt:stamp}]
  await mockGitHub(page,remote)
  await page.route('**/api/b2-sign?**',route=>route.fulfill({json:{url:'https://b2.mock.invalid/only-test'}}))
  await page.route('https://b2.mock.invalid/**',route=>route.fulfill({status:route.request().method()==='GET'?404:503,body:'mock failure'}))
  const result=await databaseCall<any>(page,`await db.putAttachmentBlob('${key}',new Blob(['keep'],{type:'image/webp'}));const result=await db.syncWithGitHub(${config});return {result,bytes:await (await db.getAttachmentBlob('${key}')).text(),rows:await db.loadTasks()}`)
  expect(result.result.attachmentWarning).toContain('503')
  expect(result.bytes).toBe('keep')
  expect(result.rows[0].attachments[0].storageKey).toBe(key)
})
