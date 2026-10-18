import { expect, test } from '@playwright/test'
import { databaseCall, safetyHarness } from '../helpers/safetyHarness'

test('a note read failure cannot overwrite persisted notes or collect their attachments', async ({page})=>{
  await safetyHarness(page)
  await databaseCall(page,`await db.saveNotes([{id:'kept',title:'保留笔记',notebookId:'notebook:default',attachments:[{storageKey:'blob:kept',type:'image'}]}]);await db.putAttachmentBlob('blob:kept',new Blob(['keep']));`)
  await page.addInitScript(()=>{
    const global=window as any
    global.originalGetAll=IDBObjectStore.prototype.getAll
    global.noteClears=0
    const clear=IDBObjectStore.prototype.clear
    IDBObjectStore.prototype.getAll=function(...args:any[]){
      if(this.name==='notes') throw new DOMException('isolated read failure','UnknownError')
      return global.originalGetAll.apply(this,args)
    }
    IDBObjectStore.prototype.clear=function(){if(this.name==='notes')global.noteClears++;return clear.call(this)}
  })
  const failure=page.waitForEvent('console',{predicate:message=>message.type()==='error'&&message.text().includes('Failed to load notes')})
  await page.goto('/');await failure
  await page.locator('.bottom-nav').getByRole('button',{name:'设置',exact:true}).click()
  await expect(page.locator('.settings-page')).toBeVisible()
  const result=await page.evaluate(async()=>{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    const global=window as any
    IDBObjectStore.prototype.getAll=global.originalGetAll
    const db=await import('/src/db/calendar.ts')
    return {clears:global.noteClears,notes:await db.loadNotes(),blob:await (await db.getAttachmentBlob('blob:kept'))?.text()}
  })
  expect(result.clears).toBe(0)
  expect(result.notes[0]).toMatchObject({id:'kept',title:'保留笔记'})
  expect(result.blob).toBe('keep')
})

for(const mode of ['stopwatch','countdown'] as const){
  test(`interrupted ${mode} focus recovers at its original limit without duplicate sessions`,async({page})=>{
    await safetyHarness(page)
    const startedAt=new Date(Date.now()-24*60*60*1000).toISOString()
    await databaseCall(page,`await db.saveFocusSessions([{id:'interrupted',mode:'${mode}',plannedSeconds:1800,tagIds:['default'],startedAt:'${startedAt}',createdAt:'${startedAt}',updatedAt:'${startedAt}'}]);`)
    await page.goto('/')
    await expect.poll(()=>databaseCall<boolean>(page,"return Boolean((await db.loadFocusSessions()).find(s=>s.id==='interrupted')?.endedAt)")).toBe(true)
    const before=await databaseCall<any[]>(page,'return db.loadFocusSessions()')
    expect(before).toHaveLength(1)
    const expected=mode==='countdown'?1800:7200
    expect(before[0].durationSeconds).toBe(expected)
    expect(Date.parse(before[0].endedAt)-Date.parse(startedAt)).toBe(expected*1000)
    await page.reload()
    await expect.poll(()=>databaseCall<any[]>(page,'return db.loadFocusSessions()')).toEqual(before)
  })
}

test('an offline task created through the real UI is durable after reconnect and reload',async({page,context})=>{
  await safetyHarness(page);await page.goto('/')
  await page.locator('.continuous-calendar .day-cell.today').first().click()
  await context.setOffline(true)
  const drawer=page.locator('.day-drawer')
  await drawer.getByRole('button',{name:'＋ 添加任务',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'添加任务',exact:true})
  await editor.getByPlaceholder('要做什么？').fill('隔离的离线任务')
  await editor.getByRole('button',{name:'保存任务',exact:true}).click()
  await expect(drawer.locator('.task-item').filter({hasText:'隔离的离线任务'})).toBeVisible()
  await expect.poll(()=>databaseCall<any[]>(page,"return (await db.loadTasks()).filter(t=>t.title==='隔离的离线任务')")).toHaveLength(1)
  await context.setOffline(false);await page.reload()
  await page.locator('.continuous-calendar .day-cell.today').first().click()
  await expect(drawer.locator('.task-item').filter({hasText:'隔离的离线任务'})).toBeVisible()
})
