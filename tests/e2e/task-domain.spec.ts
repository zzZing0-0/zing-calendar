import { expect, test } from '@playwright/test'
import { emptyDraft, normalizedActualDurationMinutes, recurrenceFromDraft } from '../../src/domain/task'



test.describe('numeric input bounds regression', () => {
  test('manual duration minutes cannot bypass the 0 to 59 minute component', () => {
    expect(normalizedActualDurationMinutes('2', '10000')).toBe(2 * 60 + 59)
    expect(normalizedActualDurationMinutes('0', '-5')).toBeUndefined()
  })

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
