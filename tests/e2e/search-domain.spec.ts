import { expect, test } from '@playwright/test'
import type { Anniversary, JournalEntry, Tag, Task } from '../../src/types'
import { buildSearchResults, normalizeSearchQuery, parseTagSearch, searchSnippet } from '../../src/domain/search'

function task(patch: Partial<Task> = {}): Task {
  return {
    id: 'task:test', title: 'Read paper', date: '2026-10-04', priority: 2, status: 'todo', allDay: true,
    createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z', ...patch,
  }
}

function journal(patch: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'journal:test', date: '2026-10-03', title: 'Lab note', content: 'Measured the vestibule volume today.', impact: 1,
    createdAt: '2026-10-03T00:00:00.000Z', updatedAt: '2026-10-03T00:00:00.000Z', ...patch,
  }
}

function anniversary(patch: Partial<Anniversary> = {}): Anniversary {
  return {
    id: 'ann:test', title: 'Launch day', type: 'anniversary', calendar: 'solar', month: 10, day: 8, repeatYearly: true,
    createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...patch,
  }
}

function tag(patch: Partial<Tag> = {}): Tag {
  return { id: 'tag:english', name: 'English', color: '#aaa', scope: 'both', updatedAt: '2026-10-04T00:00:00.000Z', ...patch }
}

const base = {
  activeTasks: [] as Task[],
  activeJournalEntries: [] as JournalEntry[],
  activeAnniversaries: [] as Anniversary[],
  managedTags: [] as Tag[],
  tagUsage: new Map<string, { tasks: number; journals: number; days: number }>(),
  today: new Date(2026, 9, 4),
}

test.describe('search domain regression', () => {
  test('query normalization trims and keeps case-insensitive matching semantics', () => {
    expect(normalizeSearchQuery('  PaPeR  ')).toBe('paper')
    expect(parseTagSearch('#  Eng ')).toEqual({ tagSearchMode: true, tagSearchTerm: 'Eng' })
    expect(parseTagSearch('eng')).toEqual({ tagSearchMode: false, tagSearchTerm: '' })
  })

  test('snippets strip lightweight markdown and keep context around the match', () => {
    const snippet = searchSnippet('**before** some words and then TARGET followed by more text', 'target')
    expect(snippet).toContain('TARGET')
    expect(snippet).not.toContain('*')
  })

  test('normal search respects entity filters and sorts matches by descending date', () => {
    const results = buildSearchResults({
      ...base,
      normalizedSearch: 'volume',
      searchFilter: 'all',
      activeTasks: [task({ title: 'Volume task', date: '2026-10-05' })],
      activeJournalEntries: [journal()],
      activeAnniversaries: [anniversary({ notes: 'volume milestone' })],
    })
    expect(results.map(row => row.kind)).toEqual(['anniversary', 'task', 'journal'])
    expect(buildSearchResults({ ...base, normalizedSearch: 'volume', searchFilter: 'journal', activeTasks: [task({ title: 'Volume task' })], activeJournalEntries: [journal()] }).map(row => row.kind)).toEqual(['journal'])
  })

  test('task and journal matching includes notes or content while preserving result payloads', () => {
    const taskResult = buildSearchResults({ ...base, normalizedSearch: 'scanner', searchFilter: 'task', activeTasks: [task({ notes: 'Scanner protocol check' })] })
    expect(taskResult[0]).toMatchObject({ kind: 'task', id: 'task:test', title: 'Read paper', date: '2026-10-04' })
    const journalResult = buildSearchResults({ ...base, normalizedSearch: 'vestibule', searchFilter: 'journal', activeJournalEntries: [journal()] })
    expect(journalResult[0]).toMatchObject({ kind: 'journal', id: 'journal:test', date: '2026-10-03' })
  })

  test('tag mode ignores entity filter and reports stable usage summary', () => {
    const english = tag()
    const results = buildSearchResults({
      ...base,
      normalizedSearch: '#eng',
      searchFilter: 'task',
      managedTags: [english, tag({ id: 'tag:work', name: 'Work' })],
      tagUsage: new Map([[english.id, { tasks: 3, journals: 2, days: 4 }]]),
    })
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ kind: 'tag', title: '#English', snippet: '任务 3 · 记录 2 · 4天' })
  })

  test('anniversary search keeps the next occurrence on or after today', () => {
    const upcoming = buildSearchResults({ ...base, normalizedSearch: 'launch', searchFilter: 'anniversary', activeAnniversaries: [anniversary()] })[0]
    expect(upcoming.kind).toBe('anniversary')
    if (upcoming.kind !== 'anniversary') throw new Error('expected anniversary result')
    expect(upcoming.date).toBe('2026-10-08')
    expect(upcoming.nextOccurrence).toEqual(new Date(2026, 9, 8))

    const passed = buildSearchResults({ ...base, normalizedSearch: 'launch', searchFilter: 'anniversary', activeAnniversaries: [anniversary({ month: 9, day: 1 })] })[0]
    expect(passed.date).toBe('2027-09-01')
  })
})
