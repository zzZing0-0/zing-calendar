import { expect, test } from '@playwright/test'
import type { FocusSession, RecurrenceException, Tag, Task } from '../../src/types'
import { createDirectFocusSession, findActiveTimedTask, formatRunningTaskTimer, lastSelectableFocusTagId, taskTimerStopPatch } from '../../src/domain/focusRuntime'

const task = (patch: Partial<Task> = {}): Task => ({
  id: 'task-1', title: 'Report', date: '2026-10-11', priority: 1, status: 'todo', allDay: true,
  createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z', tagIds: ['default'], ...patch,
})

const tag = (patch: Partial<Tag>): Tag => ({ id: 'tag', name: 'Tag', color: '#000000', scope: 'focus', updatedAt: '2026-10-11T00:00:00.000Z', ...patch })

test.describe('focus runtime extraction regression', () => {
  test('direct focus factory preserves stopwatch/countdown persistence shape', () => {
    const stopwatch = createDirectFocusSession({ id: 'a', tagIds: [], mode: 'stopwatch', plannedMinutes: 15, startedAt: '2026-10-11T08:00:00.000Z' })
    expect(stopwatch).toEqual({ id: 'a', tagIds: ['default'], mode: 'stopwatch', startedAt: '2026-10-11T08:00:00.000Z', createdAt: '2026-10-11T08:00:00.000Z', updatedAt: '2026-10-11T08:00:00.000Z' })
    const countdown = createDirectFocusSession({ id: 'b', tagIds: ['focus-a'], mode: 'countdown', plannedMinutes: 25, startedAt: '2026-10-11T09:00:00.000Z' })
    expect(countdown.plannedSeconds).toBe(1500)
    expect(countdown.tagIds).toEqual(['focus-a'])
  })

  test('last selected direct-focus tag only restores default/focus/shared tags', () => {
    const session: FocusSession = { id: 's', tagIds: ['task-only', 'focus-only'], mode: 'stopwatch', startedAt: '2026-10-11T08:00:00.000Z', createdAt: '2026-10-11T08:00:00.000Z', updatedAt: '2026-10-11T08:00:00.000Z' }
    expect(lastSelectableFocusTagId(session, [tag({ id: 'task-only', scope: 'task' }), tag({ id: 'focus-only', scope: 'focus' })])).toBe('focus-only')
    expect(lastSelectableFocusTagId({ ...session, tagIds: ['missing'] }, [])).toBe('default')
  })

  test('active task lookup preserves recurring occurrence materialization', () => {
    const recurring = task({ recurrence: { unit: 'day', interval: 1 }, recurrenceExceptions: { '2026-10-11': { updatedAt: '2026-10-11T08:00:00.000Z', activeTimerStartedAt: '2026-10-11T08:00:00.000Z' } } })
    const active = findActiveTimedTask([recurring])
    expect(active?.seriesId).toBe('task-1')
    expect(active?.occurrenceDate).toBe('2026-10-11')
    expect(active?.activeTimerStartedAt).toBe('2026-10-11T08:00:00.000Z')
  })

  test('task timer stop patch preserves legacy minute/remainder/session behavior', () => {
    const current: RecurrenceException = { updatedAt: '2026-10-11T08:00:00.000Z', actualDurationMinutes: 2, timerSecondsRemainder: 50, activeTimerFocusTagIds: ['focus-a'], timerSessions: [] }
    const fallback = task({ activeTimerStartedAt: '2026-10-11T09:00:00.000Z' })
    const patch = taskTimerStopPatch(current, fallback, new Date('2026-10-11T09:00:20.000Z'), 20, true)
    expect(patch.actualDurationMinutes).toBe(3)
    expect(patch.timerSecondsRemainder).toBe(10)
    expect(patch.timerSessions).toEqual([{ startedAt: '2026-10-11T09:00:00.000Z', endedAt: '2026-10-11T09:00:20.000Z', durationSeconds: 20, focusTagIds: ['focus-a'] }])
    expect(patch).toMatchObject({ status: 'completed', completedAt: '2026-10-11T09:00:20.000Z', activeTimerStartedAt: undefined, activeTimerFocusTagIds: undefined })
  })

  test('running timer formatting keeps the existing cap and hh:mm:ss display', () => {
    const active = task({ activeTimerStartedAt: '2026-10-11T08:00:00.000Z' })
    expect(formatRunningTaskTimer(active, new Date('2026-10-11T09:02:03.000Z').getTime(), 7200)).toBe('01:02:03')
    expect(formatRunningTaskTimer(active, new Date('2026-10-11T11:00:00.000Z').getTime(), 7200)).toBe('02:00:00')
  })
})
