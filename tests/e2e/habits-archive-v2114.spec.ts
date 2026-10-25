import { startV217, testHabit, openHabit, databaseCall, stamp, nav, showToday } from '../helpers/v217Harness'
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
const page = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
test('archived habits have a distinct section after completed habits', () => {
  expect(page.indexOf("title:'已完成'")).toBeLessThan(page.indexOf('aria-label="已归档"'))
  expect(page).toContain('archivedWithHistory=useMemo(()=>archived.filter(h=>liveCheckIns(h.id,checkIns).some(r=>r.occurredDate===today))')
  expect(page).toContain('仅查看历史')
})
test('archived habit records are read-only in both detail and daily views', async ({page: browserPage}) => {
 const archived=testHabit('A',{archivedAt:stamp})
 const row={id:'archive-log',habitId:'A',occurredDate:'2026-10-25',quantity:2,createdAt:stamp,updatedAt:stamp}
 await startV217(browserPage,{habits:[archived],checkIns:[row]})
 const detail=await openHabit(browserPage,'A')
 await detail.locator('.habit-calendar-month-grid button').filter({hasText:/^25$/}).click()
 const selected=detail.getByRole('region',{name:'所选日期打卡记录'})
 await expect(selected).toContainText('2 次')
 await expect(detail.getByRole('button',{name:'＋ 为所选日期补打卡',exact:true})).toHaveCount(0)
 await expect(selected.getByRole('button',{name:'修改',exact:true})).toHaveCount(0)
 await expect(selected.getByRole('button',{name:'取消',exact:true})).toHaveCount(0)
 await detail.getByRole('button',{name:'×',exact:true}).click()
 await nav(browserPage,'日历');await showToday(browserPage)
 await expect(browserPage.locator('.habit-daily-row')).toContainText('已归档')
 await expect(browserPage.locator('.habit-daily-row button')).toHaveCount(0)
 expect(await databaseCall(browserPage,'return await db.loadHabitCheckIns()')).toEqual([row])
})
