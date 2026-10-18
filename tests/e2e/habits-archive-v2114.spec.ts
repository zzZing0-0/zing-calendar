import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readApplicationSource } from '../helpers/applicationSource'
const page = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
const app = readApplicationSource()
test('archived habits have a distinct section after completed habits', () => {
  expect(page.indexOf("title:'已完成'")).toBeLessThan(page.indexOf('aria-label="已归档"'))
  expect(page).toContain('archivedWithHistory=useMemo(()=>archived.filter(h=>liveCheckIns(h.id,checkIns).some(r=>r.occurredDate===today))')
  expect(page).toContain('仅查看历史')
})
test('archived habit records are read-only in both detail and daily views', () => {
  // Archived habits must not expose the check-in entry or its editing dialog.
  expect(page).toContain('{!habit.archivedAt&&<Button className="habit-open-log-button"')
  expect(page).toContain('{logDialogOpen&&!habit.archivedAt&&<div className="habit-modal-backdrop habit-log-dialog-layer"')
  expect(page).toContain('function removeLog(id:string){if(habit?.archivedAt)return;')
  expect(page).toContain('function saveLog(){if(!habit||habit.archivedAt||')
  expect(app).toContain('if(habit.archivedAt)return;const now')
  expect(app).toContain('habit.archivedAt?<span className="habit-daily-archived"')
})
