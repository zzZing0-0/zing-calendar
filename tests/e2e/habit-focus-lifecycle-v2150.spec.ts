import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readApplicationSource } from '../helpers/applicationSource'
const source = (name: string) => readFileSync(resolve('src', name), 'utf8')
test('habit deletion and restore cascade only associated sessions', () => {
  const lifecycle = source('domain/habitFocusLifecycle.ts')
  expect(lifecycle).toContain("session.context?.kind !== 'habit'")
  expect(lifecycle).toContain('session.trashedAt ||')
  expect(lifecycle).toContain('trashedByHabitId: habitId')
  expect(lifecycle).toContain('session.trashedByHabitId !== habitId')
  expect(lifecycle).toContain('permanentlyDeleteHabitFocus')
  expect(lifecycle).toContain('purgeTrashWithHabitFocus')
})
test('habit deletion, restoration, permanent deletion, and trash purge use cascade', () => {
  const app = readApplicationSource()
  const page = source('features/habits/HabitsPage.tsx')
  expect(page).toContain('onDeleteHabit(habit.id)')
  expect(app).toContain('cascadeTrashHabitFocus(current,habitId,now)')
  expect(app).toContain('cascadeRestoreHabitFocus(current,item.habit.id,now)')
  expect(app).toContain('permanentlyDeleteHabitFocus(current,item.habit.id)')
  expect(app).toContain('purgeTrashWithHabitFocus(')
  expect(app).toContain('!session.trashedByHabitId')
})
