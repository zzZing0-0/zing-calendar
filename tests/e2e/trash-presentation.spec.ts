import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')

test('trash task view separates unfinished and completed tasks when ended items are visible', () => {
  expect(source).toContain("{label:'未完成',items:trashTaskGroups.active}")
  expect(source).toContain("{label:'已完成',items:trashTaskGroups.ended}")
  expect(source).toContain('className="trash-task-status" aria-label="已完成">✓</span>')
  expect(source).toContain("return showEndedTasks ? filtered : filtered.filter(item => item.entity !== 'task' || trashTaskStatus(item) === 'todo')")
  expect(css).toContain('.trash-task-group-label')
  expect(css).toContain('.trash-inbox-item.completed')
})
