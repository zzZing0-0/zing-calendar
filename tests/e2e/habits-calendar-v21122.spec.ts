import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const pageSource=readFileSync('src/features/habits/HabitsPage.tsx','utf8')
const calendarSource=readFileSync('src/features/habits/HabitCalendar.tsx','utf8')
const domainSource=readFileSync('src/features/habits/habitCalendarDomain.ts','utf8')
const css=readFileSync('src/features/habits/habits.css','utf8')

test('habit detail replaces unbounded history list with month/year calendar and selected-day editor',()=>{
 expect(pageSource).toContain('<HabitCalendar')
 expect(pageSource).not.toContain('<h4>历史记录</h4>')
 expect(calendarSource).toContain('月历')
 expect(calendarSource).toContain('年历')
 expect(calendarSource).toContain('onEdit(row)')
 expect(calendarSource).toContain('onRemove(row.id)')
 expect(calendarSource).toContain('!habit.archivedAt')
})
test('heatmap includes leap days, week columns, local occurrence dates and tombstone filtering',()=>{
 expect(domainSource).toContain('Date.UTC(year+1,0,1)-Date.UTC(year,0,1)')
 expect(domainSource).toContain('liveCheckIns(habit.id,checkIns)')
 expect(domainSource).toContain('r.occurredDate===key')
 expect(calendarSource).toContain('yearHeatmapWeeks(year)')
})
test('mobile year heatmap scrolls horizontally without growing the dialog',async({page})=>{
 await page.setViewportSize({width:375,height:812})
 const cells=Array.from({length:53},()=>`<div class="habit-calendar-year-week">${Array.from({length:7},()=>'<button class="habit-calendar-day status-met"></button>').join('')}</div>`).join('')
 await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><section class="habit-modal" style="width:330px"><div class="habit-calendar"><div class="habit-calendar-year-scroll"><div class="habit-calendar-year"><div class="habit-calendar-year-body"><div class="habit-calendar-year-weekdays"></div><div class="habit-calendar-year-weeks">${cells}</div></div></div></div></div></section>`)
 const result=await page.locator('.habit-calendar-year-scroll').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}))
 expect(result.scroll).toBeGreaterThan(result.client)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})
