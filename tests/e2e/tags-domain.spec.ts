import { expect, test } from '@playwright/test'
import type { Tag } from '../../src/types'
import {
  cleanupJournalTagIdsAfterDelete,
  cleanupTaskTagIdsAfterDelete,
  focusSelectableTags,
  managedTagRows,
  normalizedTagName,
  singleOrdinaryTagIds,
  sortTagsByColor,
  tagDateFromKey,
  tagNameTaken,
  tagScopeLabel,
  tagsFor,
  toggleJournalTagIds,
  toggleTaskTagIds,
} from '../../src/domain/tags'
import {
  DEFAULT_TAG_ID,
  DIDA_APP_SOURCE_TAG_ID,
  TAG_COLORS,
} from '../../src/domain/preferences'

const makeTag = (patch: Partial<Tag> & Pick<Tag, 'id' | 'name'>): Tag => ({
  color: TAG_COLORS[0],
  scope: 'both',
  updatedAt: '2026-10-04T00:00:00.000Z',
  ...patch,
})

test.describe('tags domain regression', () => {
  test('task tags keep exactly one ordinary tag while preserving import-source provenance', () => {
    expect(singleOrdinaryTagIds(['work', 'other', DIDA_APP_SOURCE_TAG_ID])).toEqual(['work', DIDA_APP_SOURCE_TAG_ID])
    expect(singleOrdinaryTagIds([DIDA_APP_SOURCE_TAG_ID])).toEqual([DEFAULT_TAG_ID, DIDA_APP_SOURCE_TAG_ID])
    expect(toggleTaskTagIds([DEFAULT_TAG_ID, DIDA_APP_SOURCE_TAG_ID], 'work')).toEqual(['work', DIDA_APP_SOURCE_TAG_ID])
    expect(toggleTaskTagIds(['work', DIDA_APP_SOURCE_TAG_ID], 'work')).toEqual([DEFAULT_TAG_ID, DIDA_APP_SOURCE_TAG_ID])
  })

  test('journal tags remain multi-select and fall back to default when the last ordinary tag is removed', () => {
    expect(toggleJournalTagIds([DEFAULT_TAG_ID], 'life')).toEqual(['life'])
    expect(toggleJournalTagIds(['life'], 'study')).toEqual(['life', 'study'])
    expect(toggleJournalTagIds(['life'], 'life')).toEqual([DEFAULT_TAG_ID])
    expect(toggleJournalTagIds(['life', DIDA_APP_SOURCE_TAG_ID], DEFAULT_TAG_ID)).toEqual([DEFAULT_TAG_ID, DIDA_APP_SOURCE_TAG_ID])
  })

  test('deleting a tag preserves source tags and applies task versus journal fallback semantics', () => {
    expect(cleanupTaskTagIdsAfterDelete(['work', 'life', DIDA_APP_SOURCE_TAG_ID], 'work')).toEqual(['life', DIDA_APP_SOURCE_TAG_ID])
    expect(cleanupTaskTagIdsAfterDelete(['work', DIDA_APP_SOURCE_TAG_ID], 'work')).toEqual([DEFAULT_TAG_ID, DIDA_APP_SOURCE_TAG_ID])
    expect(cleanupJournalTagIdsAfterDelete(['work', 'life', DIDA_APP_SOURCE_TAG_ID], 'work')).toEqual(['life', DIDA_APP_SOURCE_TAG_ID])
  })

  test('tag naming remains case-insensitive and scope labels stay stable', () => {
    const tags = [makeTag({ id: 'a', name: 'English' }), makeTag({ id: 'b', name: '科研', scope: 'task' })]
    expect(normalizedTagName('  ENGLISH ')).toBe('english')
    expect(tagNameTaken(tags, 'english')).toBe(true)
    expect(tagNameTaken(tags, 'english', 'a')).toBe(false)
    expect(tagScopeLabel('both')).toBe('共享标签')
    expect(tagScopeLabel('task')).toBe('任务标签')
    expect(tagScopeLabel('journal')).toBe('记录标签')
  })

  test('visible and focus-selectable tags exclude archived and import-source tags while respecting scope', () => {
    const tags = [
      makeTag({ id: DEFAULT_TAG_ID, name: '默认', system: true, systemKind: 'default' }),
      makeTag({ id: 'task', name: '任务', scope: 'task', color: TAG_COLORS[1] }),
      makeTag({ id: 'journal', name: '记录', scope: 'journal', color: TAG_COLORS[2] }),
      makeTag({ id: 'both', name: '共享', scope: 'both', color: TAG_COLORS[3] }),
      makeTag({ id: 'archived', name: '归档', archived: true }),
      makeTag({ id: DIDA_APP_SOURCE_TAG_ID, name: 'Dida', system: true, systemKind: 'import-source', sourceKey: 'dida-app' }),
    ]
    expect(tagsFor(tags, 'task').map(tag => tag.id)).toEqual([DEFAULT_TAG_ID, 'task', 'both'])
    expect(tagsFor(tags, 'journal').map(tag => tag.id)).toEqual([DEFAULT_TAG_ID, 'journal', 'both'])
    expect(focusSelectableTags(tags).map(tag => tag.id)).toEqual([DEFAULT_TAG_ID, 'task', 'both'])
  })

  test('tag ordering keeps default first, palette order stable, and managed rows exclude system/import tags', () => {
    const tags = [
      makeTag({ id: 'custom', name: 'Custom', color: '#abcdef', sortOrder: 4 }),
      makeTag({ id: 'second', name: 'Second', color: TAG_COLORS[1], sortOrder: 2 }),
      makeTag({ id: DEFAULT_TAG_ID, name: '默认', color: TAG_COLORS[4], system: true, systemKind: 'default' }),
      makeTag({ id: 'first', name: 'First', color: TAG_COLORS[0], sortOrder: 3 }),
      makeTag({ id: DIDA_APP_SOURCE_TAG_ID, name: 'Dida', system: true, systemKind: 'import-source', sourceKey: 'dida-app' }),
    ]
    expect(sortTagsByColor(tags, tags).map(tag => tag.id)[0]).toBe(DEFAULT_TAG_ID)
    expect(managedTagRows(tags).map(tag => tag.id)).toEqual(['first', 'second', 'custom'])
  })

  test('tag date parsing preserves local calendar dates and rejects incomplete keys', () => {
    const date = tagDateFromKey('2026-10-04')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(9)
    expect(date?.getDate()).toBe(4)
    expect(tagDateFromKey('2026-10')).toBeNull()
  })
})
