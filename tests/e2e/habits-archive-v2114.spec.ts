import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const page = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
test('archived habits have a distinct section after completed habits', () => {
  expect(page.indexOf("title:'已完成'")).toBeLessThan(page.indexOf('aria-label="已归档"'))
  expect(page).toContain('archivedWithHistory=useMemo(()=>archived.filter(h=>liveCheckIns(h.id,checkIns).some(r=>r.occurredDate===today))')
  expect(page).toContain('仅查看历史')
})
test('archived habit records are read-only in both detail and daily views', () => {
  expect(page).toContain('{!habit.archivedAt&&<div className="habit-log-editor">')
  expect(page).toContain('{!habit.archivedAt&&<button type="button" onClick={()=>removeLog(row.id)}')
  expect(page).toContain('function saveLog(){if(!habit||habit.archivedAt||')
  expect(app).toContain('if(habit.archivedAt)return;const now')
  expect(app).toContain('habit.archivedAt?<span className="habit-daily-archived"')
})
