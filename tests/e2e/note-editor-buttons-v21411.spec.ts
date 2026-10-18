import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const page = readFileSync('src/features/notes/NotesPage.tsx','utf8')
const styles = readFileSync('src/App.css','utf8')
test('note finish button uses a dedicated theme-styled action', () => {
  expect(page).toContain('className="note-finish-button" onClick={finishEditing}')
  expect(styles).toContain('.note-editor .note-editor-actions .note-finish-button')
  expect(styles).toContain('background:#39765d!important')
})
test('mobile edit and preview tabs use neutral colors and clear active state', () => {
  expect(page).toContain('className={mobileMode===\'preview\'?\'active\':\'\'}')
  expect(styles).toContain('.note-editor .note-mobile-tabs button.active')
  expect(styles).toContain('-webkit-text-fill-color:#34483e')
})
