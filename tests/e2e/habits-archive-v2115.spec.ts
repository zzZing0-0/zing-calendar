import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const page = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')

test('archive manager includes all archived habits, independently of the day', () => {
  expect(page).toContain('const archived=useMemo(()=>habits.filter(h=>!h.deletedAt&&!!h.archivedAt')
  expect(page).toContain('管理归档习惯{archived.length?')
  expect(page).toContain('archived.map(h=><div className="habit-archive-row"')
})

test('archived home group only shows archives with live check-ins occurring today', () => {
  expect(page).toContain('archivedWithHistory=useMemo(()=>archived.filter(h=>liveCheckIns(h.id,checkIns).some(r=>r.occurredDate===today))')
  expect(page).toContain('archivedWithHistory.length>0&&<section className="habits-group" aria-label="已归档"')
  expect(page).toContain('仅查看历史')
})

test('empty groups and their placeholders are not rendered', () => {
  expect(page).toContain('.filter(group=>group.items.length>0).map(group=>')
  expect(page).not.toContain('habits-group-empty')
  expect(page).toContain('active.length===0&&archivedWithHistory.length===0')
})
