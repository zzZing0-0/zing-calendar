import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { progressForDate } from '../../src/features/habits/habitDomain'
import type { Habit, HabitCheckIn } from '../../src/features/habits/habitDomain'

const page = fs.readFileSync(path.resolve(process.cwd(), 'src/features/habits/HabitsPage.tsx'), 'utf8')
const habit = (id: string, times: number): Habit => ({ id, name: id, schedule: { kind: 'flexible', period: 'week', times }, quantityTarget: 1, unit: '次', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' })
const check = (id: string, habitId: string, date: string): HabitCheckIn => ({ id, habitId, occurredDate: date, quantity: 1, createdAt: '2026-10-17T00:00:00Z', updatedAt: '2026-10-17T00:00:00Z' })

test('habits page explicitly separates pending and completed groups', () => {
  expect(page).toContain("title:'未完成',items:pending")
  expect(page).toContain("title:'已完成',items:completed")
  expect(page).toContain('className="habits-group-heading"')
  expect(page).toContain('className="habit-extra-checkin"')
})
test('free mode cannot be created and old free habits do not enter goal groups', () => {
  expect(page).not.toContain('<option value="free">')
  expect(page).toContain("h.schedule.kind!=='free'")
})
test('weekly group membership updates when a record is added or removed', () => {
  const h = habit('dance', 2)
  const first = check('a', h.id, '2026-10-12')
  const second = check('b', h.id, '2026-10-14')
  expect(progressForDate(h, [first], '2026-10-17').met).toBe(false)
  expect(progressForDate(h, [first, second], '2026-10-17').met).toBe(true)
  expect(progressForDate(h, [first, { ...second, deletedAt: '2026-10-17T10:00:00Z' }], '2026-10-17').met).toBe(false)
})
