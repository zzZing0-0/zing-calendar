import { expect, test } from '@playwright/test'
import type { FocusSession, Task } from '../../src/types'
import { cascadeRestoreTaskFocus, cascadeTrashTaskFocus, focusSessionParticipatesInStats, permanentlyDeleteTaskFocus, purgeTrashWithTaskFocus } from '../../src/domain/taskFocusLifecycle'
import { combinedFocusSecondsByDate } from '../../src/domain/task'
import { focusHistoryForDate } from '../../src/domain/focus'

const task=(patch:Partial<Task>={}):Task=>({id:'task-1',title:'写CT',date:'2026-10-11',priority:1,status:'todo',allDay:true,createdAt:'2026-10-11T00:00:00Z',updatedAt:'2026-10-11T00:00:00Z',...patch})
const focus=(patch:Partial<FocusSession>={}):FocusSession=>({id:'focus-1',tagIds:['work'],mode:'stopwatch',startedAt:'2026-10-11T08:00:00',endedAt:'2026-10-11T08:10:00',durationSeconds:600,createdAt:'2026-10-11T08:00:00',updatedAt:'2026-10-11T08:10:00',context:{kind:'task',taskId:'task-1'},...patch})

test('deleting a Task cascades only its live FocusSessions into trash and restoring reverses only that cascade',()=>{
  const alreadyTrashed=focus({id:'old-trash',trashedAt:'2026-10-10T00:00:00Z'})
  const other=focus({id:'other',context:{kind:'task',taskId:'task-2'}})
  const deletedAt='2026-10-11T09:00:00Z'
  const rows=cascadeTrashTaskFocus([focus(),alreadyTrashed,other],'task-1',deletedAt)
  expect(rows[0]).toMatchObject({trashedAt:deletedAt,trashedByTaskId:'task-1',updatedAt:deletedAt})
  expect(rows[1]).toEqual(alreadyTrashed)
  expect(rows[2]).toEqual(other)
  const restored=cascadeRestoreTaskFocus(rows,'task-1','2026-10-11T10:00:00Z')
  expect(restored[0].trashedAt).toBeUndefined(); expect(restored[0].trashedByTaskId).toBeUndefined()
  expect(restored[1]).toEqual(alreadyTrashed)
})

test('trashed Task Focus is excluded from Today and all focus statistics, then returns after restore',()=>{
  const deletedAt='2026-10-11T09:00:00Z'
  const trashedTask=task({trashedAt:deletedAt})
  const trashedFocus=cascadeTrashTaskFocus([focus()],'task-1',deletedAt)[0]
  expect(focusSessionParticipatesInStats(trashedFocus,[trashedTask])).toBe(false)
  expect(focusHistoryForDate([trashedTask],[trashedFocus],'2026-10-11',new Date('2026-10-11T12:00:00').getTime())).toEqual([])
  expect(combinedFocusSecondsByDate([trashedTask],[trashedFocus],new Date('2026-10-11T12:00:00').getTime()).size).toBe(0)
  const restoredFocus=cascadeRestoreTaskFocus([trashedFocus],'task-1','2026-10-11T10:00:00Z')[0]
  expect(combinedFocusSecondsByDate([task()],[restoredFocus],new Date('2026-10-11T12:00:00').getTime()).get('2026-10-11')).toBe(600)
})

test('permanent Task deletion and clear-trash remove all associated Focus facts, including independently trashed ones',()=>{
  const own=[focus(),focus({id:'independent-trash',trashedAt:'2026-10-10T00:00:00Z'}),focus({id:'other',context:{kind:'task',taskId:'task-2'}})]
  expect(permanentlyDeleteTaskFocus(own,'task-1').map(x=>x.id)).toEqual(['other'])
  const deletedAt='2026-10-11T09:00:00Z'
  const cascaded=cascadeTrashTaskFocus(own,'task-1',deletedAt)
  expect(purgeTrashWithTaskFocus(cascaded,[task({trashedAt:deletedAt}),task({id:'task-2'})]).map(x=>x.id)).toEqual(['other'])
})

test('orphan task-context Focus never leaks into Today or statistics',()=>{
  const row=focus()
  expect(focusSessionParticipatesInStats(row,[])).toBe(false)
  expect(focusHistoryForDate([], [row], '2026-10-11', new Date('2026-10-11T12:00:00').getTime())).toEqual([])
  expect(combinedFocusSecondsByDate([], [row], new Date('2026-10-11T12:00:00').getTime()).size).toBe(0)
})
