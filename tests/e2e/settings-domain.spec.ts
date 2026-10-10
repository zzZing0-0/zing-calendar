import { expect, test } from '@playwright/test'
import { advanceWordClock, buildSyncedSettings, hydrateWordClock, normalizeIgnoredWords, normalizedIncomingSettings, settingsEqualIgnoringUpdatedAt } from '../../src/domain/settings'
import { DEFAULT_THERMAL_OPTIONS, DEFAULT_WEATHER_OPTIONS } from '../../src/domain/preferences'
import { DEFAULT_EMOTION_OPTIONS } from '../../src/domain/emotions'

test.describe('settings domain regression', () => {
  test('ignored words are normalized and deduplicated before sync', () => {
    expect(normalizeIgnoredWords([' Foo ', 'foo', '', 'BAR'])).toEqual(['foo', 'bar'])
  })

  test('word clocks preserve legacy words and timestamp additions/removals deterministically', () => {
    const initial = hydrateWordClock({ updatedAt: '2026-10-01T00:00:00.000Z', wordCloudIgnored: ['Alpha'] }, 'fallback')
    expect(initial.added.alpha).toBe('2026-10-01T00:00:00.000Z')
    const next = advanceWordClock(['Beta'], initial, '2026-10-04T00:00:00.000Z')
    expect(next.added.beta).toBe('2026-10-04T00:00:00.000Z')
    expect(next.removed.alpha).toBe('2026-10-04T00:00:00.000Z')
  })

  test('synced settings normalize greeting, words, and focus-hour bounds', () => {
    const next = buildSyncedSettings({
      greeting: '', weekStartsMonday: true, dateFormat: 'dmy', defaultPriority: 0,
      showEndedTasks: true, showAllRecurringTasks: false, excludeDefaultFocusStats: false,
      wordCloudIgnored: [' A ', 'a'], encouragementMessages: [], encouragementStyle: 'random', maxFocusHours: 99, keepScreenAwakeDuringFocus: true,
      weatherOptions: DEFAULT_WEATHER_OPTIONS, thermalOptions: DEFAULT_THERMAL_OPTIONS, emotionOptions: DEFAULT_EMOTION_OPTIONS,
    }, { added: { a: 'x' }, removed: {} }, '2026-10-04T00:00:00.000Z')
    expect(next.greeting).toBe('Hello, Zing')
    expect(next.wordCloudIgnored).toEqual(['a'])
    expect(next.maxFocusHours).toBe(12)
    expect(next.keepScreenAwakeDuringFocus).toBe(true)
    expect(next.emotionOptions).toHaveLength(DEFAULT_EMOTION_OPTIONS.length)
  })

  test('updatedAt alone never makes otherwise-identical settings look changed', () => {
    const base = buildSyncedSettings({
      greeting: 'Hi', weekStartsMonday: false, dateFormat: 'mdy', defaultPriority: 2,
      showEndedTasks: false, showAllRecurringTasks: true, excludeDefaultFocusStats: true,
      wordCloudIgnored: [], encouragementMessages: [], encouragementStyle: 'light', maxFocusHours: 4, keepScreenAwakeDuringFocus: false,
      weatherOptions: DEFAULT_WEATHER_OPTIONS, thermalOptions: DEFAULT_THERMAL_OPTIONS, emotionOptions: DEFAULT_EMOTION_OPTIONS,
    }, { added: {}, removed: {} }, '2026-10-01T00:00:00.000Z')
    expect(settingsEqualIgnoringUpdatedAt(base, { ...base, updatedAt: '2026-10-04T00:00:00.000Z' })).toBe(true)
  })

  test('incoming settings heal optional values and environment option definitions', () => {
    const incoming = normalizedIncomingSettings({
      id: 'settings', updatedAt: 'x', greeting: '', weekStart: 'monday', dateFormat: 'dmy', defaultPriority: 1,
      showEndedTasks: true, showAllRecurringTasks: true, excludeDefaultFocusStats: false, wordCloudIgnored: [' X '],
      maxFocusHours: 1, weatherOptions: [], thermalOptions: [],
    })
    expect(incoming.greeting).toBe('Hello, Zing')
    expect(incoming.wordCloudIgnored).toEqual(['x'])
    expect(incoming.maxFocusHours).toBe(2)
    expect(incoming.keepScreenAwakeDuringFocus).toBe(false)
    expect(incoming.weatherOptions.length).toBeGreaterThan(0)
    expect(incoming.thermalOptions.length).toBeGreaterThan(0)
  })
})
