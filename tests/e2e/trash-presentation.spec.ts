import { expect, test } from '@playwright/test'
import { readApplicationSource, readStylesheet } from '../helpers/applicationSource'

const source = readApplicationSource()
const css = readStylesheet('src/App.css')

test('trash task view separates unfinished and completed tasks when ended items are visible', () => {
  expect(source).toContain("{label:'未完成',items:trashTaskGroups.active}")
  expect(source).toContain("{label:'已完成',items:trashTaskGroups.ended}")
  expect(source).toContain('className="trash-task-status" aria-label="已完成">✓</span>')
  expect(source).toContain("return showEndedTasks ? filtered : filtered.filter(item => item.entity !== 'task' || trashTaskStatus(item) === 'todo')")
  expect(css).toContain('.trash-task-group-label')
  expect(css).toContain('.trash-inbox-item.completed')
})
