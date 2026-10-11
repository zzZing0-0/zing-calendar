import { expect, test } from '@playwright/test'
import type { FocusSession, Note } from '../../src/types'
import { cascadeRestoreNoteFocus, cascadeTrashNoteFocus, permanentlyDeleteNoteFocus, purgeTrashWithNoteFocus } from '../../src/domain/noteFocusLifecycle'
import { focusSessionParticipatesInStats } from '../../src/domain/focusContextLifecycle'
import { createNoteFocusSession } from '../../src/domain/focusRuntime'
import { focusHistoryForDate, noteFocusSeconds } from '../../src/domain/focus'

const note = (patch:Partial<Note> = {}):Note => ({ id:'n1', notebookId:'notebook:default', title:'MRI ideas', content:'', active:true, createdAt:'2026-10-11T08:00:00.000Z', updatedAt:'2026-10-11T08:00:00.000Z', ...patch })
const session = ():FocusSession => ({ ...createNoteFocusSession({id:'f1',noteId:'n1',tagIds:['default'],startedAt:'2026-10-11T09:00:00.000Z'}), endedAt:'2026-10-11T09:10:00.000Z', durationSeconds:600, updatedAt:'2026-10-11T09:10:00.000Z' })

test('note focus is a standalone FocusSession fact with note context and derived total', () => {
  const row=session()
  expect(row.context).toEqual({kind:'note',noteId:'n1'})
  expect(noteFocusSeconds('n1',[row],new Date('2026-10-11T12:00:00.000Z').getTime())).toBe(600)
  const history=focusHistoryForDate([], [note()], [row], '2026-10-11', new Date('2026-10-11T12:00:00.000Z').getTime())
  expect(history).toHaveLength(1)
  expect(history[0]).toMatchObject({kind:'note',title:'MRI ideas',seconds:600})
})

test('trashing a note cascades only live note focus and restore reverses only that cascade', () => {
  const live=session()
  const independentlyTrashed={...session(),id:'f2',trashedAt:'2026-10-11T10:00:00.000Z'}
  const trashed=cascadeTrashNoteFocus([live,independentlyTrashed],'n1','2026-10-11T11:00:00.000Z')
  expect(trashed[0]).toMatchObject({trashedAt:'2026-10-11T11:00:00.000Z',trashedByNoteId:'n1'})
  expect(trashed[1].trashedByNoteId).toBeUndefined()
  const restored=cascadeRestoreNoteFocus(trashed,'n1','2026-10-11T12:00:00.000Z')
  expect(restored[0].trashedAt).toBeUndefined()
  expect(restored[0].trashedByNoteId).toBeUndefined()
  expect(restored[1].trashedAt).toBe('2026-10-11T10:00:00.000Z')
})

test('trashed or missing note context never participates in statistics and returns after restore', () => {
  const row=session()
  expect(focusSessionParticipatesInStats(row,[],[note()])).toBe(true)
  expect(focusSessionParticipatesInStats(row,[],[note({trashedAt:'2026-10-11T11:00:00.000Z'})])).toBe(false)
  expect(focusSessionParticipatesInStats(row,[],[])).toBe(false)
})

test('permanent note deletion removes every associated focus fact including independently trashed rows', () => {
  const rows=[session(),{...session(),id:'f2',trashedAt:'2026-10-11T10:00:00.000Z'}, {...session(),id:'f3',context:undefined}]
  expect(permanentlyDeleteNoteFocus(rows,'n1').map(row=>row.id)).toEqual(['f3'])
})


test('clear-trash removes all Focus facts belonging to trashed Notes, even if a malformed row stayed live', () => {
  const live=session()
  const unrelated={...session(),id:'f3',context:undefined}
  expect(purgeTrashWithNoteFocus([live,unrelated],[note({trashedAt:'2026-10-11T11:00:00.000Z'})]).map(row=>row.id)).toEqual(['f3'])
})
