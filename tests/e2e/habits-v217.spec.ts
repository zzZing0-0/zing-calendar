import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { databaseCall, nav, openHabit, showToday, stamp, startV217, testHabit } from '../helpers/v217Harness'
import { baseOrderedHabits, reorderHabitGroup } from '../../src/features/habits/habitOrder'
import { orderedDailyHabits } from '../../src/features/habits/habitDomain'

test.use({timezoneId:'Asia/Shanghai'})
const records=(page:Page)=>databaseCall<any[]>(page,'return await db.loadHabitCheckIns()')
const settings=(page:Page)=>databaseCall<any[]>(page,'return await db.loadUserSettings()')
const habitRows=(page:Page)=>databaseCall<any[]>(page,'return await db.loadHabits()')
const check=(date='2026-10-24')=>({id:'legacy-log',habitId:'A',occurredDate:date,quantity:2,createdAt:stamp,updatedAt:stamp})

for (const zone of ['Asia/Shanghai','UTC','America/Los_Angeles','Pacific/Kiritimati','Asia/Kolkata','America/New_York']) {
  test(`habit local day handles cutoff, midnight/month/year and DST in ${zone}`,async({browser})=>{
    const context=await browser.newContext({timezoneId:zone}),p=await context.newPage()
    await p.goto('/')
    const result=await p.evaluate(async()=>{
      const {habitDateKey,normalizeHabitDayStart}=await import('/src/domain/habitDay.ts')
      const run=(y:number,m:number,d:number,h:number,min:number,start='05:00')=>habitDateKey(new Date(y,m-1,d,h,min),start)
      return {before:run(2027,1,1,4,59),at:run(2027,1,1,5,0),after:run(2027,1,1,5,1),midnight:run(2027,1,1,0,0),month:run(2026,3,1,2,0),leap:run(2028,3,1,2,0),legacy:run(2027,1,1,0,0,'00:00'),dstSpring:run(2026,3,9,2,0),dstFall:run(2026,11,2,2,0),invalid:[null,'25:00','5:00','00:60'].map(normalizeHabitDayStart)}
    })
    expect(result).toEqual({before:'2026-12-31',at:'2027-01-01',after:'2027-01-01',midnight:'2026-12-31',month:'2026-02-28',leap:'2028-02-29',legacy:'2027-01-01',dstSpring:'2026-03-08',dstFall:'2026-11-01',invalid:['00:00','00:00','00:00','00:00']})
    await context.close()
  })
}

test('05:00 home quick check-in and today detail agree at 02:00; natural task/journal dates stay unchanged',async({page})=>{
  const task={id:'natural-task',title:'自然日期任务',date:'2026-10-25',priority:1,allDay:false,status:'todo',tagIds:['default'],attachments:[],createdAt:stamp,updatedAt:stamp}
  await startV217(page,{habits:[testHabit('A')],tasks:[task],start:'05:00',time:'2026-10-25T02:00:00+08:00'})
  await nav(page,'习惯');await page.locator('.habit-card').getByRole('button',{name:'＋ 打卡',exact:true}).click()
  await expect.poll(async()=>(await records(page))[0]?.occurredDate).toBe('2026-10-24')
  await expect(page.getByRole('region',{name:'已完成',exact:true})).toContainText('A')
  await nav(page,'日历');await showToday(page)
  await expect(page.locator('.habit-daily-row')).toContainText('✓ 已达标')
  await expect(page.locator('.day-drawer .task-item')).toContainText('自然日期任务')
  expect((await databaseCall<any[]>(page,'return await db.loadTasks()'))[0]).toEqual(task)
  await page.locator('.habit-daily-row').getByRole('button').click();await expect.poll(async()=>(await records(page))[0].deletedAt).toBeTruthy()
  await page.locator('.habit-daily-row').getByRole('button').click();await expect.poll(async()=>(await records(page)).filter(r=>!r.deletedAt).length).toBe(1)
  expect((await records(page)).filter(r=>!r.deletedAt)[0].occurredDate).toBe('2026-10-24')
})

test('habit day switches at 05:00 in a running app, including weekly/monthly goal boundaries',async({page})=>{
  await startV217(page,{habits:[testHabit('A',{schedule:{kind:'flexible',period:'month',times:1}})],start:'05:00',time:'2026-11-01T04:59:00+08:00',checkIns:[check('2026-10-31')]})
  await nav(page,'习惯');await expect(page.getByRole('region',{name:'已完成',exact:true})).toContainText('A')
  await page.clock.fastForward('01:00');await expect(page.getByRole('region',{name:'未完成',exact:true})).toContainText('A')
  await page.locator('.habit-card').getByRole('button',{name:'＋ 打卡',exact:true}).click()
  await expect.poll(async()=>(await records(page)).find(r=>r.id!=='legacy-log')?.occurredDate).toBe('2026-11-01')
  expect((await records(page)).find(r=>r.id==='legacy-log')).toEqual(check('2026-10-31'))
  const weekly=await page.evaluate(async()=>{
    const {habitDateKey}=await import('/src/domain/habitDay.ts'),{progressForDate}=await import('/src/features/habits/habitDomain.ts')
    const h:any={id:'w',quantityTarget:1,schedule:{kind:'flexible',period:'week',times:1}}
    const rows:any=[{habitId:'w',occurredDate:'2026-10-25',quantity:1}]
    return [new Date(2026,9,26,2),new Date(2026,9,26,5)].map(d=>progressForDate(h,rows,habitDateKey(d,'05:00')).met)
  })
  expect(weekly).toEqual([true,false])
})

