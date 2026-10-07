import { expect, test } from '@playwright/test'
import { buildStatistics } from '../../src/domain/statistics'
import { DEFAULT_TAG, DEFAULT_TAG_ID, TAG_COLORS } from '../../src/domain/preferences'
import type { FocusSession, JournalEntry, Tag, Task } from '../../src/types'

const now = '2026-10-04T12:00:00.000Z'
const english: Tag = { id: 'english', name: '英语', color: TAG_COLORS[0], scope: 'both', updatedAt: now }

const task = (patch: Partial<Task> & Pick<Task, 'id' | 'title' | 'date'>): Task => ({
  priority: 1,
  status: 'todo',
  allDay: true,
  createdAt: now,
  updatedAt: now,
  tagIds: [DEFAULT_TAG_ID],
  ...patch,
})

const journal = (patch: Partial<JournalEntry> & Pick<JournalEntry, 'id' | 'date'>): JournalEntry => ({
  title: '',
  content: '',
  impact: 0,
  createdAt: now,
  updatedAt: now,
  tagIds: [DEFAULT_TAG_ID],
  ...patch,
})

const focus = (patch: Partial<FocusSession> & Pick<FocusSession, 'id' | 'startedAt'>): FocusSession => ({
  tagIds: [DEFAULT_TAG_ID],
  mode: 'stopwatch',
  endedAt: '2026-10-04T10:10:00.000Z',
  createdAt: now,
  updatedAt: now,
  ...patch,
})

function stats(overrides: Partial<Parameters<typeof buildStatistics>[0]> = {}) {
  return buildStatistics({
    today: new Date(2026, 9, 4),
    statsRange: 'week',
    weekStartsMonday: true,
    activeTasks: [],
    activeJournalEntries: [],
    dailyMoods: [],
    dailyEnergy: [],
    managedTags: [english],
    tags: [DEFAULT_TAG, english],
    focusSessions: [],
    wordCloudIgnored: [],
    timerNow: new Date(now).getTime(),
    excludeDefaultFocusStats: false,
    ...overrides,
  })
}

