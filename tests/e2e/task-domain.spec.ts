import { expect, test } from '@playwright/test'
import { compactCount, emptyDraft, recurrenceFromDraft } from '../../src/domain/task'




test('compact count keeps two digits and caps larger counts at 99+', () => {
  expect(compactCount(0)).toBe('0')
  expect(compactCount(1)).toBe('1')
  expect(compactCount(99)).toBe('99')
  expect(compactCount(100)).toBe('99+')
  expect(compactCount(237)).toBe('99+')
})


test.describe('numeric input bounds regression', () => {
  test('custom recurrence interval cannot exceed the UI maximum when persisted', () => {
    const draft = emptyDraft(new Date(2026, 9, 5))
    draft.repeatPreset = 'custom'
    draft.repeatUnit = 'day'
    draft.repeatInterval = 10000
    expect(recurrenceFromDraft(draft)?.interval).toBe(999)
  })

  test('recurrence count cannot exceed the UI maximum when persisted', () => {
    const draft = emptyDraft(new Date(2026, 9, 5))
    draft.repeatPreset = 'daily'
    draft.repeatEndMode = 'count'
    draft.repeatEndCount = 100000
    expect(recurrenceFromDraft(draft)?.end).toEqual({ type: 'count', count: 9999 })
  })
})

test.describe('Inbox scheduling invariants', () => {
  test('undated task cannot retain recurrence or schedule-only fields', async () => {
    const { normalizeTaskScheduling } = await import('../../src/domain/task')
    const task = normalizeTaskScheduling({
      id:'inbox-1', title:'做 Zing 笔记本功能', date:null, endDate:'2026-10-10', priority:1, status:'todo', allDay:true,
      time:'09:00', createdAt:'2026-10-05T00:00:00.000Z', updatedAt:'2026-10-05T00:00:00.000Z',
      recurrence:{ unit:'day', interval:1 }, recurrenceExceptions:{}, originalDate:'2026-10-05',
    })
    expect(task.date).toBeNull()
    expect(task.recurrence).toBeUndefined()
    expect(task.recurrenceExceptions).toBeUndefined()
    expect(task.endDate).toBeUndefined()
    expect(task.time).toBeUndefined()
  })

  test('undated draft cannot create recurrence', () => {
    const draft = emptyDraft(new Date(2026, 9, 5))
    draft.date = ''
    draft.repeatPreset = 'daily'
    expect(recurrenceFromDraft(draft)).toBeUndefined()
  })

  test('dated task can enable recurrence and undated task stays outside calendar expansion', async () => {
    const { expandTasks, normalizeTaskScheduling } = await import('../../src/domain/task')
    const datedDraft = emptyDraft(new Date(2026, 9, 5)); datedDraft.repeatPreset='daily'
    expect(recurrenceFromDraft(datedDraft)?.unit).toBe('day')
    const inbox = normalizeTaskScheduling({ id:'i', title:'Inbox', date:null, priority:1, status:'todo', allDay:false, createdAt:'2026-10-05T00:00:00.000Z', updatedAt:'2026-10-05T00:00:00.000Z' })
    expect(expandTasks([inbox], '2026-10-01', '2026-10-31')).toEqual([])
  })
})
