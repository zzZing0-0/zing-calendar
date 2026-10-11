import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const root=path.resolve(process.cwd())
const app=()=>fs.readFileSync(path.join(root,'src/App.tsx'),'utf8')
const notes=()=>fs.readFileSync(path.join(root,'src/features/notes/NotesPage.tsx'),'utf8')

test('Note focus uses shared global FocusSession runtime instead of storing aggregate time on Note', () => {
  const appSource=app(), noteSource=notes()
  expect(appSource).toContain('createNoteFocusSession')
  expect(appSource).toContain('activeFocusNote')
  expect(noteSource).toContain('累计专注')
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
