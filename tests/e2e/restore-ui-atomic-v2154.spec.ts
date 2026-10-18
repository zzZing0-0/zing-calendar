import { test, expect } from '@playwright/test'
import { makeZip } from '../../src/domain/backup'
import { databaseCall, safetyHarness, seedTask } from '../helpers/safetyHarness'

test('the real restore dialog commits data and preferences together and remains consistent after reload', async ({ page }) => {
  await safetyHarness(page); await seedTask(page); await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '设置', exact: true }).click()
  const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
  const zip = makeZip([
    {path:'manifest.json',bytes:json({format:'zing-calendar-backup',schemaVersion:1,exportedAt:'2026-10-18T09:00:00.000Z',counts:{},attachments:[]})},
    {path:'data/tasks.json',bytes:json([{id:'ui-restore',title:'原子恢复任务',date:'2026-10-18',status:'todo',priority:1,allDay:true,updatedAt:'2026-10-18T09:00:00.000Z'}])},
    ...['journals','moods','tags','anniversaries'].map(name=>({path:`data/${name}.json`,bytes:json([])})),
    {path:'data/settings.json',bytes:json({greeting:'原子恢复问候',dateFormat:'mdy',weekStart:'sunday'})},
  ])
  await page.locator('.backup-file-input').setInputFiles({ name:'isolated.zip',mimeType:'application/zip',buffer:Buffer.from(await zip.arrayBuffer()) })
  const dialog = page.getByRole('dialog',{name:'确认恢复备份'})
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button',{name:'恢复此备份',exact:true}).click()
  await expect(page.locator('.backup-status')).toHaveText('恢复完成')
  const read = () => databaseCall<any>(page,'return {tasks:await db.loadTasks(),settings:await db.loadUserSettings(),tombstones:await db.loadSyncTombstones()}')
  const restored = await read()
  expect(restored.tasks.map((row:any)=>row.id)).toEqual(['ui-restore'])
  expect(restored.settings[0]).toMatchObject({greeting:'原子恢复问候',dateFormat:'mdy',weekStart:'sunday'})
  expect(restored.tombstones.find((row:any)=>row.entityId==='original')).toBeUndefined()
  await page.reload()
  await expect(page.locator('.bottom-nav')).toBeVisible()
  await expect.poll(async()=>{
    const result = await read()
    return {ids:result.tasks.map((row:any)=>row.id),greeting:result.settings[0]?.greeting,date:result.settings[0]?.dateFormat}
  }).toEqual({ids:['ui-restore'],greeting:'原子恢复问候',date:'mdy'})
  expect(await page.evaluate(()=>localStorage.getItem('zing:dateFormat'))).toBe('mdy')
})
