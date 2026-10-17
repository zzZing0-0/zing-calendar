import { expect, test } from '@playwright/test'
import { mergeHabitCheckIns, orderedDailyHabits, periodBounds, progressForDate, visibleOnDay } from '../../src/features/habits/habitDomain'
import type { Habit, HabitCheckIn } from '../../src/features/habits/habitDomain'

const stamp = '2026-10-01T00:00:00.000Z'
const habit = (schedule: Habit['schedule'], id = 'dance'): Habit => ({ id, name: '跳舞', schedule, quantityTarget: 1, unit: '节', createdAt: stamp, updatedAt: stamp })
const check = (id: string, date: string, quantity = 1): HabitCheckIn => ({ id, habitId: 'dance', occurredDate: date, quantity, createdAt: stamp, updatedAt: stamp })

test('weekly and monthly boundaries use local calendar keys and cross month/year safely', () => {
  expect(periodBounds('2026-10-01', 'week')).toEqual(['2026-09-28', '2026-10-04'])
  expect(periodBounds('2027-01-01', 'week')).toEqual(['2026-12-28', '2027-01-03'])
  expect(periodBounds('2026-02-17', 'month')).toEqual(['2026-02-01', '2026-02-28'])
})
test('two classes in one activity count as one weekly occurrence', () => {
  expect(progressForDate(habit({ kind: 'flexible', period: 'week', times: 2 }), [check('a', '2026-10-12', 2)], '2026-10-14')).toEqual({ done: 1, target: 2, met: false })
})
test('flexible goal reached early suppresses remaining daily suggestion, preserves recorded day', () => {
  const h = habit({ kind: 'flexible', period: 'week', times: 2 })
  const rows = [check('a', '2026-10-12'), check('b', '2026-10-14')]
  expect(visibleOnDay(h, rows, '2026-10-15', '2026-10-15')).toBe(false)
  expect(visibleOnDay(h, rows, '2026-10-14', '2026-10-15')).toBe(true)
})
test('fixed weekday does not allow Wednesday to replace Thursday', () => {
  const h = habit({ kind: 'fixed', weekdays: [1, 4] })
  const rows = [check('a', '2026-10-12'), check('b', '2026-10-14')]
  expect(visibleOnDay(h, rows, '2026-10-15', '2026-10-15')).toBe(true)
  expect(progressForDate(h, rows, '2026-10-15').met).toBe(false)
})
test('future day stays hidden and recorded unscheduled day appears; incomplete sorts first', () => {
  const fixed = habit({ kind: 'fixed', weekdays: [1, 4] })
  const free = habit({ kind: 'free' }, 'free')
  expect(visibleOnDay(fixed, [], '2026-10-19', '2026-10-17')).toBe(false)
  expect(visibleOnDay(fixed, [check('a', '2026-10-14')], '2026-10-14', '2026-10-17')).toBe(true)
  expect(orderedDailyHabits([fixed, free], [check('a', '2026-10-15')], '2026-10-15', '2026-10-17')).toEqual([fixed])
})
test('independent offline additions converge; newer tombstone prevents resurrection', () => {
  const a = check('a', '2026-10-12')
  const b = check('b', '2026-10-14')
  expect(mergeHabitCheckIns([a], [b]).map(row => row.id).sort()).toEqual(['a', 'b'])
  const deleted = { ...a, deletedAt: '2026-10-17T12:00:00.000Z', updatedAt: '2026-10-17T12:00:00.000Z' }
  expect(mergeHabitCheckIns([a], [deleted])[0].deletedAt).toBeTruthy()
})
