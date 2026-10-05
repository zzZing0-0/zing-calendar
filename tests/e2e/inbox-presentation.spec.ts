import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')

test('Inbox UI exposes unscheduled task creation and recurrence guard', () => {
  expect(source).toContain('收集箱')
  expect(source).toContain('inbox-trigger-icon')
  expect(source).not.toContain('<span>📥</span>')
  expect(source).toContain('<span>跨日期</span>')
  expect(source).toContain('添加未排期任务')
  expect(source).not.toContain('未安排日期的任务会保存在收集箱中。')
  expect(source).toContain('compactCount(inboxTasks.length)')
  expect(source).toContain('compactCount(overdueTasks.length)')
  expect(source).toContain('请先取消重复。重复任务需要关联日期。')
  expect(source).toContain("date: '', endDate: '', allDay: false")
})
