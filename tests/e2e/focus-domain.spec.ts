import { expect, test } from '@playwright/test'
import type { FocusSession, Task } from '../../src/types'
import { activeFocusSession, finishedFocusSession, focusHistoryForDate, focusTiming, formatFocusClock } from '../../src/domain/focus'

const session = (patch: Partial<FocusSession> = {}): FocusSession => ({
  id: 'focus-1', tagIds: ['default'], mode: 'stopwatch', startedAt: '2026-10-04T10:00:00.000Z',
  createdAt: '2026-10-04T10:00:00.000Z', updatedAt: '2026-10-04T10:00:00.000Z', ...patch,
})

const task = (patch: Partial<Task> = {}): Task => ({
  id: 'task-1', title: 'Paper', date: '2026-10-04', priority: 1, status: 'todo', allDay: true,
  createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z', tagIds: ['default'], ...patch,
})

test.describe('focus domain regression', () => {
  test('active session is the first unfinished direct-focus session', () => {
    const ended = session({ id: 'ended', endedAt: '2026-10-04T10:10:00.000Z' })
    const active = session({ id: 'active' })
    expect(activeFocusSession([ended, active])?.id).toBe('active')
    expect(activeFocusSession([ended])).toBeNull()
  })

  test('timing respects countdown due time and maximum focus cap', () => {
    const countdown = session({ mode: 'countdown', plannedSeconds: 900 })
    const now = new Date('2026-10-04T10:10:00.000Z').getTime()
    expect(focusTiming(countdown, now, 7200)).toEqual({ elapsedSeconds: 600, remainingSeconds: 300, dueAtMs: new Date('2026-10-04T10:15:00.000Z').getTime() })
    expect(focusTiming(session(), new Date('2026-10-04T13:00:00.000Z').getTime(), 7200).elapsedSeconds).toBe(7200)
  })

  test('clock formatting preserves mm:ss and hh:mm:ss display', () => {
    expect(formatFocusClock(65)).toBe('01:05')
    expect(formatFocusClock(3661)).toBe('01:01:01')
    expect(formatFocusClock(-10)).toBe('00:00')
  })

  test('finishing a session stores the exact duration and updated timestamp', () => {
    const finished = finishedFocusSession(session(), new Date('2026-10-04T10:12:34.000Z').getTime())
    expect(finished.endedAt).toBe('2026-10-04T10:12:34.000Z')
    expect(finished.durationSeconds).toBe(754)
    expect(finished.updatedAt).toBe(finished.endedAt)
  })

  test('history combines task truth with direct-focus overlap and caps countdown overlap', () => {
    const direct = session({ id: 'direct', mode: 'countdown', plannedSeconds: 600, startedAt: '2026-10-04T12:00:00', endedAt: '2026-10-04T12:30:00' })
    const rows = focusHistoryForDate([task({ actualDurationMinutes: 5 })], [direct], '2026-10-04', new Date('2026-10-04T13:00:00').getTime())
    expect(rows.find(row => row.kind === 'task')?.seconds).toBe(300)
    expect(rows.find(row => row.kind === 'direct')?.seconds).toBe(600)
    expect(rows.find(row => row.kind === 'task')).toMatchObject({ kind: 'task', title: expect.any(String), tagIds: expect.any(Array) })
    expect(rows.find(row => row.kind === 'direct')).toMatchObject({ kind: 'direct', title: '自由专注', tagIds: expect.any(Array) })
  })
})
