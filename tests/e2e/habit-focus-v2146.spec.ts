import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readApplicationSource } from '../helpers/applicationSource'

const app = readApplicationSource()
const page = readFileSync('src/features/habits/HabitsPage.tsx','utf8')
const historyView = readFileSync('src/features/habits/HabitFocusHistory.tsx','utf8')
const runtime = readFileSync('src/domain/focusRuntime.ts','utf8')
const selectors = readFileSync('src/domain/focusHistorySelectors.ts','utf8')
const lifecycle = readFileSync('src/domain/focusContextLifecycle.ts','utf8')
const types = readFileSync('src/types.ts','utf8')

test('habit focus is a first-class session context using shared stopwatch lifecycle', () => {
  expect(types).toContain("{ kind: 'habit'; habitId: string }")
  expect(runtime).toContain('export function createHabitFocusSession')
  expect(runtime).toContain("context:{kind:'habit',habitId:input.habitId}")
  expect(app).toContain('createHabitFocusSession({id:crypto.randomUUID()')
  expect(app).toContain('endFocusSession(current,session.id,Date.now())')
})

test('habit focus never writes a habit check-in and is protected by global single timer', () => {
  const start = app.slice(app.indexOf('const startHabitFocus ='),app.indexOf('const stopHabitFocus ='))
  expect(start).toContain('if (activeFocusSession || habit.archivedAt || habit.deletedAt) return')
  expect(start).not.toContain('setHabitCheckIns')
  const stop = app.slice(app.indexOf('const stopHabitFocus ='),app.indexOf('const activeTimerTask ='))
  expect(stop).not.toContain('setHabitCheckIns')
  expect(page).toContain('disabled={focusBusy}')
})

test('habit focus history supports edit and trash without deleting habit check-ins', () => {
  expect(selectors).toContain("session.context.kind === 'habit' && session.context.habitId === id")
  expect(page).toContain('onEdit={onEditFocusSession}')
  expect(historyView).toContain('onEdit(session)')
  expect(page).toContain('onTrash={onTrashFocusSession}')
  expect(historyView).toContain('onTrash(session)')
  expect(app).toContain('aria-label="修改习惯专注记录"')
  expect(app).toContain('onClick={saveFocusSessionEdit}')
  expect(app).toContain('trashFocusSession(item,now)')
  expect(lifecycle).toContain("if (context.kind === 'habit') return true")
})

test('habit focus appears in daily history and keeps completion independent', () => {
  const focus = readFileSync('src/domain/focus.ts','utf8')
  expect(focus).toContain("session.context?.kind === 'habit'")
  expect(focus).toContain("kind:'habit'")
  expect(app).toContain("activeFocusHabit?`习惯专注")
  expect(page).toContain('▶ 开始习惯专注')
  expect(page).toContain('结束专注')
  expect(page).toContain('onQuickCheckIn(h,today)')
})
