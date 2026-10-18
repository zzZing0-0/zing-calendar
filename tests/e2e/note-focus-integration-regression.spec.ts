import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { readApplicationSource } from '../helpers/applicationSource'

const root=path.resolve(process.cwd())
const app=()=>readApplicationSource()
const notes=()=>fs.readFileSync(path.join(root,'src/features/notes/NotesPage.tsx'),'utf8')

test('Note focus uses shared global FocusSession runtime instead of storing aggregate time on Note', () => {
  const appSource=app(), noteSource=notes()
  expect(appSource).toContain('createNoteFocusSession')
  expect(appSource).toContain('activeFocusNote')
  expect(noteSource).toContain('<FocusCard className="note-focus-card"')
  expect(noteSource).toContain('focusSecondsByNoteId[editing.id]')
  expect(noteSource).toContain('onStartNoteFocus')
  expect(noteSource).not.toContain('actualDurationMinutes')
})

test('Note trash restore and permanent delete explicitly cascade its FocusSessions', () => {
  const source=app()
  expect(source).toContain('cascadeTrashNoteFocus')
  expect(source).toContain('cascadeRestoreNoteFocus')
  expect(source).toContain('permanentlyDeleteNoteFocus')
  expect(source).toContain('!session.trashedByNoteId')
})
