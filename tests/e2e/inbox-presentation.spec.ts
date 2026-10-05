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

test('Inbox separates unfinished and completed tasks and gives completed tasks explicit state', () => {
  expect(source).toContain("groupInboxTodoTasks(inboxTasks.filter(task => task.status === 'todo')")
  expect(source).toContain("sortCompletedInboxTasks(inboxTasks.filter(task => task.status !== 'todo'))")
  expect(source).toContain('showEndedTasks&&inboxCompletedTasks.length>0')
  expect(source).toContain('inbox-task-group-label')
  expect(source).toContain('overdue-priority-box completed')
  expect(source).toContain('aria-label="已完成"')
  expect(css).toContain('.inbox-task-group .overdue-inbox-item.completed .overdue-task-link strong')
  expect(css).toContain('.inbox-task-group.completed')
})

test('Inbox exposes compact add action and draggable three-key sorting controls', () => {
  expect(source).toContain('inbox-add-button')
  expect(source).not.toContain('className="primary-button" type="button" onClick={openInboxTaskEditor}>＋ 添加未排期任务')
  expect(source).toContain('inbox-sort-row')
  expect(source).toContain('data-inbox-sort-key={key}')
  expect(source).toContain('moveInboxSortKey(current,from,key)')
  expect(source).toContain("localStorage.setItem('zing:inboxSortOrder'")
  expect(source).toContain('inboxTodoGroups')
  expect(source).toContain('inboxCompletedTasks')
  expect(css).toContain('.inbox-sort-chip.primary')
})


test('Inbox sorting previews the landing position while dragging and keeps arrow priority', () => {
  expect(source).not.toContain('↔ 拖动调整排序顺序')
  expect(source).toContain('inboxSortDropTarget')
  expect(source).toContain('inbox-sort-drop-cue')
  expect(source).toContain('放这里')
  expect(css).toContain('.inbox-sort-chip.drop-target')
  expect(source).toContain('inbox-sort-arrow')
  expect(source).toContain('>›</span>')
  expect(source).not.toContain('{index===0&&<small>第一</small>}')
})

test('Inbox task operations keep the Inbox open and rows show tag plus activity metadata', () => {
  expect(source).toContain('const inboxTaskMeta = (task: Task) =>')
  expect(source).toContain("inboxActivityKind(task) === 'updated' ? '更新' : '创建'")
  expect(source).toContain('inbox-task-meta')
  expect(source).toContain('inboxTaskMeta(task).tag')
  expect(source).toContain('inboxTaskMeta(task).activity')
  expect(css).toContain('time.inbox-task-meta')
  const editorStart=source.indexOf('const openInboxTaskEditor = () =>')
  const editorEnd=source.indexOf('const openTaskDetail =', editorStart)
  expect(source.slice(editorStart,editorEnd)).not.toContain('setInboxOpen(false)')
  expect(source).not.toContain('openTaskDetail(task)}}><strong>{task.title}</strong><time>未排期</time>')
})
