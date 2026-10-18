import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readStylesheet } from '../helpers/applicationSource'

const habit = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
const habitCss = readStylesheet('src/features/habits/habits.css')
const notes = readFileSync('src/features/notes/NotesPage.tsx', 'utf8')

test('habit details use a single check-in entry and a separate dialog for date and quantity', () => {
  expect(habit).toContain('className="habit-open-log-button"')
  expect(habit).toContain('setLogDialogOpen(true)')
  expect(habit).toContain('aria-label={editingLog?"修改打卡记录":"补充打卡"}')
  expect(habit).toContain('setLogDialogOpen(false)')
  expect(habit).toContain('setLogQuantity(row.quantity);setLogDialogOpen(true)')
  expect(habitCss).toContain('.habit-log-dialog-layer')
})

test('note focus controls use neutral button styling rather than link styling', () => {
  const shared = readFileSync('src/components/ui/FocusCard.tsx', 'utf8')
  const sharedCss = readStylesheet('src/styles/focus-card.css')
  expect(notes).toContain('<FocusCard className="note-focus-card"')
  expect(shared).toContain('className="ui-focus-card-history"')
  expect(sharedCss).toContain('.ui-focus-card .ui-focus-card-history')
  expect(sharedCss).toContain('background:#fff')
  expect(sharedCss).not.toContain('text-decoration:underline')
})
