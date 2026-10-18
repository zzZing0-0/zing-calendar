import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const app = readFileSync('src/App.tsx', 'utf8')
const habits = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
test('active habit focus header navigates to the exact habit detail', () => {
  expect(app).toContain('setRequestedHabitId(previous=>({id:activeFocusHabit.id')
  expect(app).toContain("setMainView('habits')")
  expect(app).toContain('requestedHabitId={requestedHabitId}')
  expect(habits).toContain('h.id===requestedHabitId.id&&!h.deletedAt')
  expect(habits).toContain('setSelected(target.id)')
  expect(habits).toContain('[requestedHabitId]')
})
