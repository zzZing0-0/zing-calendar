import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')

test('task, habit and note share presentation while keeping independent focus actions', () => {
  const task = read('src/features/tasks/TaskDetails.tsx')
  const habit = read('src/features/habits/HabitsPage.tsx')
  const note = read('src/features/notes/NotesPage.tsx')
  const card = read('src/components/ui/FocusCard.tsx')
  expect(task).toContain('<FocusCard className="task-focus-card"')
  expect(habit).toContain('<FocusCard className="habit-focus-panel"')
  expect(note).toContain('<FocusCard className="note-focus-card"')
  expect(task).toContain('startTaskTimer(viewingTask)')
  expect(habit).toContain('onStartHabitFocus(habit)')
  expect(note).toContain('onStartNoteFocus(editing)')
  expect(card).toContain('onClick={onHistory}')
})
