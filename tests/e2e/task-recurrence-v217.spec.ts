import { expect, test, type Page } from '@playwright/test'
import { databaseCall, startV217, showToday, stamp } from '../helpers/v217Harness'
import { materializeOccurrence } from '../../src/domain/task'

test.use({timezoneId:'Asia/Shanghai'})
const series=(rule:any={unit:'day',interval:1})=>({id:'series',title:'重复测试',date:'2026-10-20',allDay:false,priority:1,status:'todo',tagIds:['default'],attachments:[],recurrence:rule,recurrenceExceptions:{'2026-10-21':{status:'completed',completedAt:'2026-10-21T02:00:00Z',updatedAt:'2026-10-21T02:00:00Z'}},createdAt:stamp,updatedAt:stamp})
const tasks=(page:Page)=>databaseCall<any[]>(page,'return await db.loadTasks()')
async function editOccurrence(page:Page,title='重复测试') {
  await showToday(page)
  await page.locator('.day-drawer .task-item').filter({hasText:title}).locator('.task-title').click()
  await page.getByRole('dialog').filter({has:page.getByRole('button',{name:'编辑',exact:true})}).getByRole('button',{name:'编辑',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'任务详情',exact:true});await expect(editor).toBeVisible();return editor
}
async function createEditor(page:Page) {
  await showToday(page);await page.locator('.day-drawer').getByRole('button',{name:'＋ 添加任务',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'添加任务',exact:true});await editor.getByPlaceholder('要做什么？').fill('新重复');return editor
}
for(const [preset,unit] of [['daily','day'],['weekly','week'],['monthly','month'],['yearly','year']] as const) {
  test(`creates ${preset} recurrence only for scheduled tasks and persists after refresh`,async({page})=>{
    await startV217(page);const editor=await createEditor(page)
    await editor.getByLabel('安排日期',{exact:true}).uncheck();await expect(editor.getByLabel('重复',{exact:true})).toHaveCount(0)
    await editor.getByLabel('安排日期',{exact:true}).check();await editor.getByLabel('重复',{exact:true}).selectOption(preset)
    await editor.getByRole('button',{name:'保存任务',exact:true}).click()
    await expect.poll(async()=> (await tasks(page))[0]?.recurrence?.unit).toBe(unit)
    const before=(await tasks(page))[0];expect(before.recurrence.interval).toBe(1)
    if(unit==='week')expect(before.recurrence.weekdays).toEqual([6])
    await page.reload();expect((await tasks(page))[0]).toEqual(before)
  })
}

