import { expect, test } from '@playwright/test'

test('golden restore replaces all primary stores and restores attachment bytes atomically', async ({ page }) => {
  await page.goto('/'); await page.waitForTimeout(250)
  const result = await page.evaluate(async () => {
    const db:any = await import('/src/db/calendar.ts')
    const attachmentBytes = new Uint8Array([0, 255, 7, 42])
    await db.replaceZingData({
      tasks:[{id:'restore-task',title:'恢复任务 🐱',date:'2026-10-04',updatedAt:'2026-10-04T10:00:00.000Z'}],
      journals:[{id:'restore-journal',date:'2026-10-04',title:'恢复记录',content:'中文\nemoji 🌈',impact:1,createdAt:'2026-10-04T10:00:00.000Z',updatedAt:'2026-10-04T10:00:00.000Z'}],
      moods:[{date:'2026-10-04',level:5,updatedAt:'2026-10-04T10:00:00.000Z'}],
      energies:[{date:'2026-10-04',level:1,updatedAt:'2026-10-04T10:00:00.000Z'}],
      environments:[{date:'2026-10-04',locationCity:'上海',updatedAt:'2026-10-04T10:00:00.000Z'}],
      periods:[{id:'restore-period',startDate:'2026-10-01',dayLogs:[],createdAt:'2026-10-01T00:00:00.000Z',updatedAt:'2026-10-01T00:00:00.000Z'}],
      tags:[{id:'restore-tag',name:'恢复标签',color:'#000000',scope:'both',updatedAt:'2026-10-04T10:00:00.000Z'}],
      anniversaries:[{id:'restore-ann',title:'恢复纪念日',type:'important',calendar:'solar',month:10,day:4,repeatYearly:true,createdAt:'2026-10-04T10:00:00.000Z',updatedAt:'2026-10-04T10:00:00.000Z'}],
      focusSessions:[{id:'restore-focus',tagIds:['restore-tag'],mode:'stopwatch',startedAt:'2026-10-04T10:00:00.000Z',endedAt:'2026-10-04T10:30:00.000Z',durationSeconds:1800,createdAt:'2026-10-04T10:00:00.000Z',updatedAt:'2026-10-04T10:30:00.000Z'}],
      attachments:[{key:'blob:restore',blob:new Blob([attachmentBytes],{type:'application/octet-stream'})}],
    })
    const blob = await db.getAttachmentBlob('blob:restore')
    return {
      tasks:await db.loadTasks(), journals:await db.loadJournalEntries(), moods:await db.loadDailyMoods(), energies:await db.loadDailyEnergy(), environments:await db.loadDailyEnvironment(), periods:await db.loadMenstrualPeriods(), tags:await db.loadTags(), anniversaries:await db.loadAnniversaries(), focus:await db.loadFocusSessions(),
      attachment: blob ? Array.from(new Uint8Array(await blob.arrayBuffer())) : null,
    }
  })
  expect(result.tasks).toHaveLength(1); expect(result.tasks[0].title).toBe('恢复任务 🐱')
  expect(result.journals[0].content).toBe('中文\nemoji 🌈')
  expect(result.moods[0].level).toBe(5); expect(result.energies[0].level).toBe(1)
  expect(result.environments[0].locationCity).toBe('上海')
  expect(result.periods[0].id).toBe('restore-period'); expect(result.tags[0].name).toBe('恢复标签')
  expect(result.anniversaries[0].id).toBe('restore-ann'); expect(result.focus[0].durationSeconds).toBe(1800)
  expect(result.attachment).toEqual([0,255,7,42])
})
