import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const task = fs.readFileSync('src/features/tasks/TaskDetails.tsx', 'utf8')
const note = fs.readFileSync('src/features/focus/FocusDialogs.tsx', 'utf8')

test('task history uses a single text return control, preserving close on the task detail', () => {
  expect(task).toContain('taskFocusHistoryOpen ? <Button className="task-focus-history-return"')
  expect(task).toContain('>返回</Button> : <Button className="close-button"')
  expect(task).toContain("setTaskFocusHistoryOpen(false);setFocusEditId(null);setFocusEditError('')")
  expect(task).not.toContain('‹ 返回')
  expect(task).toContain('setViewingTask(null)')
})

test('task and note history use the same totals presentation', () => {
  expect(task).toContain('<FocusHistorySummary duration={formatFocusDuration(taskFocusHistorySeconds)} count={taskFocusHistorySessions.length} />')
  expect(note).toContain('<FocusHistorySummary duration={formatFocusDuration(noteFocusHistorySeconds)} count={noteFocusHistorySessions.length} />')
})
