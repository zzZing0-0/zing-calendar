import { expect, test } from '@playwright/test'
import { DEFAULT_INBOX_SORT_ORDER, compareInboxTasks, groupInboxTodoTasks, inboxActivityAt, inboxActivityKind, moveInboxSortKey, normalizeInboxSortOrder, sortCompletedInboxTasks } from '../../src/domain/inbox'
import type { Tag, Task } from '../../src/types'

const tags: Tag[] = [
  { id:'default', name:'默认', color:'#aaa', scope:'both', sortOrder:0, updatedAt:'2026-01-01T00:00:00Z', system:true, systemKind:'default' },
  { id:'a', name:'工具', color:'#bbb', scope:'task', sortOrder:1, updatedAt:'2026-01-01T00:00:00Z' },
  { id:'b', name:'科研', color:'#ccc', scope:'task', sortOrder:2, updatedAt:'2026-01-01T00:00:00Z' },
]
const task = (id:string, priority:0|1|2|3, updatedAt:string, tagId='default', completedAt?:string): Task => ({ id, title:id, date:null, priority, status:completedAt?'completed':'todo', allDay:false, createdAt:'2026-01-01T00:00:00Z', updatedAt, completedAt, tagIds:[tagId] })

test('Inbox sort order normalizes and draggable reordering moves a key to the target position', () => {
  expect(normalizeInboxSortOrder(null)).toEqual(DEFAULT_INBOX_SORT_ORDER)
  expect(normalizeInboxSortOrder(['priority','tag','time'])).toEqual(['priority','tag','time'])
  expect(normalizeInboxSortOrder(['time','time','tag'])).toEqual(DEFAULT_INBOX_SORT_ORDER)
  expect(moveInboxSortKey(['time','priority','tag'],'priority','time')).toEqual(['priority','time','tag'])
})

test('Inbox tag ordering accepts normal Tag objects without passing them as tag IDs', () => {
  const rows=[task('tagged',1,'2026-10-05T00:00:00Z','a'),task('default',1,'2026-10-04T00:00:00Z')]
  expect(() => [...rows].sort((a,b)=>compareInboxTasks(a,b,['tag','time','priority'],tags))).not.toThrow()
  expect(groupInboxTodoTasks(rows,['tag','time','priority'],tags).map(group=>group.label)).toEqual(['默认','工具'])
  expect(groupInboxTodoTasks(rows,['tag','time','priority'],tags).map(group=>group.color)).toEqual(['#aaa','#bbb'])
})

test('Inbox unfinished sorting applies primary, secondary, and tertiary keys in order', () => {
  const rows=[task('old-p3',3,'2026-10-01T00:00:00Z','b'),task('new-p1',1,'2026-10-05T00:00:00Z','a'),task('newer-p3',3,'2026-10-04T00:00:00Z','a')]
  expect([...rows].sort((a,b)=>compareInboxTasks(a,b,['priority','tag','time'],tags)).map(x=>x.id)).toEqual(['newer-p3','old-p3','new-p1'])
  expect([...rows].sort((a,b)=>compareInboxTasks(a,b,['time','priority','tag'],tags)).map(x=>x.id)).toEqual(['new-p1','newer-p3','old-p3'])
})

test('only the primary Inbox sort key creates visible groups', () => {
  const rows=[task('p3-a',3,'2026-10-01T00:00:00Z','a'),task('p3-b',3,'2026-10-02T00:00:00Z','b'),task('p1',1,'2026-10-03T00:00:00Z','a')]
  const priorityGroups=groupInboxTodoTasks(rows,['priority','tag','time'],tags)
  expect(priorityGroups.map(g=>g.label)).toEqual(['P3 · 紧急','P1 · 普通'])
  expect(priorityGroups.map(g=>g.color)).toEqual(['#c8665f','#d3b64b'])
  expect(priorityGroups[0].tasks.map(x=>x.id)).toEqual(['p3-a','p3-b'])
  const timeGroups=groupInboxTodoTasks(rows,['time','priority','tag'],tags)
  expect(timeGroups).toHaveLength(1)
  expect(timeGroups[0].label).toBe('最近更新')
})

test('completed Inbox tasks ignore unfinished sort keys and keep newest completion first', () => {
  const rows=[task('older',3,'2026-10-05T00:00:00Z','a','2026-10-04T12:00:00Z'),task('newer',0,'2026-10-01T00:00:00Z','b','2026-10-05T12:00:00Z')]
  expect(sortCompletedInboxTasks(rows).map(x=>x.id)).toEqual(['newer','older'])
})


test('Inbox time semantics use updates when present and creation as the fallback', () => {
  const createdOnly={...task('created',1,'2026-10-05T10:00:00Z'),createdAt:'2026-10-05T10:00:00Z',updatedAt:'2026-10-05T10:00:00Z'}
  const updated={...task('updated',1,'2026-10-05T12:00:00Z'),createdAt:'2026-10-01T10:00:00Z'}
  expect(inboxActivityKind(createdOnly)).toBe('created')
  expect(inboxActivityKind(updated)).toBe('updated')
  expect(inboxActivityAt(updated)).toBe('2026-10-05T12:00:00Z')
})
