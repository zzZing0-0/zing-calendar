import { expect, test, type BrowserContext } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { makeZip, readZingZip } from '../../src/domain/backup'
import { validateBackupSettings } from '../../src/domain/backupValidation'
import { normalizedIncomingSettings } from '../../src/domain/settings'
import { databaseCall, nav, stamp, startV217, testHabit } from '../helpers/v217Harness'

test.use({timezoneId:'Asia/Shanghai'})

test('legacy settings and cache default to midnight; invalid cutoff rejects backup and sync settings',async({page})=>{
  expect(normalizedIncomingSettings({id:'settings'} as any).habitDayStart).toBe('00:00')
  expect(normalizedIncomingSettings({habitDayStart:'05:00'} as any).habitDayStart).toBe('05:00')
  expect(()=>validateBackupSettings({})).not.toThrow()
  for(const value of ['25:00','05:60','5:00',5,null]) expect(()=>validateBackupSettings({habitDayStart:value})).toThrow('habitDayStart')
  await startV217(page)
  await databaseCall(page,"const [s]=await db.loadUserSettings();delete s.habitDayStart;await db.saveUserSettings([s]);")
  await page.evaluate(()=>localStorage.setItem('zing:habitDayStart','05:00'))
  await page.reload();await nav(page,'设置');await expect(page.getByLabel('习惯日开始时间')).toHaveValue('00:00')
})

test('old backups restore midnight rather than stale cutoff, preserve old unranked habits and history',async({page})=>{
  const h=testHabit('old'),row={id:'record',habitId:'old',occurredDate:'2026-10-20',quantity:2,createdAt:stamp,updatedAt:stamp}
  await startV217(page,{habits:[h],checkIns:[row]});await nav(page,'设置')
  const pending=page.waitForEvent('download');await page.locator('.backup-export-row').click();const file=await pending
  const entries=await readZingZip(new File([await readFile((await file.path())!)],'current.zip'))
  const s=JSON.parse(new TextDecoder().decode(entries.get('data/settings.json')));delete s.habitDayStart
  entries.set('data/settings.json',new TextEncoder().encode(JSON.stringify(s)))
  const bytes=Buffer.from(await makeZip([...entries].map(([path,bytes])=>({path,bytes}))).arrayBuffer())
  await page.getByLabel('习惯日开始时间').fill('05:00')
  await expect.poll(()=>databaseCall<any[]>(page,'return await db.loadUserSettings()')).toMatchObject([{habitDayStart:'05:00'}])
  await page.locator('.backup-file-input').setInputFiles({name:'legacy.zip',mimeType:'application/zip',buffer:bytes})
  await page.getByRole('button',{name:'恢复此备份',exact:true}).click();await expect(page.getByLabel('习惯日开始时间')).toHaveValue('00:00')
  expect(await databaseCall(page,'return await db.loadHabitCheckIns()')).toEqual([row])
  expect(await databaseCall(page,'return await db.loadHabits()')).toEqual([h])
  await page.reload();await nav(page,'设置');await expect(page.getByLabel('习惯日开始时间')).toHaveValue('00:00')
})

async function githubMock(context:BrowserContext,cloud:{json?:string;sha:number}) {
  await context.route('**/api/github-sync',async route=>{
    const input=JSON.parse(route.request().postData()||'{}')
    if(input.method==='GET'&&input.path.includes('/contents/')) {
      if(!cloud.json)return route.fulfill({status:404,body:'missing'})
      return route.fulfill({contentType:'application/json',body:JSON.stringify({type:'file',encoding:'base64',content:Buffer.from(cloud.json).toString('base64'),sha:String(cloud.sha)})})
    }
    if(input.method==='PUT'&&input.path.includes('/contents/')) {
      const body=JSON.parse(input.body)
      if(cloud.json&&body.sha!==String(cloud.sha))return route.fulfill({status:409,body:'conflict'})
      cloud.json=Buffer.from(body.content,'base64').toString('utf8');cloud.sha++
      return route.fulfill({status:201,contentType:'application/json',body:'{}'})
    }
    return route.fulfill({status:500,body:'Unexpected mock request'})
  })
}

test('GitHub sync carries cutoff and habit ranks across devices without losing check-ins or unrelated habits',async({browser})=>{
  const a=await browser.newContext({timezoneId:'Asia/Shanghai'}),b=await browser.newContext({timezoneId:'Asia/Shanghai'})
  const pa=await a.newPage(),pb=await b.newPage(),cloud={json:undefined as string|undefined,sha:0}
  const row={id:'sync-row',habitId:'A',occurredDate:'2026-10-24',quantity:2,createdAt:stamp,updatedAt:stamp}
  await startV217(pa,{habits:['A','B'].map(id=>testHabit(id)),checkIns:[row],time:'2026-10-25T12:00:00+08:00'})
  await startV217(pb,{habits:[testHabit('C')],time:'2026-10-24T12:00:00+08:00'})
  await githubMock(a,cloud);await githubMock(b,cloud)
  await nav(pa,'习惯');await pa.getByRole('button',{name:'拖动B排序',exact:true}).press('ArrowUp')
  await nav(pa,'设置');await pa.getByLabel('习惯日开始时间').fill('05:00')
  await expect.poll(()=>databaseCall<any[]>(pa,'return await db.loadUserSettings()')).toMatchObject([{habitDayStart:'05:00'}])
  await expect.poll(()=>databaseCall<any[]>(pa,'return await db.loadHabits()')).toMatchObject([{id:'A',sortOrder:1},{id:'B',sortOrder:0}])
  const expression="return await db.syncWithGitHub({owner:'test-owner',repo:'test-ledger',branch:'main',token:'isolated-test-token'})"
  await databaseCall(pa,expression)
  const bundle=JSON.parse(cloud.json!)
  expect(bundle.records.find((r:any)=>r.entityType==='settings').payload.habitDayStart).toBe('05:00')
  expect(bundle.records.find((r:any)=>r.entityType==='habit'&&r.entityId==='B').payload.sortOrder).toBe(0)
  await databaseCall(pb,expression)
  expect(await databaseCall(pb,'return await db.loadHabitCheckIns()')).toEqual([row])
  expect((await databaseCall<any[]>(pb,'return await db.loadHabits()')).find(h=>h.id==='C')).toEqual(testHabit('C'))
  await pb.reload();await nav(pb,'设置');await expect(pb.getByLabel('习惯日开始时间')).toHaveValue('05:00')
  await nav(pb,'习惯');await expect(pb.locator('.habit-card-main strong')).toHaveText(['B','C','A'])
  await expect(pb.getByRole('region',{name:'未完成',exact:true}).locator('.habit-card-main strong')).toHaveText(['B','C'])
  await expect(pb.getByRole('region',{name:'已完成',exact:true}).locator('.habit-card-main strong')).toHaveText(['A'])
  await a.close();await b.close()
})
