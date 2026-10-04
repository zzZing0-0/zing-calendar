import { expect, test } from '@playwright/test'
import { clampMaxFocusHours, parseDefaultPriority, readAppPreferences } from '../../src/hooks/useAppPreferences'

function storage(values: Record<string, string> = {}) {
  return { getItem: (key: string) => values[key] ?? null } as Pick<Storage, 'getItem'>
}

test.describe('app preferences hook regression', () => {
  test('missing storage keeps the stable application defaults', () => {
    expect(readAppPreferences(storage())).toEqual({
      greeting: 'Hello, Zing',
      weekStartsMonday: true,
      dateFormat: 'dmy',
      showEndedTasks: true,
      showAllRecurringTasks: true,
      excludeDefaultFocusStats: false,
      maxFocusHours: 2,
      defaultPriority: 0,
    })
  })

  test('stored scalar preferences preserve the existing localStorage semantics', () => {
    expect(readAppPreferences(storage({
      'zing:greeting': 'Hi',
      'zing:weekStart': 'sunday',
      'zing:dateFormat': 'mdy',
      'zing:showEndedTasks': 'false',
      'zing:showAllRecurringTasks': 'false',
      'zing:excludeDefaultFocusStats': 'true',
      'zing:maxFocusHours': '7',
      'zing:defaultPriority': '3',
    }))).toEqual({
      greeting: 'Hi',
      weekStartsMonday: false,
      dateFormat: 'mdy',
      showEndedTasks: false,
      showAllRecurringTasks: false,
      excludeDefaultFocusStats: true,
      maxFocusHours: 7,
      defaultPriority: 3,
    })
  })

  test('focus-hour parsing retains the 2 to 12 hour safety bounds', () => {
    expect(clampMaxFocusHours('1')).toBe(2)
    expect(clampMaxFocusHours('13')).toBe(12)
    expect(clampMaxFocusHours('not-a-number')).toBe(2)
    expect(clampMaxFocusHours(8)).toBe(8)
  })

  test('default priority accepts only the four supported priority values', () => {
    expect(parseDefaultPriority('0')).toBe(0)
    expect(parseDefaultPriority('2')).toBe(2)
    expect(parseDefaultPriority('4')).toBe(1)
    expect(parseDefaultPriority('oops')).toBe(1)
  })
})
