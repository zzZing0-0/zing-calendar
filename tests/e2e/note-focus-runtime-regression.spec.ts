import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.tsx', 'utf8')

test('note tag picker is mounted independently of the global focus modal', () => {
  const focusModal = app.indexOf('{focusOpen && (')
  const notePicker = app.indexOf('{pendingNoteFocusId&&<div className="focus-tag-select-layer"')
  const trashModal = app.indexOf('{trashOpen && (')
  expect(focusModal).toBeGreaterThan(-1)
  expect(notePicker).toBeGreaterThan(focusModal)
  expect(notePicker).toBeLessThan(trashModal)
  const focusBlock = app.slice(focusModal, notePicker)
  expect(focusBlock).not.toContain('aria-label="选择笔记专注标签"')
})

test('starting note focus keeps the originating note workspace available without a blocking modal', () => {
  const start = app.indexOf('const startNoteFocus =')
  const request = app.indexOf('const requestNoteFocus =')
  const body = app.slice(start, request)
  expect(body).toContain('createNoteFocusSession')
  expect(body).toContain('setFocusOpen(false)')
  expect(body).toContain("setMainView('notes')")
  expect(body).toContain('setRequestedNoteId(note.id)')
})

test('global focus stop dispatches by context so note focus can end without reload', () => {
  expect(app).toContain('if(activeFocusNote)stopNoteFocus(activeFocusNote);else if(activeFocusHabit)stopHabitFocus(activeFocusHabit);else if(activeTimerTask)stopTaskTimer(activeTimerTask);else stopDirectFocus(false)')
})

test('hydrated note focus restores the originating note workspace under the focus lock', () => {
  const hydration = app.indexOf("if (context?.kind === 'note')")
  const tail = app.indexOf("setMainView('calendar')", hydration)
  const branch = app.slice(hydration, tail)
  expect(branch).toContain('setFocusOpen(true)')
  expect(branch).toContain("setMainView('notes')")
  expect(branch).toContain('setRequestedNoteId(note.id)')
})

test('global focus trigger navigates to active note focus without reopening a blocking modal', () => {
  expect(app).toContain("if(activeFocusNote){setFocusOpen(false);setMainView('notes');setRequestedNoteId(activeFocusNote.id);return}")
})