test('default midnight matches legacy; changing cutoff persists without rewriting historical records',async({page})=>{
  const historical=check('2026-10-25');await startV217(page,{habits:[testHabit('A')],checkIns:[historical],time:'2026-10-25T02:00:00+08:00'})
  await nav(page,'习惯');await expect(page.getByRole('region',{name:'已完成',exact:true})).toContainText('A')
  await nav(page,'设置');await expect(page.getByLabel('习惯日开始时间')).toHaveValue('00:00')
  await expect(page.locator('.settings-page')).toContainText('仅影响习惯，不改变任务、日历及其他记录的自然日期。')
  await page.getByLabel('习惯日开始时间').fill('05:00');await expect.poll(async()=>(await settings(page))[0].habitDayStart).toBe('05:00')
  expect(await records(page)).toEqual([historical])
  await nav(page,'习惯');await expect(page.getByRole('region',{name:'未完成',exact:true})).toContainText('A')
  await page.reload();await nav(page,'设置');await expect(page.getByLabel('习惯日开始时间')).toHaveValue('05:00')
  expect(await records(page)).toEqual([historical])
})

test('month and year calendar add default quantity directly; selected dates are literal, edits and cancellation remain',async({page})=>{
  await startV217(page,{habits:[testHabit('A')],start:'05:00',time:'2026-10-25T02:00:00+08:00'})
  const detail=await openHabit(page,'A')
  await detail.locator('.habit-calendar-month-grid button').filter({hasText:/^25$/}).click()
  await detail.getByRole('button',{name:'＋ 为所选日期补打卡',exact:true}).click()
  await expect.poll(async()=>(await records(page))[0]?.occurredDate).toBe('2026-10-25')
  expect((await records(page))[0].quantity).toBe(2)
  await expect(page.getByRole('dialog',{name:'补充打卡',exact:true})).toHaveCount(0)
  await expect(detail.locator('.habit-calendar-day.selected')).toHaveClass(/status-met/)
  const selected=detail.getByRole('region',{name:'所选日期打卡记录'})
  await selected.getByRole('button',{name:'修改',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'修改打卡记录',exact:true})
  await editor.getByLabel('数量（次）').fill('3');await editor.getByRole('button',{name:'取消编辑',exact:true}).click();expect((await records(page))[0].quantity).toBe(2)
  await selected.getByRole('button',{name:'修改',exact:true}).click();await editor.getByLabel('数量（次）').fill('4');await editor.getByRole('button',{name:'保存修改',exact:true}).click()
  await expect.poll(async()=>(await records(page))[0].quantity).toBe(4)
  await selected.getByRole('button',{name:'取消',exact:true}).click();await expect.poll(async()=>(await records(page))[0].deletedAt).toBeTruthy()
  await detail.getByRole('button',{name:'年历',exact:true}).click()
  await detail.locator('.habit-calendar-year button[aria-label^="24 Oct 2026"]').click()
  await detail.getByRole('button',{name:'＋ 为所选日期补打卡',exact:true}).click()
  await expect.poll(async()=>(await records(page)).filter(r=>!r.deletedAt)[0]?.occurredDate).toBe('2026-10-24')
  await expect(detail.locator('.habit-calendar-year button[aria-label^="26 Oct 2026"]')).toBeDisabled()
})

test('base sort is backward-compatible and completion groups do not destroy the underlying order',()=>{
  const rows=[testHabit('A'),testHabit('B'),testHabit('C'),testHabit('archive',{archivedAt:stamp}),testHabit('deleted',{deletedAt:stamp})] as any[]
  expect(baseOrderedHabits(rows).map(h=>h.id)).toEqual(['A','B','C','archive','deleted'])
  const next=reorderHabitGroup(rows,['C','A'],'2026-10-25T01:00:00Z')
  expect(baseOrderedHabits(next.filter(h=>!h.archivedAt&&!h.deletedAt)).map(h=>h.id)).toEqual(['C','B','A'])
  expect(next[3]).toEqual(rows[3]);expect(next[4]).toEqual(rows[4]);expect(rows[0].sortOrder).toBeUndefined()
  expect(orderedDailyHabits(next,[{...check('2026-10-25'),habitId:'B'}],'2026-10-25','2026-10-25').map(h=>h.id)).toEqual(['C','A','B'])
})

