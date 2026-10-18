import type { Habit } from '../features/habits/habitDomain'
import type { Anniversary, JournalEntry, Note, Tag, Task } from '../types'
import { anniversaryOccurrence } from './calendar'
import { toDateKey } from './task'

export type SearchFilter = 'all' | 'task' | 'journal' | 'note' | 'anniversary' | 'habit'

export type TagSearchUsage = { tasks: number; journals: number; days: number }

export type SearchResult =
  | { kind: 'task'; id: string; title: string; date: string; snippet: string; item: Task }
  | { kind: 'journal'; id: string; title: string; date: string; snippet: string; item: JournalEntry }
  | { kind: 'note'; id: string; title: string; date: string; snippet: string; item: Note }
  | { kind: 'anniversary'; id: string; title: string; date: string; snippet: string; item: Anniversary; nextOccurrence?: Date }
  | { kind: 'habit'; id: string; title: string; date: string; snippet: string; item: Habit }

export function normalizeSearchQuery(query: string) {
  return query.trim().toLocaleLowerCase()
}

export function parseTagSearch(normalizedSearch: string) {
  const tagSearchMode = normalizedSearch.startsWith('#')
  const raw = tagSearchMode ? normalizedSearch.slice(1).trim() : ''
  const [tagSearchTerm = '', ...keywords] = raw.split(/\s+/)
  return { tagSearchMode, tagSearchTerm, keyword: keywords.join(' ').trim() }
}

export function matchingTagSuggestions(query: string, tags: Tag[]): Tag[] {
  const { tagSearchMode, tagSearchTerm } = parseTagSearch(normalizeSearchQuery(query))
  if (!tagSearchMode) return []
  return tags.filter(tag => tag.name.toLocaleLowerCase().includes(tagSearchTerm)).slice(0, 12)
}


export function searchSnippet(text: string, normalizedSearch: string) {
  const clean = text.replace(/[#>*_`~\[\]()!-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const index = clean.toLocaleLowerCase().indexOf(normalizedSearch)
  if (index < 0) return clean.slice(0, 100)
  const from = Math.max(0, index - 22)
  const to = Math.min(clean.length, index + normalizedSearch.length + 34)
  return `${from > 0 ? '…' : ''}${clean.slice(from, to)}${to < clean.length ? '…' : ''}`
}

export function buildSearchResults({
  normalizedSearch,
  searchFilter,
  activeTasks,
  activeJournalEntries,
  activeAnniversaries,
  activeNotes = [],
  activeHabits = [],
  managedTags,
  today,
}: {
  normalizedSearch: string
  searchFilter: SearchFilter
  activeTasks: Task[]
  activeJournalEntries: JournalEntry[]
  activeAnniversaries: Anniversary[]
  activeNotes?: Note[]
  activeHabits?: Habit[]
  managedTags: Tag[]
  tagUsage: Map<string, TagSearchUsage>
  today: Date
}): SearchResult[] {
  if (!normalizedSearch) return []
  const { tagSearchMode, tagSearchTerm, keyword } = parseTagSearch(normalizedSearch)
  // A partial #tag is a suggestion, not a full-text search across unrelated tags.
  const selectedTag = tagSearchMode ? managedTags.find(tag => tag.name.toLocaleLowerCase() === tagSearchTerm) : undefined
  if (tagSearchMode && !selectedTag) return []
  const matches = (text: string, ids: string[] = []) =>
    (!selectedTag || ids.includes(selectedTag.id)) &&
    (!tagSearchMode ? text.toLocaleLowerCase().includes(normalizedSearch) : !keyword || text.toLocaleLowerCase().includes(keyword))
  const snippetTerm = tagSearchMode ? keyword : normalizedSearch

  const results: SearchResult[] = []
  if (searchFilter === 'all' || searchFilter === 'task') {
    activeTasks.forEach(task => {
      const hay = `${task.title} ${task.notes ?? ''}`.toLocaleLowerCase()
      if (matches(hay, task.tagIds ?? [])) {
        results.push({ kind: 'task', id: task.id, title: task.title, date: task.date ?? '', snippet: searchSnippet(task.notes ?? '', snippetTerm), item: task })
      }
    })
  }
  if (searchFilter === 'all' || searchFilter === 'journal') {
    activeJournalEntries.forEach(entry => {
      const messages = (entry.messages ?? []).map(message => message.content).join(' \n')
      const searchableText = `${entry.content} ${messages}`.trim()
      const hay = `${entry.title} ${searchableText}`.toLocaleLowerCase()
      if (matches(hay, entry.tagIds ?? [])) {
        results.push({ kind: 'journal', id: entry.id, title: entry.title, date: entry.date, snippet: searchSnippet(searchableText, snippetTerm), item: entry })
      }
    })
  }
  if (searchFilter === 'all' || searchFilter === 'note') {
    activeNotes.forEach(note => {
      const hay = `${note.title} ${note.content}`.toLocaleLowerCase()
      if (matches(hay, note.tagIds ?? [])) results.push({ kind:'note', id:note.id, title:note.title, date:note.updatedAt, snippet:searchSnippet(note.content,snippetTerm), item:note })
    })
  }
  if (searchFilter === 'all' || searchFilter === 'habit') {
    activeHabits.forEach(habit => {
      if (matches(habit.name, habit.tagId ? [habit.tagId] : [])) results.push({kind:'habit',id:habit.id,title:habit.name,date:habit.updatedAt.slice(0,10),snippet:'习惯',item:habit})
    })
  }
  if (searchFilter === 'all' || searchFilter === 'anniversary') {
    activeAnniversaries.forEach(anniversary => {
      const hay = `${anniversary.title} ${anniversary.notes ?? ''}`.toLocaleLowerCase()
      if (tagSearchMode || !matches(hay)) return
      const candidateYear = Math.max(today.getFullYear(), anniversary.year ?? today.getFullYear())
      let occurrence = anniversaryOccurrence(anniversary, candidateYear)
      if (!occurrence || occurrence < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        occurrence = anniversaryOccurrence(anniversary, candidateYear + 1)
      }
      const sortDate = occurrence
        ? toDateKey(occurrence)
        : anniversary.year
          ? `${anniversary.year}-${String(anniversary.month).padStart(2, '0')}-${String(anniversary.day).padStart(2, '0')}`
          : ''
      results.push({
        kind: 'anniversary',
        id: anniversary.id,
        title: anniversary.title,
        date: sortDate,
        snippet: searchSnippet(anniversary.notes ?? '', snippetTerm),
        item: anniversary,
        nextOccurrence: occurrence ?? undefined,
      })
    })
  }
  return results.sort((a, b) => b.date.localeCompare(a.date))
}