test.describe('statistics domain regression', () => {
  test('range boundaries preserve Monday and Sunday week-start semantics', () => {
    expect(stats().rangeStart).toBe('2026-09-28')
    expect(stats({ weekStartsMonday: false }).rangeStart).toBe('2026-10-04')
    expect(stats({ statsRange: 'month' }).rangeStart).toBe('2026-10-01')
    expect(stats({ statsRange: '30d' }).rangeStart).toBe('2026-09-05')
  })

  test('completion trend is grouped by actual completedAt date rather than planned date', () => {
    const result = stats({
      activeTasks: [task({ id: 'old', title: 'Old task', date: '2026-09-01', status: 'completed', completedAt: '2026-10-03T09:00:00.000Z' })],
    })
    expect(result.eligibleTasks).toHaveLength(0)
    expect(result.completionTrend).toEqual([{ key: '2026-10-03', count: 1, label: '10/3' }])
  })

  test('undated Inbox tasks stay outside schedule-based task statistics', () => {
    const result = stats({
      activeTasks: [task({ id: 'inbox', title: 'Build notebook', date: null, tagIds: ['english'] })],
    })
    expect(result.eligibleTasks).toEqual([])
    expect(result.tagTaskTimelines).toEqual([])
  })

  test('trashed free focus contributes neither time nor tag statistics', () => {
    const result = stats({
      focusSessions: [
        focus({ id: 'live', startedAt: '2026-10-04T10:00:00.000Z', endedAt: '2026-10-04T10:10:00.000Z', tagIds: ['english'] }),
        focus({ id: 'trash', startedAt: '2026-10-04T11:00:00.000Z', endedAt: '2026-10-04T11:30:00.000Z', tagIds: ['english'], trashedAt: '2026-10-04T11:40:00.000Z' }),
      ],
    })
    expect(result.focusSeconds).toBe(10 * 60)
    expect(result.focusTagRows.map(row => [row.tag.id, row.seconds, row.sessions])).toEqual([['english', 10 * 60, 1]])
  })

  test('excluding default focus removes default-tag task and direct-focus time only', () => {
    const result = stats({
      excludeDefaultFocusStats: true,
      activeTasks: [
        task({ id: 'default', title: 'Default', date: '2026-10-04', actualDurationMinutes: 30 }),
        task({ id: 'english', title: 'English', date: '2026-10-04', actualDurationMinutes: 20, tagIds: ['english'] }),
      ],
      focusSessions: [
        focus({ id: 'default-focus', startedAt: '2026-10-04T10:00:00.000Z' }),
        focus({ id: 'english-focus', startedAt: '2026-10-04T11:00:00.000Z', endedAt: '2026-10-04T11:05:00.000Z', tagIds: ['english'] }),
      ],
    })
    expect(result.focusSeconds).toBe(25 * 60)
    expect(result.focusTagRows.map(row => [row.tag.id, row.seconds])).toEqual([['english', 25 * 60]])
  })

  test('journal, mood, and energy counts remain date-range scoped and keep default-tag impact separate', () => {
    const result = stats({
      activeJournalEntries: [
        journal({ id: 'default-journal', date: '2026-10-02', impact: -1 }),
        journal({ id: 'english-journal', date: '2026-10-03', impact: 2, tagIds: ['english'] }),
        journal({ id: 'old-journal', date: '2026-09-01', impact: 2 }),
      ],
      dailyMoods: [{ date: '2026-10-03', level: 5, updatedAt: now }, { date: '2026-09-01', level: 1, updatedAt: now }],
      dailyEnergy: [{ date: '2026-10-02', level: 4, updatedAt: now }],
    })
    expect(result.journals.map(row => row.id)).toEqual(['default-journal', 'english-journal'])
    expect(result.journalDays).toBe(2)
    expect(result.moodDays).toBe(1)
    expect(result.energyDays).toBe(1)
    expect(result.statusDays).toBe(2)
    expect(result.defaultTagImpactRow.journals).toBe(1)
    expect(result.defaultTagImpactRow.impacts.find(row => row.value === -1)?.count).toBe(1)
  })

  test('journal word cloud includes follow-up message content and respects ignored words', () => {
    const result = stats({
      activeJournalEntries: [
        journal({
          id: 'threaded-journal',
          date: '2026-10-04',
          title: '普通记录',
          content: '今天写下正文',
          messages: [
            { id: 'message-1', content: '后来继续学习 radiology radiology', createdAt: '2026-10-04T13:00:00.000Z' },
            { id: 'message-2', content: '再次学习 radiology', createdAt: '2026-10-04T14:00:00.000Z' },
          ],
        }),
      ],
    })
    expect(result.words.find(row => row.word === 'radiology')?.count).toBe(3)

    const ignored = stats({
      activeJournalEntries: [journal({ id: 'threaded-journal', date: '2026-10-04', messages: [{ id: 'message-1', content: 'radiology radiology', createdAt: now }] })],
      wordCloudIgnored: ['radiology'],
    })
    expect(ignored.words.some(row => row.word === 'radiology')).toBe(false)
  })

  test('task completion, overdue, abandonment, and postpone aggregates preserve existing semantics', () => {
    const result = stats({
      activeTasks: [
        task({ id: 'done', title: 'Done', date: '2026-10-01', status: 'completed', postponeHistory: [{ from: '2026-09-30', to: '2026-10-01', at: now }] }),
        task({ id: 'abandoned', title: 'Abandoned', date: '2026-10-02', status: 'abandoned' }),
        task({ id: 'overdue', title: 'Overdue', date: '2026-10-03', status: 'todo' }),
        task({ id: 'future', title: 'Future', date: '2026-10-04', endDate: '2026-10-05', status: 'todo' }),
      ],
    })
    expect(result.eligibleTasks).toHaveLength(3)
    expect(result.completed).toBe(1)
    expect(result.abandoned).toBe(1)
    expect(result.overdue).toBe(1)
    expect(result.completionRate).toBeCloseTo(1 / 3)
    expect(result.postponedTasks).toBe(1)
    expect(result.postponeEvents).toBe(1)
  })
})
