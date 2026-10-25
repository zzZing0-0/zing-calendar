import { expect, type Page } from '@playwright/test'
import { safetyHarness, databaseCall } from './safetyHarness'
export { databaseCall }
export const stamp = '2026-10-01T00:00:00.000Z'
export const testHabit = (id: string, extra = {}) => ({ id, name: id, schedule: {kind:'flexible',period:'day',times:1}, quantityTarget: 2, unit:'次',createdAt:stamp,updatedAt:stamp,...extra })
export async function startV217(page: Page, options: { habits?: any[]; checkIns?: any[]; tasks?: any[]; start?: string; time?: string } = {}) {
  await page.clock.install({time:new Date(options.time || '2026-10-25T12:00:00+08:00')})
  await safetyHarness(page)
  await page.evaluate(({habits,checkIns,tasks,start})=>Promise.all([
    import('/src/db/calendar.ts').then(async db=>{await db.saveHabits(habits||[]);await db.saveHabitCheckIns(checkIns||[]);await db.saveTasks(tasks||[])}),
    start ? Promise.resolve(localStorage.setItem('zing:habitDayStart',start)) : Promise.resolve(),
  ]),options)
  await page.goto('/')
  await expect(page.locator('.calendar-card')).toBeVisible()
  await expect.poll(()=>databaseCall<any[]>(page,'return await db.loadUserSettings()')).not.toEqual([])
}
export async function nav(page:Page,name:string) { await page.locator('.bottom-nav').getByRole('button',{name,exact:true}).click() }
export async function showToday(page:Page) {
  await page.locator('.continuous-calendar .day-cell.today').first().click()
  await expect(page.locator('.day-drawer')).toBeVisible()
}
export async function openHabit(page:Page,name:string) {
  await nav(page,'习惯');await page.locator('.habit-card-main').filter({hasText:name}).click()
  return page.getByRole('dialog',{name:name+'详情',exact:true})
}
