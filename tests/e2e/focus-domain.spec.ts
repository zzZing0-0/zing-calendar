import { expect, test } from '@playwright/test'
import type { FocusSession, Task } from '../../src/types'
import { activeFocusSession, activeFocusSessions, boundedInteger, countdownMinutes, finishedFocusSession, focusHistoryForDate, focusTiming, formatFocusClock, permanentlyDeleteFocusSession, purgeTrashedFocusSessions, restoreFocusSession, trashFocusSession } from '../../src/domain/focus'

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


  test('free focus trash lifecycle preserves data until explicit permanent deletion', () => {
    const deletedAt = '2026-10-04T11:00:00.000Z'
    const trashed = trashFocusSession(session({ endedAt: '2026-10-04T10:30:00.000Z', durationSeconds: 1800 }), deletedAt)
    expect(trashed).toMatchObject({ id: 'focus-1', trashedAt: deletedAt, updatedAt: deletedAt, durationSeconds: 1800 })
    expect(activeFocusSessions([trashed])).toEqual([])

    const restoredAt = '2026-10-04T12:00:00.000Z'
    const restored = restoreFocusSession(trashed, restoredAt)
    expect(restored.trashedAt).toBeUndefined()
    expect(restored.updatedAt).toBe(restoredAt)
    expect(activeFocusSessions([restored])).toHaveLength(1)

    expect(permanentlyDeleteFocusSession([trashed, session({ id: 'keep' })], 'focus-1').map(row => row.id)).toEqual(['keep'])
    expect(purgeTrashedFocusSessions([trashed, session({ id: 'keep' })]).map(row => row.id)).toEqual(['keep'])
  })

  test('trashed free focus is excluded from active session lookup and focus history', () => {
    const trashed = session({ endedAt: '2026-10-04T10:30:00.000Z', trashedAt: '2026-10-04T11:00:00.000Z' })
    const trashedActive = session({ id: 'trashed-active', trashedAt: '2026-10-04T11:00:00.000Z' })
    expect(activeFocusSession([trashedActive])).toBeNull()
    expect(focusHistoryForDate([], [trashed], '2026-10-04', new Date('2026-10-04T13:00:00Z').getTime())).toEqual([])
  })
  test('countdown input is enforced at 1 to 720 minutes even for typed values', () => {
    expect(countdownMinutes('1')).toBe(1)
    expect(countdownMinutes('720')).toBe(720)
    expect(countdownMinutes('721')).toBe(720)
    expect(countdownMinutes('10000')).toBe(720)
    expect(countdownMinutes('0')).toBe(1)
    expect(countdownMinutes('-20')).toBe(1)
    expect(countdownMinutes('not-a-number', 15)).toBe(15)
  })

  test('bounded numeric edits enforce their business limit instead of trusting HTML min/max', () => {
    expect(boundedInteger('10000', 1, 1440, 1)).toBe(1440)
    expect(boundedInteger('-5', 1, 1440, 1)).toBe(1)
  })

  test('countdown uses its planned duration even when it exceeds the stopwatch safety cap', () => {
    const countdown = session({ mode: 'countdown', plannedSeconds: 150 * 60 })
    const afterTwoHoursTenMinutes = new Date('2026-10-04T12:10:00.000Z').getTime()
    expect(focusTiming(countdown, afterTwoHoursTenMinutes, 2 * 3600)).toEqual({
      elapsedSeconds: 130 * 60,
      remainingSeconds: 20 * 60,
      dueAtMs: new Date('2026-10-04T12:30:00.000Z').getTime(),
    })
  })

  test('stopwatch remains capped by the maximum focus safety limit', () => {
    const afterThreeHours = new Date('2026-10-04T13:00:00.000Z').getTime()
    expect(focusTiming(session(), afterThreeHours, 2 * 3600)).toEqual({
      elapsedSeconds: 2 * 3600,
      remainingSeconds: 0,
      dueAtMs: new Date('2026-10-04T12:00:00.000Z').getTime(),
    })
  })

  test('countdown stops at its own due time rather than the stopwatch cap', () => {
    const countdown = session({ mode: 'countdown', plannedSeconds: 150 * 60 })
    const afterThreeHours = new Date('2026-10-04T13:00:00.000Z').getTime()
    expect(focusTiming(countdown, afterThreeHours, 2 * 3600)).toEqual({
      elapsedSeconds: 150 * 60,
      remainingSeconds: 0,
      dueAtMs: new Date('2026-10-04T12:30:00.000Z').getTime(),
    })
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

  test('undated task focus is attributed to its completion or timer activity date', () => {
    const undated = task({ date: null, actualDurationMinutes: 12, completedAt: '2026-10-04T09:30:00.000Z', updatedAt: '2026-10-04T09:30:00.000Z' })
    const rows = focusHistoryForDate([undated], [], '2026-10-04', new Date('2026-10-04T13:00:00.000Z').getTime())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'task', seconds: 720 })
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
