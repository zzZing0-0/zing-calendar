import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { readApplicationSource } from '../helpers/applicationSource'

const app = readApplicationSource()

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
  const details=fs.readFileSync(path.resolve(process.cwd(), 'src/features/tasks/TaskDetails.tsx'), 'utf8')
  expect(details).toContain('duration={formatFocusDuration(taskFocusHistorySeconds)}')
  expect(details).toContain('onHistory={()=>setTaskFocusHistoryOpen(true)}')
})

test('task focus history regression › recurring occurrences still expose no task focus history', () => {
  const selectors = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/focusHistorySelectors.ts'), 'utf8')
  expect(selectors).toContain('task && !task.seriesId ? task.id : null')
  const details=fs.readFileSync(path.resolve(process.cwd(), 'src/features/tasks/TaskDetails.tsx'), 'utf8')
  expect(details).toContain("!viewingTask.recurrence && !viewingTask.seriesId && (viewingTask.status === 'todo' || taskFocusHistorySeconds > 0)")
})