test('custom interval, weekdays and end count save and fill back without altering history',async({page})=>{
  const old=series({unit:'week',interval:2,weekdays:[2,6],end:{type:'count',count:9}})
  await startV217(page,{tasks:[old]});const editor=await editOccurrence(page)
  await expect(editor.getByLabel('重复',{exact:true})).toHaveValue('custom');await expect(editor.getByLabel('重复间隔',{exact:true})).toHaveValue('2')
  await expect(editor.getByRole('button',{name:'周三',exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(editor.getByRole('button',{name:'周日',exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(editor.getByLabel('结束条件')).toHaveValue('count');await expect(editor.getByLabel('重复次数')).toHaveValue('9')
  await editor.getByLabel('重复间隔',{exact:true}).fill('3');await editor.getByLabel('重复次数').fill('12')
  await editor.getByRole('button',{name:'保存修改',exact:true}).click();await page.getByRole('button',{name:'整个系列',exact:true}).click()
  await expect.poll(async()=>(await tasks(page))[0].recurrence.interval).toBe(3)
  const next=(await tasks(page))[0]
  expect(next.recurrence).toEqual({unit:'week',interval:3,weekdays:[2,6],end:{type:'count',count:12}})
  expect(next.recurrenceExceptions).toEqual(old.recurrenceExceptions)
})

test('dated ending fills back; invalid ending is blocked; cross-date repetitions retain duration',async({page})=>{
  await startV217(page);const editor=await createEditor(page)
  await editor.getByLabel('跨日期',{exact:true}).check();await editor.getByLabel('开始日期',{exact:true}).fill('2026-10-25');await editor.getByLabel('结束日期 · 可选',{exact:true}).fill('2026-10-27')
  await editor.getByLabel('重复',{exact:true}).selectOption('daily');await editor.getByLabel('结束条件').selectOption('date')
  await editor.getByLabel('重复结束日期').fill('2026-10-24');await expect(editor.getByRole('button',{name:'保存任务',exact:true})).toBeDisabled()
  await editor.getByLabel('重复结束日期').fill('2026-11-02');await editor.getByRole('button',{name:'保存任务',exact:true}).click()
  await expect.poll(async()=>(await tasks(page)).length).toBe(1)
  const stored=(await tasks(page))[0];expect(stored.endDate).toBe('2026-10-27');expect(materializeOccurrence(stored,'2026-10-26')?.endDate).toBe('2026-10-28')
  await page.locator('.day-drawer .task-item').filter({hasText:'新重复'}).first().locator('.task-title').click();await page.getByRole('button',{name:'编辑',exact:true}).click()
  const edit=page.getByRole('dialog',{name:'任务详情',exact:true});await expect(edit.getByLabel('结束条件')).toHaveValue('date');await expect(edit.getByLabel('重复结束日期')).toHaveValue('2026-11-02')
})

test('only-this edit creates an exception; stopping repeat preserves earlier completion',async({page})=>{
  const old=series();await startV217(page,{tasks:[old]});let editor=await editOccurrence(page)
  await editor.getByPlaceholder('要做什么？').fill('仅本次标题');await editor.getByRole('button',{name:'保存修改',exact:true}).click();await page.getByRole('button',{name:'仅本次',exact:true}).click()
  await expect.poll(async()=>(await tasks(page))[0].recurrenceExceptions['2026-10-25']?.title).toBe('仅本次标题')
  expect((await tasks(page))[0].title).toBe('重复测试')
  await page.reload()
  editor=await editOccurrence(page,'仅本次标题');await editor.getByRole('button',{name:'停止重复',exact:true}).click()
  await expect.poll(async()=>(await tasks(page))[0].recurrence.end).toEqual({type:'date',date:'2026-10-25'})
  expect((await tasks(page))[0].recurrenceExceptions['2026-10-21']).toEqual(old.recurrenceExceptions['2026-10-21'])
})

test('changing to no-repeat ends series before selected day and retains a single task',async({page})=>{
  const old=series();await startV217(page,{tasks:[old]});const editor=await editOccurrence(page)
  await editor.getByLabel('重复',{exact:true}).selectOption('none');await editor.getByRole('button',{name:'保存修改',exact:true}).click()
  await expect(page.getByRole('heading',{name:'改为单次任务？'})).toBeVisible();await page.getByRole('button',{name:'改为单次任务',exact:true}).click()
  await expect.poll(async()=>(await tasks(page)).length).toBe(2)
  const rows=await tasks(page);expect(rows.find(t=>t.id==='series').recurrence.end).toEqual({type:'date',date:'2026-10-24'})
  expect(rows.find(t=>t.id!=='series')).toMatchObject({date:'2026-10-25',title:'重复测试'})
  expect(rows.find(t=>t.id!=='series').recurrence).toBeUndefined()
  expect(rows.find(t=>t.id==='series').recurrenceExceptions).toEqual(old.recurrenceExceptions)
})
for(const scope of ['仅本次','本次及以后','整个系列'] as const) {
  test(`recurring delete ${scope} retains prior history and existing trash semantics`,async({page})=>{
    const old=series();await startV217(page,{tasks:[old]});const editor=await editOccurrence(page)
    await editor.getByRole('button',{name:'删除',exact:true}).click();await page.getByRole('button',{name:scope,exact:true}).click()
    await expect.poll(async()=>{const t=(await tasks(page))[0];return scope==='仅本次'?!!t.recurrenceExceptions['2026-10-25']?.trashedAt:scope==='本次及以后'?!!t.trashFuture:!!t.trashedAt}).toBe(true)
    const t=(await tasks(page))[0];expect(t.recurrenceExceptions['2026-10-21']).toEqual(old.recurrenceExceptions['2026-10-21'])
    expect(t.recurrence).toEqual(old.recurrence)
  })
}

test('custom weekly creation stores explicitly chosen weekdays and the date ending',async({page})=>{
  await startV217(page);const editor=await createEditor(page)
  await editor.getByLabel('重复',{exact:true}).selectOption('custom');await editor.getByLabel('重复单位',{exact:true}).selectOption('week')
  await editor.getByLabel('重复间隔',{exact:true}).fill('2')
  await editor.getByRole('button',{name:'周日',exact:true}).click();await editor.getByRole('button',{name:'周二',exact:true}).click();await editor.getByRole('button',{name:'周五',exact:true}).click()
  await editor.getByLabel('结束条件').selectOption('date');await editor.getByLabel('重复结束日期').fill('2026-12-31')
  await editor.getByRole('button',{name:'保存任务',exact:true}).click()
  await expect.poll(async()=>(await tasks(page))[0]?.recurrence).toEqual({unit:'week',interval:2,weekdays:[1,4],end:{type:'date',date:'2026-12-31'}})
})

test('single weekday different from series start fills back as custom without changing that weekday',async({page})=>{
  const old=series({unit:'week',interval:1,weekdays:[6]});await startV217(page,{tasks:[old]});const editor=await editOccurrence(page)
  await expect(editor.getByLabel('重复',{exact:true})).toHaveValue('custom');await expect(editor.getByRole('button',{name:'周日',exact:true})).toHaveAttribute('aria-pressed','true')
  await editor.getByRole('button',{name:'保存修改',exact:true}).click();await page.getByRole('button',{name:'整个系列',exact:true}).click()
  await expect(editor).toBeHidden()
  await expect.poll(async()=>(await tasks(page))[0].updatedAt).not.toBe(old.updatedAt)
  expect((await tasks(page))[0].recurrence).toEqual(old.recurrence)
  expect((await tasks(page))[0].recurrenceExceptions).toEqual(old.recurrenceExceptions)
})

test('this-and-future edit splits series while retaining completed past occurrences',async({page})=>{
  const old=series();await startV217(page,{tasks:[old]});const editor=await editOccurrence(page)
  await editor.getByPlaceholder('要做什么？').fill('以后标题');await editor.getByRole('button',{name:'保存修改',exact:true}).click();await page.getByRole('button',{name:'本次及以后',exact:true}).click()
  await expect.poll(async()=>(await tasks(page)).length).toBe(2)
  const rows=await tasks(page),past=rows.find(t=>t.id==='series'),future=rows.find(t=>t.id!=='series')
  expect(past.recurrence.end).toEqual({type:'date',date:'2026-10-24'});expect(past.recurrenceExceptions).toEqual(old.recurrenceExceptions)
  expect(future).toMatchObject({title:'以后标题',date:'2026-10-25',recurrence:{unit:'day',interval:1}})
})
