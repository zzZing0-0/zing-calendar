import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { readApplicationSource } from '../helpers/applicationSource'

const app = readApplicationSource()
const notes = fs.readFileSync('src/features/notes/NotesPage.tsx', 'utf8')

test('note focus opens the shared focus-eligible tag choice instead of silently using the note tag or default', () => {
  expect(notes).toContain('onStartNoteFocus(editing)')
  expect(app).toContain('onStartNoteFocus={requestNoteFocus}')
  expect(app).toContain('setPendingNoteFocusId(note.id)')
  expect(app).toContain('aria-label="选择笔记专注标签"')
  expect(app).toContain('focusSelectableTags(tags).map')
  expect(app).toContain('startNoteFocus(note,tag.id)')
  expect(app).not.toContain("const tagId = (note.tagIds ?? []).find")
})

test('note focus tag choice starts from the latest selectable Focus tag and persists the explicit choice', () => {
  expect(app).toContain('last ? lastSelectableFocusTagId(last,tags) : DEFAULT_TAG_ID')
  expect(app).toContain('eligible.some(tag => tag.id === tagId) ? tagId : DEFAULT_TAG_ID')
  expect(app).toContain('tagIds:[selectedTagId]')
})