test('keyboard reorder survives grouping, refresh and today detail; archive/delete/restore keep history',async({page})=>{
  await startV217(page,{habits:['A','B','C'].map(id=>testHabit(id)),checkIns:[{...check('2026-10-25'),habitId:'B'}]})
  await nav(page,'习惯');await page.getByRole('button',{name:'拖动C排序',exact:true}).press('ArrowUp')
  await expect.poll(async()=>baseOrderedHabits(await habitRows(page)).map(h=>h.id)).toEqual(['C','B','A'])
  await expect(page.getByRole('region',{name:'未完成',exact:true}).locator('.habit-card-main strong')).toHaveText(['C','A'])
  await page.getByRole('region',{name:'未完成',exact:true}).locator('.habit-card').filter({hasText:'C'}).getByRole('button',{name:'＋ 打卡',exact:true}).click()
  await expect(page.getByRole('region',{name:'已完成',exact:true}).locator('.habit-card-main strong')).toHaveText(['C','B'])
  await expect.poll(async()=>(await records(page)).length).toBe(2)
  await page.reload();await nav(page,'习惯');await expect(page.getByRole('region',{name:'已完成',exact:true}).locator('.habit-card-main strong')).toHaveText(['C','B'])
  await nav(page,'日历');await showToday(page);await expect(page.locator('.habit-daily-name')).toHaveText(['A','C','B'])
  await page.locator('.day-drawer').getByRole('button',{name:'关闭',exact:true}).click()
  const detail=await openHabit(page,'C');await detail.getByRole('button',{name:'归档',exact:true}).click()
  const before=await records(page);await page.getByRole('button',{name:/管理归档习惯/}).click();await page.getByRole('button',{name:'恢复习惯',exact:true}).click();expect(await records(page)).toEqual(before)
  await page.getByRole('button',{name:'关闭归档管理',exact:true}).click()
  const again=await openHabit(page,'C')
  const rank=(await habitRows(page)).find(h=>h.id==='C').sortOrder
  page.once('dialog',d=>d.accept());await again.getByRole('button',{name:'删除',exact:true}).click()
  await expect.poll(async()=>!!(await habitRows(page)).find(h=>h.id==='C').deletedAt).toBe(true)
  expect(await records(page)).toEqual(before)
  await nav(page,'日历');await page.getByRole('button',{name:/打开回收站/}).click()
  await page.locator('.trash-inbox-item').filter({hasText:'C'}).getByRole('button',{name:'恢复',exact:true}).click()
  await expect.poll(async()=>!!(await habitRows(page)).find(h=>h.id==='C').deletedAt).toBe(false)
  expect((await habitRows(page)).find(h=>h.id==='C').sortOrder).toBe(rank)
  expect(await records(page)).toEqual(before)

})

test('touch long-press dragging uses shared handle and cannot move a habit across completion groups',async({page})=>{
  await startV217(page,{habits:['A','B','C'].map(id=>testHabit(id))});await nav(page,'习惯')
  const a=page.getByRole('button',{name:'拖动A排序',exact:true}),b=page.getByRole('button',{name:'拖动B排序',exact:true})
  const src=(await a.boundingBox())!,dst=(await b.boundingBox())!
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  const input=await page.context().newCDPSession(page)
  await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:src.x+10,y:src.y+10}]})
  await page.clock.fastForward(300)
  await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:dst.x+10,y:dst.y+10}]})
  await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  expect(errors).toEqual([])
  await expect(page.locator('.habit-card-main strong')).toHaveText(['B','A','C'])
  await expect.poll(async()=>baseOrderedHabits(await habitRows(page)).map(h=>h.id)).toEqual(['B','A','C'])
})

test('settings plus sort order survive full backup export and confirmed restore',async({page})=>{
  await startV217(page,{habits:['A','B'].map(id=>testHabit(id)),checkIns:[check()]});await nav(page,'习惯')
  await page.getByRole('button',{name:'拖动B排序',exact:true}).press('ArrowUp');await nav(page,'设置');await page.getByLabel('习惯日开始时间').fill('05:00')
  await expect.poll(async()=>(await settings(page))[0].habitDayStart).toBe('05:00')
  const before=await habitRows(page),beforeLogs=await records(page)
  const pending=page.waitForEvent('download');await page.locator('.backup-export-row').click();const file=await pending;const bytes=await readFile((await file.path())!)
  await page.getByLabel('习惯日开始时间').fill('08:00');await nav(page,'习惯');await page.getByRole('button',{name:'拖动A排序',exact:true}).press('ArrowUp');await nav(page,'设置')
  await page.locator('.backup-file-input').setInputFiles({name:'backup.zip',mimeType:'application/zip',buffer:bytes})
  await page.getByRole('button',{name:'恢复此备份',exact:true}).click()
  await expect(page.getByLabel('习惯日开始时间')).toHaveValue('05:00')
  await expect.poll(()=>habitRows(page)).toEqual(before);expect(await records(page)).toEqual(beforeLogs)
  await page.reload();await nav(page,'设置');await expect(page.getByLabel('习惯日开始时间')).toHaveValue('05:00')
})
