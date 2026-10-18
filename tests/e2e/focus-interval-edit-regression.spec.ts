import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const focus = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/focus.ts'), 'utf8')
const task = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/task.ts'), 'utf8')

test('focus interval edit regression › historical focus edits start and end timestamps instead of a free-standing duration', () => {
  expect(app).toContain('focusEditStartedAt')
  expect(app).toContain('focusEditEndedAt')
  expect(app).toContain('type="datetime-local"')
  expect(app).toContain('计算时长')
  expect(app).not.toContain('focusEditMinutes')
  expect(app).not.toContain('FOCUS_EDIT_MAX_MINUTES')
})

test('focus interval edit regression › save validates a real positive interval and derives durationSeconds from it', () => {
  const actions = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/focusSessionActions.ts'), 'utf8')
  expect(app).toContain('editFinishedFocusSession(session, {')
  expect(actions).toContain('if (durationMs <= 0)')
  expect(actions).toContain('durationSeconds: Math.round(durationMs / 1000)')
})

test('focus interval edit regression › finished countdown sessions use their actual edited interval while active countdown remains capped by its plan', () => {
  expect(focus).toContain('if (session.endedAt)')
  expect(focus).toContain('focusSessionEndMs(session, nowMs)')
  expect(task).toContain("!session.endedAt && session.mode==='countdown'")
})

test('focus interval edit regression › direct, note, and task history share the same interval editor', () => {
  expect((app.match(/\{focusHistoryEditFields\}/g) ?? []).length).toBe(4)
  expect(app).toContain('noteFocusHistorySessions.map')
  expect(app).toContain('taskFocusHistorySessions.map')
  expect(app).toContain("session.context?.kind==='habit'")
})
