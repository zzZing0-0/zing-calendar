import type * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SearchFilter, SearchResult } from '../../domain/search'
import { buildSearchResults, matchingTagSuggestions, normalizeSearchQuery, parseTagSearch } from '../../domain/search'
import type { Anniversary, JournalEntry, Note, Tag, Task } from '../../types'
import type { Habit } from '../habits/habitDomain'
interface Dependencies {
  today: Date
  activeAnniversaries: Anniversary[]
  activeJournalEntries: JournalEntry[]
  activeTasks: Task[]
  formatUiDate: (date: Date) => string
  habits: Habit[]
  managedTags: Tag[]
  notes: Note[]
  tagUsage: Map<string, { tasks: number; journals: number; days: number; }>
}

export function useGlobalSearch({ activeAnniversaries, activeJournalEntries, activeTasks, formatUiDate, habits, managedTags, notes, tagUsage, today }: Dependencies) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)

  const normalizedSearch = normalizeSearchQuery(searchQuery)

  const highlightSearch = (text: string) => {
    if (!normalizedSearch) return text
    const lower = text.toLocaleLowerCase()
    const nodes: React.ReactNode[] = []
    let cursor = 0
    let index = lower.indexOf(normalizedSearch)
    let key = 0
    while (index >= 0) {
      if (index > cursor) nodes.push(text.slice(cursor, index))
      nodes.push(<mark key={key++}>{text.slice(index, index + normalizedSearch.length)}</mark>)
      cursor = index + normalizedSearch.length
      index = lower.indexOf(normalizedSearch, cursor)
    }
    if (cursor < text.length) nodes.push(text.slice(cursor))
    return nodes
  }

  const { tagSearchMode, tagSearchTerm, keyword: tagKeyword } = parseTagSearch(normalizedSearch)
  const tagSuggestions = useMemo(() => matchingTagSuggestions(searchQuery, managedTags), [searchQuery, managedTags])
  const selectedSearchTag = tagSearchMode ? managedTags.find(tag => tag.name.toLocaleLowerCase() === tagSearchTerm) : undefined

  const searchResults = useMemo<SearchResult[]>(() => buildSearchResults({
    normalizedSearch,
    searchFilter,
    activeTasks,
    activeJournalEntries,
    activeAnniversaries,
    activeNotes: notes.filter(note=>!note.trashedAt),
    activeHabits: habits.filter(h=>!h.deletedAt),
    managedTags,
    tagUsage,
    today,
  }), [normalizedSearch, searchFilter, activeTasks, activeJournalEntries, activeAnniversaries, notes, habits, managedTags, tagUsage])

  const searchDateLabel = (result: SearchResult) => {
    if (result.kind === 'anniversary') {
      const anniversary = result.item
      const ownDate = anniversary.calendar === 'lunar'
        ? `农历 ${anniversary.isLeapMonth ? '闰' : ''}${anniversary.month}月${anniversary.day}日`
        : `${anniversary.month}月${anniversary.day}日`
      return result.nextOccurrence ? `${ownDate} · 下次 ${formatUiDate(result.nextOccurrence)}` : ownDate
    }
    const [year, month, day] = result.date.split('-').map(Number)
    const label = year && month && day ? formatUiDate(new Date(year, month - 1, day)) : result.date
    if (result.kind === 'journal') return result.item.time ? `${label} · ${result.item.time}` : label
    return label
  }

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
        setMobileSearchVisible(false)
      }
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setMobileSearchVisible(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return { highlightSearch, mobileSearchVisible, normalizedSearch, searchDateLabel, searchFilter, searchOpen, searchQuery, searchResults, searchWrapRef, selectedSearchTag, setMobileSearchVisible, setSearchFilter, setSearchOpen, setSearchQuery, tagKeyword, tagSearchMode, tagSuggestions }
}
