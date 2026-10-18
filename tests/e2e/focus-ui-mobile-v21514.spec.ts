import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const source = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8')

test('task, habit and note use the same focus card with their independent callbacks', () => {
  const card = source('components/ui/FocusCard.tsx')
  expect(card).toContain('ui-focus-card-heading')
  expect(card).toContain('ui-focus-card-content')
  const task = source('features/tasks/TaskDetails.tsx')
  const habit = source('features/habits/HabitsPage.tsx')
  const note = source('features/notes/NotesPage.tsx')
  for (const content of [task, habit, note]) expect(content).toContain('<FocusCard')
  expect(task).toContain('startTaskTimer(viewingTask)')
  expect(task).toContain('stopTaskTimer(viewingTask)')
  expect(habit).toContain('onStartHabitFocus(habit)')
  expect(habit).toContain('onStopHabitFocus(habit)')
  expect(note).toContain('onStartNoteFocus(editing)')
  expect(note).toContain('onStopNoteFocus(editing)')
  expect(task).toContain('开始任务专注')
  expect(habit).toContain('开始习惯专注')
  expect(note).toContain('开始笔记专注')
})

test('iPhone task date/time inputs are constrained by their grid and retain native input types', () => {
  const css = source('styles/focus-card.css')
  const editor = source('features/tasks/TaskEditor.tsx')
  expect(css).toContain('grid-template-columns:minmax(0,1fr)')
  expect(css).toContain('.task-editor .field-grid input[type="date"]')
  expect(css).toContain('.task-editor .field-grid input[type="time"]')
  expect(css).toContain('min-width:0')
  expect(editor).toContain('type="date"')
  expect(editor).toContain('type="time"')
  expect(source('main.tsx')).toContain("import './styles/focus-card.css'")
})
