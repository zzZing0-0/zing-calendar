import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readStylesheet } from '../helpers/applicationSource'

const habit = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
const habitCss = readStylesheet('src/features/habits/habits.css')
const notes = readFileSync('src/features/notes/NotesPage.tsx', 'utf8')
const appCss = readStylesheet('src/App.css')

test('habit details use a single check-in entry and a separate dialog for date and quantity', () => {
  expect(habit).toContain('className="habit-open-log-button"')
  expect(habit).toContain('setLogDialogOpen(true)')
  expect(habit).toContain('aria-label={editingLog?"修改打卡记录":"补充打卡"}')
  expect(habit).toContain('setLogDialogOpen(false)')
  expect(habit).toContain('setLogQuantity(row.quantity);setLogDialogOpen(true)')
  expect(habitCss).toContain('.habit-log-dialog-layer')
})

test('note focus controls use neutral button styling rather than link styling', () => {
  expect(notes).toContain('className="note-focus-history-trigger"')
  expect(appCss).toContain('.note-focus-row .note-focus-history-trigger,.note-focus-row>button:last-child')
  expect(appCss).toContain('text-decoration:none!important')
})
