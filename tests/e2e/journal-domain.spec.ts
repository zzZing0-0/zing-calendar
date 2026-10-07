import { expect, test } from '@playwright/test'
import { activeJournalEntries, appendJournalMessage, emptyJournalDraft, energyMap, journalEntriesForDate, mergeJournalMessages, moodMap, normalizeJournalMessages, toggleDailyEnergy, toggleDailyMood } from '../../src/domain/journal'
import type { DailyEnergy, DailyMood, JournalEntry } from '../../src/types'

test.describe('journal / mood / energy domain regression', () => {
  test('new journal drafts keep the calendar date while system timestamps stay outside the editable draft', () => {
    const draft = emptyJournalDraft(new Date(2026, 9, 4, 15, 6))
    expect(draft.date).toBe('2026-10-04')
    expect('time' in draft).toBe(false)
    expect('hasTime' in draft).toBe(false)
    expect(draft.emotionIds).toEqual([])
    expect(draft.impact).toBe(0)
    expect(draft.tagIds).toEqual(['default'])
    expect(draft.attachments).toEqual([])
  })

  test('selecting the same mood twice removes it, while selecting a different mood replaces it', () => {
    const at = '2026-10-04T07:00:00.000Z'
    const first = toggleDailyMood([], '2026-10-04', 4, at)
    expect(first).toEqual([{ date: '2026-10-04', level: 4, updatedAt: at }])
    expect(toggleDailyMood(first, '2026-10-04', 4, at)).toEqual([])
    expect(toggleDailyMood(first, '2026-10-04', 2, at)[0].level).toBe(2)
  })

  test('energy uses the same toggle semantics without disturbing other dates', () => {
    const rows: DailyEnergy[] = [{ date: '2026-10-03', level: 5, updatedAt: 'old' }]
    const next = toggleDailyEnergy(rows, '2026-10-04', 3, 'new')
    expect(next).toHaveLength(2)
    expect(next.find(row => row.date === '2026-10-03')?.level).toBe(5)
    expect(toggleDailyEnergy(next, '2026-10-04', 3, 'later')).toEqual(rows)
  })

  test('active journal filtering excludes trash and date selection uses immutable creation time, not legacy manual time', () => {
    const base = { content: '', impact: 0 as const, tagIds: ['default'], attachments: [], updatedAt: '2026-10-04T00:00:00Z' }
    const rows: JournalEntry[] = [
      { ...base, id: 'untimed', date: '2026-10-04', title: 'untimed', createdAt: '2026-10-04T01:00:00Z' },
      { ...base, id: 'late', date: '2026-10-04', time: '20:00', title: 'late', createdAt: '2026-10-04T02:00:00Z' },
      { ...base, id: 'early', date: '2026-10-04', time: '08:00', title: 'early', createdAt: '2026-10-04T03:00:00Z' },
      { ...base, id: 'trash', date: '2026-10-04', title: 'trash', createdAt: '2026-10-04T04:00:00Z', trashedAt: '2026-10-04T05:00:00Z' },
      { ...base, id: 'other', date: '2026-10-05', title: 'other', createdAt: '2026-10-05T01:00:00Z' },
    ]
    expect(activeJournalEntries(rows).map(row => row.id)).not.toContain('trash')
    expect(journalEntriesForDate(rows, '2026-10-04').map(row => row.id)).toEqual(['untimed', 'late', 'early'])
  })

  test('mood and energy maps retain one row per stored date for calendar lookup', () => {
    const moods: DailyMood[] = [{ date: '2026-10-04', level: 5, updatedAt: 'm' }]
    const energies: DailyEnergy[] = [{ date: '2026-10-04', level: 2, updatedAt: 'e' }]
    expect(moodMap(moods).get('2026-10-04')?.level).toBe(5)
    expect(energyMap(energies).get('2026-10-04')?.level).toBe(2)
  })
})


test('journal messages are append-only immutable snapshots ordered by creation time', () => {
  const first = { id:'m1', content:'我现在真的很生气', createdAt:'2026-10-06T14:03:00.000Z' }
  const second = { id:'m2', content:'她回来了，但是我突然不想说了', createdAt:'2026-10-06T14:41:00.000Z' }
  const rows = appendJournalMessage([first], second)
  expect(rows).toEqual([first, second])
  expect(rows.every(row => !('updatedAt' in row) && !('deletedAt' in row))).toBe(true)
  expect(normalizeJournalMessages([{...first,content:'  我现在真的很生气  '}])).toEqual([first])
})

test('concurrent journal message streams merge by id without losing either device append', () => {
  const a = { id:'a', content:'A设备的一句', createdAt:'2026-10-06T14:03:00.000Z' }
  const b = { id:'b', content:'B设备的一句', createdAt:'2026-10-06T14:03:00.000Z' }
  expect(mergeJournalMessages([b], [a]).map(row=>row.id)).toEqual(['a','b'])
})
