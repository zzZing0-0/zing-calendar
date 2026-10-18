import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')

test('task focus history regression › compact task viewer owns raw task focus history CRUD', () => {
  expect(app).toContain('taskFocusHistoryOpen')
  expect(app).toContain('task-inline-focus-history')
  expect(app).toContain('focusHistoryForTask(viewingTask, focusSessions, timerNow)')
  expect(app).toContain('beginEditFocusSession(session)')
  expect(app).toContain("trashFocusSession(item,now)")
  expect(app).toContain('确定删除这条任务专注记录吗？')
})

test('task focus history regression › task history preserves shared date formatting and contextual edit path', () => {
  expect(app).toContain('formatUiDate(started)')
  expect(app).toContain('saveFocusSessionEdit')
  expect(app).toContain('累计专注 {formatFocusDuration(taskFocusHistorySeconds)} · 历史 ›')
})

test('task focus history regression › recurring occurrences still expose no task focus history', () => {
  const selectors = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/focusHistorySelectors.ts'), 'utf8')
  expect(selectors).toContain('task && !task.seriesId ? task.id : null')
  expect(app).toContain('taskFocusHistorySeconds > 0 && !viewingTask.seriesId')
})
