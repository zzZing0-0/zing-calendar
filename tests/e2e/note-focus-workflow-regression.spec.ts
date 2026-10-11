import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.tsx', 'utf8')
const focus = fs.readFileSync('src/domain/focus.ts', 'utf8')

test('ending note focus stays in the note workspace and never falls through to free focus', () => {
  const start = app.indexOf('const stopNoteFocus =')
  const end = app.indexOf('const activeTimerTask', start)
  const body = app.slice(start, end)
  expect(body).toContain("setMainView('notes')")
  expect(body).toContain('setRequestedNoteId(note.id)')
  expect(body).toContain('setFocusOpen(false)')
  expect(body).not.toContain('startDirectFocus')
})

test('note-context focus records use the shared focus edit and trash controls', () => {
  expect(app).toContain("const editing=record.kind!=='task'&&record.session&&focusEditId===record.session.id")
  expect(app).toContain("record.kind==='note'&&record.note&&<button")
  expect(app).toContain("if(record.kind!=='task'&&record.session)beginEditFocusSession(record.session)")
  expect(app).toContain("record.kind!=='task'&&record.session&&<button type=\"button\" className=\"danger\"")
})

test('editing a contextual focus session changes time and tags without replacing its context', () => {
  const start = app.indexOf('const saveFocusSessionEdit =')
  const end = app.indexOf('const anniversaryOccurrencesByDate', start)
  const body = app.slice(start, end)
  expect(body).toContain('return {...session,tagIds:')
  expect(body).not.toContain('context:')
})

test('note focus history keeps each raw FocusSession independently editable', () => {
  expect(focus).toContain('const noteRows: FocusHistoryRecord[] = []')
  expect(focus).toContain('noteRows.push({ id:`note:${session.id}`')
  expect(focus).not.toContain('noteRows.set(session.context.noteId')
})
