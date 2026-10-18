import { expect, test } from '@playwright/test'
import type { FocusSession, Note, Task } from '../../src/types'
import { focusSessionsForContext, focusHistoryForNote, focusHistoryForTask, focusIsoToLocalInput, focusLocalInputToDate } from '../../src/domain/focusHistorySelectors'

const started = '2026-10-18T08:00:00.000Z'
const ended = '2026-10-18T08:10:00.000Z'
const session = (id: string, context: FocusSession['context'], extra: Partial<FocusSession> = {}): FocusSession => ({ id, context, tagIds: ['default'], mode: 'stopwatch', startedAt: started, endedAt: ended, createdAt: started, updatedAt: ended, ...extra })
const task = { id: 't', title: 'Task' } as Task
const note = { id: 'n', title: 'Note' } as Note
const now = Date.parse(ended)

test.describe('v2.14 focus history extraction', () => {
  test('context selector excludes trashed and unrelated sessions and sorts newest first without mutating input', () => {
    const rows = [session('old', { kind: 'task', taskId: 't' }), session('note', { kind: 'note', noteId: 'n' }), session('deleted', { kind: 'task', taskId: 't' }, { trashedAt: ended }), session('new', { kind: 'task', taskId: 't' }, { startedAt: '2026-10-18T08:05:00.000Z' })]
    expect(focusSessionsForContext(rows, 'task', 't').map(row => row.id)).toEqual(['new', 'old'])
    expect(rows.map(row => row.id)).toEqual(['old', 'note', 'deleted', 'new'])
    expect(focusSessionsForContext(rows, 'task', null)).toEqual([])
  })
  test('note history respects deleted notes and excludes deleted focus from duration', () => {
    const rows = [session('ok', { kind: 'note', noteId: 'n' }), session('deleted', { kind: 'note', noteId: 'n' }, { trashedAt: ended })]
    expect(focusHistoryForNote('n', [note], rows, now)).toMatchObject({ note, seconds: 600 })
    expect(focusHistoryForNote('n', [{ ...note, trashedAt: ended }], rows, now).note).toBeNull()
    expect(focusHistoryForNote(null, [note], rows, now)).toMatchObject({ note: null, sessions: [], seconds: 0 })
  })
  test('recurring task occurrence does not show task focus history', () => {
    const rows = [session('task', { kind: 'task', taskId: 't' })]
    expect(focusHistoryForTask(task, rows, now)).toMatchObject({ seconds: 600 })
    expect(focusHistoryForTask({ ...task, seriesId: 'series' }, rows, now)).toMatchObject({ sessions: [], seconds: 0 })
    expect(focusHistoryForTask(null, rows, now)).toMatchObject({ sessions: [], seconds: 0 })
  })
  test('local datetime helpers preserve minute granularity and reject invalid input', () => {
    const date = new Date(started)
    const value = focusIsoToLocalInput(started)
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(focusLocalInputToDate(value)?.getTime()).toBe(date.getTime())
    expect(focusIsoToLocalInput('bad')).toBe('')
    expect(focusLocalInputToDate('bad')).toBeNull()
  })
})
