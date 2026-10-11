import { expect, test } from '@playwright/test'
import type { FocusSession, Tag } from '../../src/types'
import { createDirectFocusSession, createTaskFocusSession, lastSelectableFocusTagId } from '../../src/domain/focusRuntime'

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

  test('task focus factory persists task context without a second task timer model', () => {
    const session = createTaskFocusSession({ id:'task-focus', taskId:'task-1', tagIds:[], startedAt:'2026-10-11T08:00:00.000Z' })
    expect(session).toMatchObject({ id:'task-focus', tagIds:['default'], mode:'stopwatch', context:{kind:'task',taskId:'task-1'} })
    expect(session.endedAt).toBeUndefined()
  })
})
