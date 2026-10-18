import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { focusHistoryForDate } from '../../src/domain/focus'
import type { FocusSession, Note } from '../../src/types'

const app = fs.readFileSync('src/App.tsx', 'utf8')
const notesPage = fs.readFileSync('src/features/notes/NotesPage.tsx', 'utf8')

const note = (id='n1'): Note => ({id,title:'占位论文',content:'',notebookId:'default',tagIds:[],active:true,createdAt:'2026-10-11T08:00:00.000Z',updatedAt:'2026-10-11T08:00:00.000Z'})
const session = (id:string, tagId:string, startedAt:string, seconds:number): FocusSession => ({id,tagIds:[tagId],mode:'stopwatch',startedAt,endedAt:new Date(new Date(startedAt).getTime()+seconds*1000).toISOString(),durationSeconds:seconds,createdAt:startedAt,updatedAt:startedAt,context:{kind:'note',noteId:'n1'}})

test('ending note focus closes the lock and stays in the note workspace without falling through to free focus', () => {
  const start = app.indexOf('const stopNoteFocus =')
  const end = app.indexOf('const activeTimerTask', start)
  const body = app.slice(start, end)
  expect(body).toContain("setMainView('notes')")
  expect(body).toContain('setRequestedNoteId(note.id)')
  expect(body).toContain('setFocusOpen(false)')
  expect(body).not.toContain('startDirectFocus')
})

test('Today Focus aggregates the same note and focus tag but keeps different tags separate', () => {
  const rows=focusHistoryForDate([], [note()], [
    session('a','default','2026-10-11T09:00:00',600),
    session('b','default','2026-10-11T10:00:00',1200),
    session('c','research','2026-10-11T11:00:00',900),
  ], '2026-10-11', new Date('2026-10-11T12:00:00').getTime())
  expect(rows).toHaveLength(2)
  expect(rows.map(row=>({tag:row.tagIds[0],seconds:row.seconds})).sort((a,b)=>a.tag.localeCompare(b.tag))).toEqual([
    {tag:'default',seconds:1800},{tag:'research',seconds:900},
  ])
  expect(rows.every(row=>row.kind==='note'&&!row.session)).toBeTruthy()
})

test('Today Focus separates free focus notes and tasks and only raw free focus is directly editable', () => {
  expect(app).toContain("(['direct','note','task','habit'] as const).map(kind=>")
  expect(app).toContain("kind==='direct'?'自由专注':kind==='note'?'笔记':kind==='habit'?'习惯':'任务'")
  expect(app).toContain("(record.kind==='direct'||record.kind==='habit')&&record.session&&<>")
  expect(app).toContain("record.kind==='note'&&record.note&&<button")
})

test('a note exposes derived total focus and opens its own raw focus history', () => {
  expect(notesPage).toContain('累计专注')
  expect(notesPage).toContain('· 历史 ›')
  expect(notesPage).toContain('onOpenFocusHistory(editing)')
  expect(app).toContain('noteFocusHistorySessions.map(session=>')
  expect(app).toContain('beginEditFocusSession(session)')
  expect(app).toContain("trashFocusSession(item,now)")
})

test('note focus history dates reuse the shared UI date formatter', () => {
  expect(app).toContain('formatUiDate(started)} · {started.toLocaleTimeString')
  expect(app).toContain('formatUiDate(fromDateKey(focusHistoryDate))')
  expect(app).not.toContain('<h2>{focusHistoryDate} · 专注记录</h2>')
})

test('editing a contextual focus session changes time and tags without replacing its context', () => {
  const start = app.indexOf('const saveFocusSessionEdit =')
  const end = app.indexOf('const anniversaryOccurrencesByDate', start)
  const body = app.slice(start, end)
  expect(body).toContain('editFinishedFocusSession(session, {')
  expect(body).toContain('setFocusSessions(current => current.map(item => item.id === focusEditId ? result.session : item))')
  expect(body).not.toContain('context:')
})
