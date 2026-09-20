import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { loadDailyMoods, loadJournalEntries, loadTasks, loadTags, saveDailyMoods, saveJournalEntries, saveTags, saveTasks } from './db/calendar'
import './App.css'

type TaskPriority = 0 | 1 | 2 | 3
type TaskStatus = 'todo' | 'completed' | 'abandoned'
type RecurrenceUnit = 'day' | 'week' | 'month' | 'year'
type RecurrenceEnd = { type: 'date'; date: string } | { type: 'count'; count: number }
type RecurrenceRule = { unit: RecurrenceUnit; interval: number; weekdays?: number[]; end?: RecurrenceEnd }
type RecurrenceException = { deleted?: boolean; status?: TaskStatus; title?: string; date?: string; endDate?: string; priority?: TaskPriority; allDay?: boolean; time?: string; deadline?: string; notes?: string; tagIds?: string[]; updatedAt: string }

type CalendarDay = {
  date: Date
  inCurrentMonth: boolean
}

type Task = {
  id: string
  title: string
  date: string
  endDate?: string
  priority: TaskPriority
  status: TaskStatus
  allDay: boolean
  time?: string
  deadline?: string
  notes?: string
  createdAt: string
  updatedAt: string
  tagIds?: string[]
  recurrence?: RecurrenceRule
  recurrenceExceptions?: Record<string, RecurrenceException>
  seriesId?: string
  occurrenceDate?: string
}

type MoodLevel = 1 | 2 | 3 | 4 | 5
type JournalImpact = -2 | -1 | 0 | 1 | 2

type DailyMood = {
  date: string
  level: MoodLevel
  updatedAt: string
}

type JournalEntry = {
  id: string
  date: string
  time?: string
  content: string
  impact: JournalImpact
  createdAt: string
  updatedAt: string
  tagIds?: string[]
}

type TagScope = 'task' | 'journal' | 'both'
type Tag = { id: string; name: string; color: string; scope: TagScope; system?: boolean }

type JournalDraft = {
  date: string
  hasTime: boolean
  time: string
  content: string
  impact: JournalImpact
  tagIds: string[]
}

type TaskDraft = {
  title: string
  date: string
  endDate: string
  priority: TaskPriority
  allDay: boolean
  time: string
  deadline: string
  notes: string
  tagIds: string[]
  repeatPreset: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  repeatInterval: number
  repeatUnit: RecurrenceUnit
  repeatWeekdays: number[]
  repeatEndMode: 'never' | 'date' | 'count'
  repeatEndDate: string
  repeatEndCount: number
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MOODS: { value: MoodLevel; label: string }[] = [
  { value: 1, label: '特别差' },
  { value: 2, label: '有点差' },
  { value: 3, label: '一般' },
  { value: 4, label: '还可以' },
  { value: 5, label: '很高兴' },
]
const IMPACTS: JournalImpact[] = [-2, -1, 0, 1, 2]
const DEFAULT_TAG_ID = 'default'
const DEFAULT_TAG: Tag = { id: DEFAULT_TAG_ID, name: '默认', color: '#9aa59f', scope: 'both', system: true }
const TAG_COLORS = ['#789c86', '#d3b64b', '#d88b48', '#c8665f', '#8798bd', '#9b83ad', '#789da3', '#a58d72']

function MoodFace({ level }: { level: MoodLevel }) {
  const common = { viewBox: '0 0 64 64', className: `mood-face-svg mood-face-${level}`, 'aria-hidden': true } as const

  if (level === 1) return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <path className="mood-line" d="M15.5 21.5l10 10M25.5 21.5l-10 10" />
      <path className="mood-line" d="M38.5 21.5l10 10M48.5 21.5l-10 10" />
      <path className="mood-line" d="M19 45c3-4 6 4 9 0s6-4 9 0 6 4 9 0" />
    </svg>
  )
  if (level === 2) return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <path className="mood-thin" d="M16.5 24.5c3.1-2.2 6.6-2.2 9.7 0M37.8 24.5c3.1-2.2 6.6-2.2 9.7 0" />
      <circle className="mood-fill" cx="21.5" cy="28.5" r="2.1" />
      <circle className="mood-fill" cx="42.5" cy="28.5" r="2.1" />
      <path className="mood-line" d="M21 45c5.7-5.6 16.3-5.6 22 0" />
    </svg>
  )
  if (level === 3) return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <circle className="mood-fill" cx="22" cy="26" r="2.4" />
      <circle className="mood-fill" cx="42" cy="26" r="2.4" />
      <path className="mood-line" d="M23 43h18" />
    </svg>
  )
  if (level === 4) return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <circle className="mood-fill" cx="21.5" cy="27" r="2.2" />
      <path className="mood-thin" d="M38 27c2.7-1.6 5.5-1.6 8.2 0" />
      <path className="mood-line" d="M20.5 39.5c5.7 4.4 15.5 5.1 23.5-.8" />
    </svg>
  )
  return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <path className="mood-line" d="M15.5 28c3-4 8-4 11 0" />
      <path className="mood-line" d="M37.5 28c3-4 8-4 11 0" />
      <path className="mood-line" d="M18.5 37c5.5 10.5 21.5 10.5 27 0" />
    </svg>
  )
}

const PRIORITIES: { value: TaskPriority; label: string; hint: string }[] = [
  { value: 0, label: 'P0', hint: '从容' },
  { value: 1, label: 'P1', hint: '普通' },
  { value: 2, label: 'P2', hint: '较高' },
  { value: 3, label: 'P3', hint: '紧急' },
]

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date: Date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function ordinalDay(day: number) {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`
  const suffix = day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th'
  return `${day}${suffix}`
}

function repeatPresetLabels(dateKey: string) {
  const date = fromDateKey(dateKey)
  const weekday = WEEKDAYS[(date.getDay() + 6) % 7]
  return {
    weekly: `每周（${weekday}）`,
    monthly: `每月（${ordinalDay(date.getDate())}）`,
    yearly: `每年（${date.getDate()} ${MONTHS[date.getMonth()]}）`,
  }
}

function buildMonth(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return { date, inCurrentMonth: date.getMonth() === month }
  })
}

function currentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function emptyJournalDraft(date: Date): JournalDraft {
  return { date: toDateKey(date), hasTime: true, time: currentTime(), content: '', impact: 0, tagIds: [DEFAULT_TAG_ID] }
}

function emptyDraft(date: Date): TaskDraft {
  return {
    title: '',
    date: toDateKey(date),
    endDate: '',
    priority: 1,
    allDay: true,
    time: '',
    deadline: '',
    notes: '',
    tagIds: [DEFAULT_TAG_ID],
    repeatPreset: 'none',
    repeatInterval: 1,
    repeatUnit: 'week',
    repeatWeekdays: [(date.getDay() + 6) % 7],
    repeatEndMode: 'never',
    repeatEndDate: '',
    repeatEndCount: 20,
  }
}


function addDaysKey(key: string, days: number) {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

function dayDiff(a: string, b: string) {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86400000)
}

function recurrenceEndFromDraft(draft: TaskDraft): RecurrenceEnd | undefined {
  if (draft.repeatEndMode === 'date' && draft.repeatEndDate) return { type: 'date', date: draft.repeatEndDate }
  if (draft.repeatEndMode === 'count') return { type: 'count', count: Math.max(1, draft.repeatEndCount || 1) }
  return undefined
}

function recurrenceFromDraft(draft: TaskDraft): RecurrenceRule | undefined {
  if (draft.repeatPreset === 'none') return undefined
  const end = recurrenceEndFromDraft(draft)
  if (draft.repeatPreset === 'daily') return { unit: 'day', interval: 1, end }
  if (draft.repeatPreset === 'weekly') return { unit: 'week', interval: 1, weekdays: [(fromDateKey(draft.date).getDay() + 6) % 7], end }
  if (draft.repeatPreset === 'monthly') return { unit: 'month', interval: 1, end }
  if (draft.repeatPreset === 'yearly') return { unit: 'year', interval: 1, end }
  return { unit: draft.repeatUnit, interval: Math.max(1, draft.repeatInterval || 1), weekdays: draft.repeatUnit === 'week' ? (draft.repeatWeekdays.length ? [...draft.repeatWeekdays].sort() : [(fromDateKey(draft.date).getDay() + 6) % 7]) : undefined, end }
}

function repeatEndDraft(rule?: RecurrenceRule): Pick<TaskDraft, 'repeatEndMode' | 'repeatEndDate' | 'repeatEndCount'> {
  if (!rule?.end) return { repeatEndMode: 'never', repeatEndDate: '', repeatEndCount: 20 }
  if (rule.end.type === 'date') return { repeatEndMode: 'date', repeatEndDate: rule.end.date, repeatEndCount: 20 }
  return { repeatEndMode: 'count', repeatEndDate: '', repeatEndCount: rule.end.count }
}

function draftRepeat(task: Task): Pick<TaskDraft, 'repeatPreset' | 'repeatInterval' | 'repeatUnit' | 'repeatWeekdays' | 'repeatEndMode' | 'repeatEndDate' | 'repeatEndCount'> {
  const rule = task.recurrence
  const ending = repeatEndDraft(rule)
  if (!rule) return { repeatPreset: 'none', repeatInterval: 1, repeatUnit: 'week', repeatWeekdays: [], ...ending }
  if (rule.interval === 1 && rule.unit === 'day') return { repeatPreset: 'daily', repeatInterval: 1, repeatUnit: 'day', repeatWeekdays: [], ...ending }
  if (rule.interval === 1 && rule.unit === 'week' && (rule.weekdays?.length ?? 0) === 1) return { repeatPreset: 'weekly', repeatInterval: 1, repeatUnit: 'week', repeatWeekdays: rule.weekdays ?? [], ...ending }
  if (rule.interval === 1 && rule.unit === 'month') return { repeatPreset: 'monthly', repeatInterval: 1, repeatUnit: 'month', repeatWeekdays: [], ...ending }
  if (rule.interval === 1 && rule.unit === 'year') return { repeatPreset: 'yearly', repeatInterval: 1, repeatUnit: 'year', repeatWeekdays: [], ...ending }
  return { repeatPreset: 'custom', repeatInterval: rule.interval, repeatUnit: rule.unit, repeatWeekdays: rule.weekdays ?? [], ...ending }
}

function baseOccursOn(task: Task, key: string) {
  const rule = task.recurrence
  if (!rule || key < task.date) return key === task.date
  const anchor = fromDateKey(task.date)
  const date = fromDateKey(key)
  if (rule.unit === 'day') return dayDiff(task.date, key) % rule.interval === 0
  if (rule.unit === 'week') {
    const weeks = Math.floor(dayDiff(task.date, key) / 7)
    const weekday = (date.getDay() + 6) % 7
    return weeks % rule.interval === 0 && (rule.weekdays?.length ? rule.weekdays.includes(weekday) : weekday === (anchor.getDay() + 6) % 7)
  }
  if (rule.unit === 'month') {
    const months = (date.getFullYear() - anchor.getFullYear()) * 12 + date.getMonth() - anchor.getMonth()
    return months >= 0 && months % rule.interval === 0 && date.getDate() === anchor.getDate()
  }
  const years = date.getFullYear() - anchor.getFullYear()
  return years >= 0 && years % rule.interval === 0 && date.getMonth() === anchor.getMonth() && date.getDate() === anchor.getDate()
}

function occurrenceNumber(task: Task, key: string) {
  let count = 0
  let cursor = fromDateKey(task.date)
  const target = fromDateKey(key)
  while (cursor <= target) {
    if (baseOccursOn(task, toDateKey(cursor))) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

function occursOn(task: Task, key: string) {
  const rule = task.recurrence
  if (!baseOccursOn(task, key)) return false
  if (!rule?.end) return true
  if (rule.end.type === 'date') return key <= rule.end.date
  return occurrenceNumber(task, key) <= rule.end.count
}

function materializeOccurrence(series: Task, occurrenceDate: string): Task | null {
  const exception = series.recurrenceExceptions?.[occurrenceDate]
  if (exception?.deleted) return null
  const duration = dayDiff(series.date, taskEndDate(series))
  const base: Task = {
    ...series,
    id: `${series.id}::${occurrenceDate}`,
    seriesId: series.id,
    occurrenceDate,
    date: occurrenceDate,
    endDate: duration > 0 ? addDaysKey(occurrenceDate, duration) : undefined,
  }
  return exception ? { ...base, ...exception, id: base.id, seriesId: series.id, occurrenceDate } : base
}

function expandTasks(tasks: Task[], startKey: string, endKey: string) {
  const result: Task[] = []
  tasks.forEach(task => {
    if (!task.recurrence) {
      if (task.date <= endKey && taskEndDate(task) >= startKey) result.push(task)
      return
    }
    const duration = dayDiff(task.date, taskEndDate(task))
    let cursor = fromDateKey(addDaysKey(startKey, -Math.max(0, duration)))
    const end = fromDateKey(endKey)
    while (cursor <= end) {
      const key = toDateKey(cursor)
      if (occursOn(task, key)) {
        const occurrence = materializeOccurrence(task, key)
        if (occurrence && occurrence.date <= endKey && taskEndDate(occurrence) >= startKey) result.push(occurrence)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  })
  return result
}


function taskSort(a: Task, b: Task) {
  const statusRank = (task: Task) => task.status === 'todo' ? 0 : task.status === 'completed' ? 1 : 2
  const statusDifference = statusRank(a) - statusRank(b)
  if (statusDifference !== 0) return statusDifference

  if (a.status === 'todo' && b.status === 'todo') {
    const aHasTime = !a.allDay && Boolean(a.time)
    const bHasTime = !b.allDay && Boolean(b.time)
    if (aHasTime !== bHasTime) return aHasTime ? -1 : 1
    if (aHasTime && bHasTime && a.time !== b.time) return (a.time ?? '').localeCompare(b.time ?? '')
    if (!aHasTime && !bHasTime && a.priority !== b.priority) return b.priority - a.priority
  }

  return a.createdAt.localeCompare(b.createdAt)
}

function formatTaskRange(task: Task) {
  const start = fromDateKey(task.date)
  const end = fromDateKey(taskEndDate(task))
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[start.getMonth()]}`
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`
}

function deadlineStage(task: Task, now = new Date()) {
  if (!task.deadline || task.status !== 'todo') return 'deadline-normal'
  const created = new Date(task.createdAt)
  const deadline = fromDateKey(task.deadline)
  deadline.setHours(23, 59, 59, 999)

  if (now > deadline) return 'deadline-overdue'
  const total = deadline.getTime() - created.getTime()
  if (total <= 0) return 'deadline-overdue'
  const progress = (now.getTime() - created.getTime()) / total
  if (progress >= 0.75) return 'deadline-red'
  if (progress >= 0.5) return 'deadline-yellow'
  return 'deadline-normal'
}

function taskEndDate(task: Task) { return task.endDate || task.date }
function taskCoversDate(task: Task, key: string) { return task.date <= key && taskEndDate(task) >= key }
function isMultiDayTask(task: Task) { return taskEndDate(task) > task.date }

type MultiDaySegment = { task: Task; week: number; startColumn: number; span: number; lane: number }

function buildMultiDaySegments(tasks: Task[], days: CalendarDay[]): MultiDaySegment[] {
  const segments: MultiDaySegment[] = []
  for (let week = 0; week < 6; week += 1) {
    const weekDays = days.slice(week * 7, week * 7 + 7)
    const weekStart = toDateKey(weekDays[0].date)
    const weekEnd = toDateKey(weekDays[6].date)
    const candidates = tasks.filter(task => isMultiDayTask(task) && task.date <= weekEnd && taskEndDate(task) >= weekStart)
      .sort((a, b) => a.date.localeCompare(b.date) || taskEndDate(b).localeCompare(taskEndDate(a)) || b.priority - a.priority)
    const lanes: { start: number; end: number }[][] = []
    candidates.forEach(task => {
      const clippedStart = task.date < weekStart ? weekStart : task.date
      const clippedEnd = taskEndDate(task) > weekEnd ? weekEnd : taskEndDate(task)
      const startColumn = weekDays.findIndex(day => toDateKey(day.date) === clippedStart)
      const endColumn = weekDays.findIndex(day => toDateKey(day.date) === clippedEnd)
      let lane = 0
      while ((lanes[lane] ?? []).some(item => !(endColumn < item.start || startColumn > item.end))) lane += 1
      if (!lanes[lane]) lanes[lane] = []
      lanes[lane].push({ start: startColumn, end: endColumn })
      segments.push({ task, week, startColumn, span: endColumn - startColumn + 1, lane })
    })
  }
  return segments
}

function App() {
  const today = new Date()
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [moodMonth, setMoodMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksHydrated, setTasksHydrated] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<string | null>(null)
  const [draft, setDraft] = useState<TaskDraft>(() => emptyDraft(today))
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [dailyMoods, setDailyMoods] = useState<DailyMood[]>([])
  const [journalHydrated, setJournalHydrated] = useState(false)
  const [moodsHydrated, setMoodsHydrated] = useState(false)
  const [journalEditorOpen, setJournalEditorOpen] = useState(false)
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null)
  const [journalDraft, setJournalDraft] = useState<JournalDraft>(() => emptyJournalDraft(today))
  const [tags, setTags] = useState<Tag[]>([DEFAULT_TAG])
  const [tagsHydrated, setTagsHydrated] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [newTagScope, setNewTagScope] = useState<TagScope>('both')
  const [openTagColorId, setOpenTagColorId] = useState<string | null>(null)
  const [browsingTagId, setBrowsingTagId] = useState<string | null>(null)

  // Keep the mini mood calendar anchored to the day currently opened in Day Detail.
  // It can still be browsed independently afterwards with its own month arrows.
  useEffect(() => {
    if (!selectedDate) return
    setMoodMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [selectedDate])

  useEffect(() => {
    let active = true
    loadTasks<Task>().then(storedTasks => {
      if (!active) return
      setTasks(storedTasks.map(task => ({ ...task, endDate: task.endDate || undefined })))
      setTasksHydrated(true)
    }).catch(error => {
      console.error('Failed to load tasks from IndexedDB', error)
      if (active) setTasksHydrated(true)
    })
    return () => { active = false }
  }, [])

  const setMood = (level: MoodLevel) => {
  if (!selectedDate) return
  const date = toDateKey(selectedDate)
  setDailyMoods(current => {
    const existing = current.find(mood => mood.date === date)
    if (existing?.level === level) return current.filter(mood => mood.date !== date)
    const next: DailyMood = { date, level, updatedAt: new Date().toISOString() }
    return existing ? current.map(mood => mood.date === date ? next : mood) : [...current, next]
  })
  }

  const openJournalEditor = () => {
  const date = selectedDate ?? today
  setEditingJournalId(null)
  setJournalDraft(emptyJournalDraft(date))
  setJournalEditorOpen(true)
  }

  const editJournal = (entry: JournalEntry) => {
  setEditingJournalId(entry.id)
  setJournalDraft({ date: entry.date, hasTime: Boolean(entry.time), time: entry.time ?? currentTime(), content: entry.content, impact: entry.impact, tagIds: entry.tagIds?.length ? entry.tagIds : [DEFAULT_TAG_ID] })
  setJournalEditorOpen(true)
  }

  const closeJournalEditor = () => {
  setJournalEditorOpen(false)
  setEditingJournalId(null)
  }

  const saveJournal = () => {
  const content = journalDraft.content.trim()
  if (!content) return
  const now = new Date().toISOString()
  if (editingJournalId) {
    setJournalEntries(current => current.map(entry => entry.id === editingJournalId ? {
      ...entry, date: journalDraft.date, time: journalDraft.hasTime ? journalDraft.time || undefined : undefined,
      content, impact: journalDraft.impact, tagIds: journalDraft.tagIds.length ? journalDraft.tagIds : [DEFAULT_TAG_ID], updatedAt: now,
    } : entry))
  } else {
    setJournalEntries(current => [...current, {
      id: crypto.randomUUID(), date: journalDraft.date, time: journalDraft.hasTime ? journalDraft.time || undefined : undefined,
      content, impact: journalDraft.impact, tagIds: journalDraft.tagIds.length ? journalDraft.tagIds : [DEFAULT_TAG_ID], createdAt: now, updatedAt: now,
    }])
  }
  const entryDate = fromDateKey(journalDraft.date)
  setSelectedDate(entryDate)
  setVisibleMonth(new Date(entryDate.getFullYear(), entryDate.getMonth(), 1))
  closeJournalEditor()
  }

  const deleteJournal = (id: string) => setJournalEntries(current => current.filter(entry => entry.id !== id))

  useEffect(() => {
    if (!tasksHydrated) return
    saveTasks(tasks).catch(error => console.error('Failed to save tasks to IndexedDB', error))
  }, [tasks, tasksHydrated])

  useEffect(() => {
    let active = true
    loadJournalEntries<JournalEntry>().then(rows => {
      if (!active) return
      setJournalEntries(rows)
      setJournalHydrated(true)
    }).catch(error => {
      console.error('Failed to load journal entries from IndexedDB', error)
      if (active) setJournalHydrated(true)
    })
    loadTags<Tag>().then(rows => {
      if (!active) return
      const hasDefault = rows.some(tag => tag.id === DEFAULT_TAG_ID)
      setTags(hasDefault ? rows : [DEFAULT_TAG, ...rows])
      setTagsHydrated(true)
    }).catch(error => {
      console.error('Failed to load tags', error)
      if (active) setTagsHydrated(true)
    })
    loadDailyMoods<DailyMood>().then(rows => {
      if (!active) return
      setDailyMoods(rows)
      setMoodsHydrated(true)
    }).catch(error => {
      console.error('Failed to load daily moods from IndexedDB', error)
      if (active) setMoodsHydrated(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!journalHydrated) return
    saveJournalEntries(journalEntries).catch(error => console.error('Failed to save journal entries', error))
  }, [journalEntries, journalHydrated])

  useEffect(() => {
    if (!tagsHydrated) return
    saveTags(tags).catch(error => console.error('Failed to save tags', error))
  }, [tags, tagsHydrated])

  useEffect(() => {
    if (!moodsHydrated) return
    saveDailyMoods(dailyMoods).catch(error => console.error('Failed to save daily moods', error))
  }, [dailyMoods, moodsHydrated])

  const days = useMemo(
    () => buildMonth(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  )

  const displayTasks = useMemo(() => {
    const start = toDateKey(days[0].date)
    const end = toDateKey(days[days.length - 1].date)
    return expandTasks(tasks, start, end)
  }, [tasks, days])

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return []
    const key = toDateKey(selectedDate)
    const pool = key >= toDateKey(days[0].date) && key <= toDateKey(days[days.length - 1].date) ? displayTasks : expandTasks(tasks, key, key)
    return pool.filter(task => taskCoversDate(task, key)).sort(taskSort)
  }, [selectedDate, tasks, displayTasks, days])

  const selectedJournalEntries = useMemo(() => {
    if (!selectedDate) return []
    const key = toDateKey(selectedDate)
    return journalEntries.filter(entry => entry.date === key).sort((a, b) => {
      if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time)
      if (a.time !== b.time) return a.time ? -1 : 1
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [selectedDate, journalEntries])

  const selectedMood = selectedDate ? dailyMoods.find(mood => mood.date === toDateKey(selectedDate)) : undefined
  const selectedImpactTotal = selectedJournalEntries.reduce((sum, entry) => sum + entry.impact, 0)
  const moodsByDate = useMemo(() => new Map(dailyMoods.map(mood => [mood.date, mood])), [dailyMoods])
  const moodDays = useMemo(() => buildMonth(moodMonth.getFullYear(), moodMonth.getMonth()), [moodMonth])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    displayTasks.filter(task => !isMultiDayTask(task)).forEach(task => {
      const current = map.get(task.date) ?? []
      current.push(task)
      current.sort(taskSort)
      map.set(task.date, current)
    })
    return map
  }, [displayTasks])

  const multiDaySegments = useMemo(() => buildMultiDaySegments(displayTasks, days), [displayTasks, days])
  // Reserve multi-day lanes per *day*, not per whole week. A short range such as
  // 18–19 must not leave a ghost empty slot on the 20th.
  const multiDayLaneCountsByDay = useMemo(() => days.map(({ date }) => {
    const key = toDateKey(date)
    // Reserve space only for multi-day tasks that actually cover this date.
    // This deliberately ignores a lane used on a neighbouring date, so a
    // short 18–19 range can never create a ghost blank row on the 20th.
    return displayTasks.filter(task => isMultiDayTask(task) && taskCoversDate(task, key)).length
  }), [days, displayTasks])

  const moveMonth = (offset: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const goToday = () => {
    const now = new Date()
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  const openDay = (date: Date) => {
    setSelectedDate(date)
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const openTaskEditor = () => {
    const date = selectedDate ?? today
    setEditingTaskId(null)
    setEditingOccurrenceDate(null)
    setDraft(emptyDraft(date))
    setEditorOpen(true)
  }

  const editTask = (task: Task) => {
    const series = task.seriesId ? tasks.find(item => item.id === task.seriesId) : task
    if (!series) return
    setEditingTaskId(series.id)
    setEditingOccurrenceDate(task.seriesId ? task.occurrenceDate ?? task.date : null)
    setDraft({
      title: task.title,
      date: task.date,
      endDate: task.endDate ?? '',
      priority: task.priority,
      allDay: task.allDay,
      time: task.time ?? '',
      deadline: task.deadline ?? '',
      notes: task.notes ?? '',
      tagIds: task.tagIds?.length ? task.tagIds : [DEFAULT_TAG_ID],
      ...draftRepeat(series),
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingTaskId(null)
    setEditingOccurrenceDate(null)
  }

  const saveTask = (scope: 'occurrence' | 'series' = 'series') => {
    const title = draft.title.trim()
    if (!title) return
    const now = new Date().toISOString()

    if (editingTaskId) {
      setTasks(current => current.map(task => {
        if (task.id !== editingTaskId) return task
        if (editingOccurrenceDate && task.recurrence && scope === 'occurrence') {
          const exception: RecurrenceException = {
            title, date: draft.date,
            endDate: draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined,
            priority: draft.priority, allDay: draft.allDay,
            time: draft.allDay ? undefined : draft.time || undefined,
            deadline: draft.deadline || undefined, notes: draft.notes.trim() || undefined,
            tagIds: draft.tagIds.length ? draft.tagIds : [DEFAULT_TAG_ID], updatedAt: now,
          }
          return { ...task, recurrenceExceptions: { ...task.recurrenceExceptions, [editingOccurrenceDate]: exception }, updatedAt: now }
        }
        // Opening an occurrence edits that occurrence's materialized date in the form.
        // Saving the whole series must NOT silently re-anchor the series to the
        // clicked occurrence. Preserve the original series anchor unless the user
        // actually changed the date (or end date) in the editor.
        const openedOccurrence = editingOccurrenceDate ? materializeOccurrence(task, editingOccurrenceDate) : null
        const seriesDate = openedOccurrence && draft.date === openedOccurrence.date ? task.date : draft.date
        const seriesEndDate = openedOccurrence && (draft.endDate || '') === (openedOccurrence.endDate || '')
          ? task.endDate
          : (draft.endDate && draft.endDate > seriesDate ? draft.endDate : undefined)
        const seriesDraft: TaskDraft = { ...draft, date: seriesDate, endDate: seriesEndDate ?? '' }

        return {
          ...task, title, date: seriesDate,
          endDate: seriesEndDate,
          priority: draft.priority, allDay: draft.allDay,
          time: draft.allDay ? undefined : draft.time || undefined,
          deadline: draft.deadline || undefined, notes: draft.notes.trim() || undefined,
          tagIds: draft.tagIds.length ? draft.tagIds : [DEFAULT_TAG_ID],
          recurrence: recurrenceFromDraft(seriesDraft), updatedAt: now,
        }
      }))
    } else {
      const task: Task = {
        id: crypto.randomUUID(), title, date: draft.date,
        endDate: draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined,
        priority: draft.priority, status: 'todo', allDay: draft.allDay,
        time: draft.allDay ? undefined : draft.time || undefined,
        deadline: draft.deadline || undefined, notes: draft.notes.trim() || undefined,
        tagIds: draft.tagIds.length ? draft.tagIds : [DEFAULT_TAG_ID],
        recurrence: recurrenceFromDraft(draft), createdAt: now, updatedAt: now,
      }
      setTasks(current => [...current, task])
    }

    const savedSeries = editingTaskId ? tasks.find(task => task.id === editingTaskId) : undefined
    const openedOccurrence = savedSeries && editingOccurrenceDate ? materializeOccurrence(savedSeries, editingOccurrenceDate) : null
    const savedDateKey = scope === 'series' && savedSeries && openedOccurrence && draft.date === openedOccurrence.date
      ? savedSeries.date
      : draft.date
    const taskDate = fromDateKey(savedDateKey)
    setSelectedDate(taskDate)
    setVisibleMonth(new Date(taskDate.getFullYear(), taskDate.getMonth(), 1))
    closeEditor()
  }

  const setTaskStatus = (task: Task, status: TaskStatus) => {
    const now = new Date().toISOString()
    if (task.seriesId && task.occurrenceDate) {
      setTasks(current => current.map(series => series.id === task.seriesId ? {
        ...series,
        recurrenceExceptions: { ...series.recurrenceExceptions, [task.occurrenceDate!]: { ...series.recurrenceExceptions?.[task.occurrenceDate!], status, updatedAt: now } },
        updatedAt: now,
      } : series))
    } else setTasks(current => current.map(item => item.id === task.id ? { ...item, status, updatedAt: now } : item))
  }

  const deleteTask = (task: Task, scope: 'occurrence' | 'series' = 'series') => {
    if (task.seriesId && task.occurrenceDate && scope === 'occurrence') {
      const now = new Date().toISOString()
      setTasks(current => current.map(series => series.id === task.seriesId ? {
        ...series,
        recurrenceExceptions: { ...series.recurrenceExceptions, [task.occurrenceDate!]: { ...series.recurrenceExceptions?.[task.occurrenceDate!], deleted: true, updatedAt: now } },
        updatedAt: now,
      } : series))
    } else setTasks(current => current.filter(item => item.id !== (task.seriesId ?? task.id)))
  }

  const toggleDraftTag = (kind: 'task' | 'journal', id: string) => {
    const update = (ids: string[]) => {
      const real = ids.filter(tagId => tagId !== DEFAULT_TAG_ID)
      if (id === DEFAULT_TAG_ID) return [DEFAULT_TAG_ID]
      const next = real.includes(id) ? real.filter(tagId => tagId !== id) : [...real, id]
      return next.length ? next : [DEFAULT_TAG_ID]
    }
    if (kind === 'task') setDraft(current => ({ ...current, tagIds: update(current.tagIds) }))
    else setJournalDraft(current => ({ ...current, tagIds: update(current.tagIds) }))
  }

  const addTag = () => {
    const name = newTagName.trim()
    if (!name || tags.some(tag => tag.name.toLowerCase() === name.toLowerCase())) return
    setTags(current => [...current, { id: crypto.randomUUID(), name, color: newTagColor, scope: newTagScope }])
    setNewTagName('')
  }

  const deleteTag = (id: string) => {
    if (id === DEFAULT_TAG_ID) return
    setTags(current => current.filter(tag => tag.id !== id))
    const clean = (ids?: string[]) => {
      const next = (ids ?? []).filter(tagId => tagId !== id && tagId !== DEFAULT_TAG_ID)
      return next.length ? next : [DEFAULT_TAG_ID]
    }
    setTasks(current => current.map(task => ({ ...task, tagIds: clean(task.tagIds) })))
    setJournalEntries(current => current.map(entry => ({ ...entry, tagIds: clean(entry.tagIds) })))
  }

  const tagsFor = (kind: 'task' | 'journal') => tags.filter(tag => tag.scope === 'both' || tag.scope === kind)

  const browsingTag = browsingTagId ? tags.find(tag => tag.id === browsingTagId) ?? null : null
  const taggedTasks = browsingTag ? tasks
    .filter(task => (task.tagIds?.length ? task.tagIds : [DEFAULT_TAG_ID]).includes(browsingTag.id))
    .sort((a, b) => taskEndDate(b).localeCompare(taskEndDate(a)) || b.date.localeCompare(a.date) || taskSort(a, b)) : []
  const taggedJournalEntries = browsingTag ? journalEntries
    .filter(entry => (entry.tagIds?.length ? entry.tagIds : [DEFAULT_TAG_ID]).includes(browsingTag.id))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '') || b.createdAt.localeCompare(a.createdAt)) : []

  const taggedTimeline = [
    ...taggedTasks.map(task => ({ kind: 'task' as const, date: task.date, time: !task.allDay ? task.time : undefined, createdAt: task.createdAt, task })),
    ...taggedJournalEntries.map(entry => ({ kind: 'journal' as const, date: entry.date, time: entry.time, createdAt: entry.createdAt, entry })),
  ].sort((a, b) => b.date.localeCompare(a.date) || Number(Boolean(b.time)) - Number(Boolean(a.time)) || (b.time ?? '').localeCompare(a.time ?? '') || b.createdAt.localeCompare(a.createdAt))
  const taggedTimelineGroups = taggedTimeline.reduce<Array<{ date: string; items: typeof taggedTimeline }>>((groups, item) => {
    const last = groups[groups.length - 1]
    if (last?.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
    return groups
  }, [])

  const browseTag = (id: string) => {
    setOpenTagColorId(null)
    setTagManagerOpen(false)
    setBrowsingTagId(id)
  }

  const openTaggedTask = (task: Task) => { setBrowsingTagId(null); editTask(task) }
  const openTaggedJournal = (entry: JournalEntry) => { setBrowsingTagId(null); editJournal(entry) }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">Z</div>
          <div>
            <h1>Zing Calendar</h1>
            <p>把时间留给真正重要的事。</p>
          </div>
        </div>

        <nav className="top-actions" aria-label="主要功能">
          <button className="icon-button" type="button" aria-label="标签" title="标签" onClick={() => setTagManagerOpen(true)}>#</button>
          <button className="icon-button" type="button" aria-label="搜索" title="搜索">⌕</button>
          <button className="icon-button" type="button" aria-label="设置" title="设置">⚙</button>
        </nav>
      </header>

      <section className="calendar-card" aria-label="月历">
        <div className="calendar-toolbar">
          <div className="month-navigation">
            <button className="nav-button" type="button" onClick={() => moveMonth(-1)} aria-label="上个月">‹</button>
            <h2>{MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</h2>
            <button className="nav-button" type="button" onClick={() => moveMonth(1)} aria-label="下个月">›</button>
            <button className="today-button" type="button" onClick={goToday}>Today</button>
          </div>

        </div>

        <div className="weekday-row">
          {WEEKDAYS.map(day => <div key={day}>{day}</div>)}
        </div>

        <div className="calendar-grid">
          {days.map(({ date, inCurrentMonth }, dayIndex) => {
            const isToday = sameDay(date, today)
            const isSelected = selectedDate ? sameDay(date, selectedDate) : false
            const key = toDateKey(date)
            const dayTasks = tasksByDate.get(key) ?? []
            // Keep a five-slot visual budget per day. Multi-day bars consume
            // slots only on dates they actually cover; the remaining slots are
            // available to ordinary tasks. This avoids showing “+1” while the
            // lower half of an otherwise empty cell is still unused.
            const previewCapacity = Math.max(0, 5 - multiDayLaneCountsByDay[dayIndex])
            const visibleDayTasks = dayTasks.slice(0, previewCapacity)
            const hiddenDayTaskCount = Math.max(0, dayTasks.length - visibleDayTasks.length)
            return (
              <button
                key={key}
                type="button"
                className={`day-cell${inCurrentMonth ? '' : ' outside-month'}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                style={{ '--multi-offset': `${multiDayLaneCountsByDay[dayIndex] * 26}px` } as any}
                aria-label={formatDate(date)}
                onClick={() => openDay(date)}
              >
                <span className="day-number">{date.getDate()}</span>
                {dayTasks.length > 0 && (
                  <span className="task-preview-list">
                    {visibleDayTasks.map(task => (
                      <span key={task.id} className={`task-preview priority-${task.priority} status-${task.status}`}>
                        <span className="priority-dot" />
                        <span className="task-preview-title">{task.title}</span>
                        {!task.allDay && task.time && <span className="task-preview-time">{task.time}</span>}
                      </span>
                    ))}
                    {hiddenDayTaskCount > 0 && <span className="more-tasks">+{hiddenDayTaskCount}</span>}
                  </span>
                )}
              </button>
            )
          })}
          <div className="multi-day-layer">
            {multiDaySegments.map(segment => (
              <button
                key={`${segment.task.id}-${segment.week}`}
                type="button"
                className={`multi-day-bar priority-${segment.task.priority} status-${segment.task.status}`}
                style={{ gridColumn: `${segment.startColumn + 1} / span ${segment.span}`, gridRow: segment.week + 1, '--lane-offset': `${segment.lane * 26}px` } as CSSProperties}
                onClick={event => { event.stopPropagation(); editTask(segment.task) }}
                title={`${segment.task.title} · ${segment.task.date} → ${taskEndDate(segment.task)}`}
              >
                <span className="priority-dot" />
                <span>{segment.task.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="status-line">
        <span>Zing Calendar · v0.5.0</span>
      </footer>

      {selectedDate && (
        <>
          <button className="drawer-backdrop" type="button" aria-label="关闭日期详情" onClick={() => setSelectedDate(null)} />
          <aside className="day-drawer" aria-label={`${formatDate(selectedDate)} 日期详情`}>
            <div className="drawer-header">
              <div>
                <span className="eyebrow">DAY DETAIL</span>
                <h2>{formatDate(selectedDate)}</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setSelectedDate(null)} aria-label="关闭">×</button>
            </div>

            <section className="detail-section task-section">
              <div className="section-heading">
                <h3>任务</h3>
                {selectedTasks.length > 0 && <span>{selectedTasks.length}</span>}
              </div>

              {selectedTasks.length === 0 ? (
                <p className="empty-state">这一天还没有任务。</p>
              ) : (
                <div className="task-list">
                  {selectedTasks.map(task => (
                    <article
                      key={task.id}
                      className={`task-item priority-${task.priority} status-${task.status} ${deadlineStage(task)}`}
                      onClick={() => editTask(task)}
                    >
                      <span className="task-priority-bar" />
                      <button
                        type="button"
                        className="task-checkbox"
                        aria-label={task.status === 'completed' ? `取消完成 ${task.title}` : task.status === 'abandoned' ? `恢复 ${task.title}` : `完成 ${task.title}`}
                        onClick={event => {
                          event.stopPropagation()
                          setTaskStatus(task, task.status === 'todo' ? 'completed' : 'todo')
                        }}
                      >
                        {task.status === 'completed' ? '✓' : task.status === 'abandoned' ? '×' : ''}
                      </button>
                      <strong className="task-title">{task.title}</strong>
                      {isMultiDayTask(task) && <span className="task-range">{formatTaskRange(task)}</span>}
                      {!task.allDay && task.time && <span className="task-card-time">{task.time}</span>}
                    </article>
                  ))}
                </div>
              )}

              <button className="add-button" type="button" onClick={openTaskEditor}>＋ 添加任务</button>
            </section>

            <section className="detail-section mood-section">
              <div className="section-heading"><h3>今日心情</h3></div>
              <div className="mood-picker" aria-label="今日心情">
                {MOODS.map(mood => (
                  <button key={mood.value} type="button" className={`mood-choice mood-${mood.value}${selectedMood?.level === mood.value ? ' active' : ''}`} onClick={() => setMood(mood.value)}>
                    <MoodFace level={mood.value} />
                    <span>{mood.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="detail-section journal-section">
              <div className="section-heading journal-heading">
                <h3>记录</h3>
                {selectedJournalEntries.length > 0 && <span>{selectedJournalEntries.length}</span>}
                {selectedJournalEntries.length > 0 && <strong className={`impact-total ${selectedImpactTotal > 0 ? 'positive' : selectedImpactTotal < 0 ? 'negative' : ''}`}>事件合计 {selectedImpactTotal > 0 ? '+' : ''}{selectedImpactTotal}</strong>}
              </div>
              {selectedJournalEntries.length === 0 ? <p className="empty-state">暂无记录</p> : (
                <div className="journal-list">
                  {selectedJournalEntries.map(entry => (
                    <button key={entry.id} type="button" className="journal-entry" onClick={() => editJournal(entry)}>
                      <span className="journal-meta">{entry.time ?? '无时间'}</span>
                      <span className="journal-content">{entry.content}</span>
                      <span className="entry-tags">{(entry.tagIds ?? [DEFAULT_TAG_ID]).slice(0, 2).map(id => { const tag = tags.find(item => item.id === id); return tag ? <span key={id} className="mini-tag" style={{ '--tag-color': tag.color } as any}>#{tag.name}</span> : null })}</span>
                      <span className={`impact-badge impact-${entry.impact}`}>{entry.impact > 0 ? '+' : ''}{entry.impact}</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="add-button" type="button" onClick={openJournalEditor}>＋ 添加记录</button>
            </section>

            <section className="detail-section mood-calendar-section">
              <div className="mini-calendar-header">
                <div>
                  <span className="eyebrow">MOOD CALENDAR</span>
                  <h3>心情月历</h3>
                </div>
                <div className="mini-month-navigation">
                  <button type="button" aria-label="上个月" onClick={() => setMoodMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button>
                  <strong>{MONTHS[moodMonth.getMonth()]} {moodMonth.getFullYear()}</strong>
                  <button type="button" aria-label="下个月" onClick={() => setMoodMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button>
                </div>
              </div>
              <div className="mini-weekdays">{WEEKDAYS.map(day => <span key={day}>{day.slice(0, 1)}</span>)}</div>
              <div className="mood-mini-grid">
                {moodDays.map(({ date, inCurrentMonth }, index) => {
                  const key = toDateKey(date)
                  const mood = moodsByDate.get(key)
                  const column = index % 7
                  const prev = index > 0 ? moodsByDate.get(toDateKey(moodDays[index - 1].date)) : undefined
                  const next = index < moodDays.length - 1 ? moodsByDate.get(toDateKey(moodDays[index + 1].date)) : undefined
                  const joinLeft = Boolean(mood && column > 0 && prev?.level === mood.level && moodDays[index - 1].inCurrentMonth)
                  const joinRight = Boolean(mood && column < 6 && next?.level === mood.level && moodDays[index + 1].inCurrentMonth)
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`mood-mini-day${inCurrentMonth ? '' : ' outside'}${sameDay(date, today) ? ' today' : ''}`}
                      onClick={() => {
                        const nextDate = new Date(date)
                        const nextMonth = new Date(date.getFullYear(), date.getMonth(), 1)
                        setSelectedDate(nextDate)
                        setMoodMonth(nextMonth)
                        setVisibleMonth(nextMonth)
                      }}
                      aria-label={`${formatDate(date)}${mood ? `，${MOODS.find(item => item.value === mood.level)?.label}` : '，尚未记录心情'}`}
                    >
                      {mood && inCurrentMonth && <span className={`mood-run mood-${mood.level}${joinLeft ? ' join-left' : ''}${joinRight ? ' join-right' : ''}`} />}
                      <span className="mini-day-number">{date.getDate()}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          </aside>
        </>
      )}

      {tagManagerOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭标签管理" onClick={() => setTagManagerOpen(false)} />
          <section className="task-editor tag-manager" role="dialog" aria-modal="true" aria-labelledby="tag-manager-title">
            <div className="editor-header"><div><span className="eyebrow">TAGS</span><h2 id="tag-manager-title">标签</h2></div><button className="close-button" type="button" onClick={() => setTagManagerOpen(false)}>×</button></div>
            <div className="editor-body">
              <div className="tag-create-row"><input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="新标签名称" /><select value={newTagScope} onChange={e => setNewTagScope(e.target.value as TagScope)}><option value="both">Task + Journal</option><option value="task">仅 Task</option><option value="journal">仅 Journal</option></select><button className="save-button" type="button" onClick={addTag} disabled={!newTagName.trim()}>添加</button></div>
              <div className="tag-color-row">{TAG_COLORS.map(color => <button key={color} type="button" className={`tag-color${newTagColor === color ? ' active' : ''}`} style={{ background: color }} onClick={() => setNewTagColor(color)} aria-label={`选择颜色 ${color}`} />)}</div>
              <div className="tag-list">{tags.map(tag => <div className="tag-row" key={tag.id}>
                <div className="tag-color-control">
                  <button type="button" className="tag-current-color" style={{ background: tag.color }} onClick={() => setOpenTagColorId(current => current === tag.id ? null : tag.id)} aria-label={`修改 ${tag.name} 的颜色`} />
                  {openTagColorId === tag.id && <div className="tag-color-popover">
                    <div className="tag-popover-palette">{TAG_COLORS.map(color => <button key={color} type="button" className={`tag-row-color${tag.color === color ? ' active' : ''}`} style={{ background: color }} onClick={() => { setTags(current => current.map(item => item.id === tag.id ? { ...item, color } : item)); setOpenTagColorId(null) }} aria-label={`设为 ${color}`} />)}</div>
                    <div className="tag-custom-color"><span>自定义</span><input type="color" value={tag.color} onChange={e => setTags(current => current.map(item => item.id === tag.id ? { ...item, color: e.target.value } : item))} /></div>
                  </div>}
                </div>
                <input value={tag.name} onChange={e => setTags(current => current.map(item => item.id === tag.id ? { ...item, name: e.target.value } : item))} />
                <select value={tag.scope} disabled={tag.system} onChange={e => setTags(current => current.map(item => item.id === tag.id ? { ...item, scope: e.target.value as TagScope } : item))}><option value="both">Task + Journal</option><option value="task">仅 Task</option><option value="journal">仅 Journal</option></select>
                <div className="tag-row-actions">
                  <button type="button" className="tag-browse-button" onClick={() => browseTag(tag.id)}>查看</button>
                  {tag.system ? <span className="system-tag">系统</span> : <button type="button" className="delete-button compact-delete" onClick={() => deleteTag(tag.id)}>删除</button>}
                </div>
              </div>)}</div>
            </div>
          </section>
        </div>
      )}

      {browsingTag && (
        <div className="modal-layer tag-browser-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭标签内容" onClick={() => setBrowsingTagId(null)} />
          <section className="task-editor tag-browser" role="dialog" aria-modal="true" aria-labelledby="tag-browser-title">
            <div className="editor-header">
              <div className="tag-browser-title-wrap">
                <span className="eyebrow">TAG</span>
                <h2 id="tag-browser-title"><i style={{ background: browsingTag.color }} />{browsingTag.name}</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setBrowsingTagId(null)}>×</button>
            </div>
            <div className="editor-body tag-browser-body">
              {taggedTimelineGroups.length === 0 ? <p className="empty-state">还没有带这个标签的任务或记录。</p> : (
                <div className="tag-timeline">
                  {taggedTimelineGroups.map(group => <section key={group.date} className="tag-timeline-day">
                    <div className="tag-timeline-date">{formatDate(fromDateKey(group.date))}</div>
                    <div className="tag-timeline-items">
                      {group.items.map(item => item.kind === 'task' ? (
                        <button key={`task-${item.task.id}`} type="button" className={`tag-timeline-item tag-task-result priority-${item.task.priority} status-${item.task.status}`} onClick={() => openTaggedTask(item.task)}>
                          <span className="timeline-node priority-dot" />
                          <span className="tag-result-main"><strong>{item.task.title}</strong><small>任务 · {isMultiDayTask(item.task) ? `${formatDate(fromDateKey(item.task.date))} → ${formatDate(fromDateKey(taskEndDate(item.task)))}` : (!item.task.allDay && item.task.time ? item.task.time : '全天')}</small></span>
                          <span className="tag-result-status">{item.task.status === 'completed' ? '✓' : item.task.status === 'abandoned' ? '×' : ''}</span>
                        </button>
                      ) : (
                        <button key={`journal-${item.entry.id}`} type="button" className="tag-timeline-item tag-journal-result" onClick={() => openTaggedJournal(item.entry)}>
                          <span className={`timeline-node journal-node impact-${item.entry.impact}`} />
                          <span className="tag-result-main"><strong>{item.entry.content}</strong><small>记录 · {item.entry.impact > 0 ? '+' : ''}{item.entry.impact}{item.entry.time ? ` · ${item.entry.time}` : ''}</small></span>
                        </button>
                      ))}
                    </div>
                  </section>)}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {journalEditorOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭记录编辑器" onClick={closeJournalEditor} />
          <section className="task-editor journal-editor" role="dialog" aria-modal="true" aria-labelledby="journal-editor-title">
            <div className="editor-header">
              <div><span className="eyebrow">{editingJournalId ? 'JOURNAL DETAIL' : 'NEW JOURNAL'}</span><h2 id="journal-editor-title">{editingJournalId ? '记录详情' : '添加记录'}</h2></div>
              <button className="close-button" type="button" onClick={closeJournalEditor} aria-label="关闭">×</button>
            </div>
            <div className="editor-body">
              <label className="field full-field"><span>发生了什么？ *</span><textarea autoFocus rows={6} value={journalDraft.content} onChange={event => setJournalDraft(current => ({ ...current, content: event.target.value }))} placeholder="一句话也可以。" /></label>
              <div className="field-grid">
                <label className="field"><span>日期</span><input type="date" value={journalDraft.date} onChange={event => setJournalDraft(current => ({ ...current, date: event.target.value }))} /></label>
                <div className="journal-time-control">
                  <label className="check-field"><input type="checkbox" checked={journalDraft.hasTime} onChange={event => setJournalDraft(current => ({ ...current, hasTime: event.target.checked }))} /><span>记录时间</span></label>
                  {journalDraft.hasTime && <label className="field compact-field"><span>时间</span><input type="time" value={journalDraft.time} onChange={event => setJournalDraft(current => ({ ...current, time: event.target.value }))} /></label>}
                </div>
              </div>
              <div className="field full-field"><span>事件影响</span><div className="impact-picker">{IMPACTS.map(impact => <button key={impact} type="button" className={`impact-choice impact-${impact}${journalDraft.impact === impact ? ' active' : ''}`} onClick={() => setJournalDraft(current => ({ ...current, impact }))}>{impact > 0 ? '+' : ''}{impact}</button>)}</div></div>
              <div className="field full-field"><span>Tags</span><div className="tag-picker">{tagsFor('journal').map(tag => <button key={tag.id} type="button" className={`tag-choice${journalDraft.tagIds.includes(tag.id) ? ' active' : ''}`} style={{ '--tag-color': tag.color } as any} onClick={() => toggleDraftTag('journal', tag.id)}><i />#{tag.name}</button>)}</div></div>
            </div>
            <div className="editor-footer">
              {editingJournalId && <div className="editor-secondary-actions"><button type="button" className="delete-button" onClick={() => { deleteJournal(editingJournalId); closeJournalEditor() }}>删除记录</button></div>}
              <div className="editor-primary-actions"><button className="cancel-button" type="button" onClick={closeJournalEditor}>取消</button><button className="save-button" type="button" onClick={saveJournal} disabled={!journalDraft.content.trim()}>{editingJournalId ? '保存修改' : '保存记录'}</button></div>
            </div>
          </section>
        </div>
      )}

      {editorOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭任务编辑器" onClick={closeEditor} />
          <section className="task-editor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
            <div className="editor-header">
              <div>
                <span className="eyebrow">{editingTaskId ? 'TASK DETAIL' : 'NEW TASK'}</span>
                <h2 id="task-editor-title">{editingTaskId ? '任务详情' : '添加任务'}</h2>
              </div>
              <button className="close-button" type="button" onClick={closeEditor} aria-label="关闭">×</button>
            </div>

            <div className="editor-body">
              <label className="field full-field">
                <span>任务名称 *</span>
                <input autoFocus value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="要做什么？" />
              </label>

              <div className="field-grid">
                <label className="field">
                  <span>开始日期</span>
                  <input type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value, endDate: current.endDate && current.endDate < event.target.value ? '' : current.endDate }))} />
                </label>
                <label className="field">
                  <span>结束日期 · 可选</span>
                  <input type="date" min={draft.date} value={draft.endDate} onChange={event => setDraft(current => ({ ...current, endDate: event.target.value }))} />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Deadline</span>
                  <input type="date" value={draft.deadline} onChange={event => setDraft(current => ({ ...current, deadline: event.target.value }))} />
                </label>
              </div>

              <div className="field full-field">
                <span>优先级</span>
                <div className="priority-picker">
                  {PRIORITIES.map(priority => (
                    <button key={priority.value} type="button" className={`priority-choice priority-${priority.value}${draft.priority === priority.value ? ' active' : ''}`} onClick={() => setDraft(current => ({ ...current, priority: priority.value }))}>
                      <span className="priority-dot" />
                      <strong>{priority.label}</strong>
                      <small>{priority.hint}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="time-row">
                <label className="check-field">
                  <input type="checkbox" checked={draft.allDay} onChange={event => setDraft(current => ({ ...current, allDay: event.target.checked }))} />
                  <span>全天</span>
                </label>
                {!draft.allDay && (
                  <label className="field compact-field">
                    <span>时间</span>
                    <input type="time" value={draft.time} onChange={event => setDraft(current => ({ ...current, time: event.target.value }))} />
                  </label>
                )}
              </div>

              <div className="field-grid repeat-fields">
                <label className="field">
                  <span>Repeat</span>
                  <select value={draft.repeatPreset} onChange={event => setDraft(current => ({ ...current, repeatPreset: event.target.value as TaskDraft['repeatPreset'] }))}>
                    <option value="none">不重复</option><option value="daily">每天</option><option value="weekly">{repeatPresetLabels(draft.date).weekly}</option><option value="monthly">{repeatPresetLabels(draft.date).monthly}</option><option value="yearly">{repeatPresetLabels(draft.date).yearly}</option><option value="custom">自定义</option>
                  </select>
                </label>
                {draft.repeatPreset === 'custom' && <label className="field"><span>每隔</span><div className="repeat-interval"><input type="number" min="1" max="999" value={draft.repeatInterval} onChange={event => setDraft(current => ({ ...current, repeatInterval: Math.max(1, Number(event.target.value) || 1) }))} /><select value={draft.repeatUnit} onChange={event => setDraft(current => ({ ...current, repeatUnit: event.target.value as RecurrenceUnit }))}><option value="day">天</option><option value="week">周</option><option value="month">月</option></select></div></label>}
              </div>
              {draft.repeatPreset === 'custom' && draft.repeatUnit === 'week' && <div className="field full-field"><span>重复星期</span><div className="weekday-picker">{WEEKDAYS.map((day, index) => <button key={day} type="button" className={draft.repeatWeekdays.includes(index) ? 'active' : ''} onClick={() => setDraft(current => ({ ...current, repeatWeekdays: current.repeatWeekdays.includes(index) ? current.repeatWeekdays.filter(value => value !== index) : [...current.repeatWeekdays, index] }))}>{day}</button>)}</div></div>}
              {draft.repeatPreset !== 'none' && <div className="field-grid repeat-end-fields">
                <label className="field"><span>Ends</span><select value={draft.repeatEndMode} onChange={event => setDraft(current => ({ ...current, repeatEndMode: event.target.value as TaskDraft['repeatEndMode'] }))}><option value="never">永不</option><option value="date">按日期</option><option value="count">按次数</option></select></label>
                {draft.repeatEndMode === 'date' && <label className="field"><span>结束日期</span><input type="date" min={draft.date} value={draft.repeatEndDate} onChange={event => setDraft(current => ({ ...current, repeatEndDate: event.target.value }))} /></label>}
                {draft.repeatEndMode === 'count' && <label className="field"><span>重复次数</span><div className="repeat-count"><input type="number" min="1" max="9999" value={draft.repeatEndCount} onChange={event => setDraft(current => ({ ...current, repeatEndCount: Math.max(1, Number(event.target.value) || 1) }))} /><span>次</span></div></label>}
              </div>}

              <div className="field full-field"><span>Tags</span><div className="tag-picker">{tagsFor('task').map(tag => <button key={tag.id} type="button" className={`tag-choice${draft.tagIds.includes(tag.id) ? ' active' : ''}`} style={{ '--tag-color': tag.color } as any} onClick={() => toggleDraftTag('task', tag.id)}><i />#{tag.name}</button>)}</div></div>

              <label className="field full-field">
                <span>备注</span>
                <textarea rows={4} value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder="可选" />
              </label>
            </div>

            <div className="editor-footer">
              {editingTaskId && (
                <div className="editor-secondary-actions">
                  <button type="button" className="abandon-button" onClick={() => { const series = tasks.find(task => task.id === editingTaskId); if (series) { const shown = editingOccurrenceDate ? materializeOccurrence(series, editingOccurrenceDate) : series; if (shown) setTaskStatus(shown, 'abandoned') }; closeEditor() }}>放弃任务</button>
                  {editingOccurrenceDate ? (
                    <>
                      <button type="button" className="delete-button" onClick={() => {
                        const series = tasks.find(task => task.id === editingTaskId)
                        const shown = series ? materializeOccurrence(series, editingOccurrenceDate) : null
                        if (shown) deleteTask(shown, 'occurrence')
                        closeEditor()
                      }}>删除本次</button>
                      <button type="button" className="delete-button" onClick={() => {
                        const series = tasks.find(task => task.id === editingTaskId)
                        if (series) deleteTask(series, 'series')
                        closeEditor()
                      }}>删除整个系列</button>
                    </>
                  ) : (
                    <button type="button" className="delete-button" onClick={() => {
                      const series = tasks.find(task => task.id === editingTaskId)
                      if (series) deleteTask(series, 'series')
                      closeEditor()
                    }}>删除任务</button>
                  )}
                </div>
              )}
              <div className="editor-primary-actions">
                <button className="cancel-button" type="button" onClick={closeEditor}>取消</button>
                {editingOccurrenceDate && <button className="cancel-button" type="button" onClick={() => saveTask('occurrence')} disabled={!draft.title.trim()}>仅修改本次</button>}
                <button className="save-button" type="button" onClick={() => saveTask('series')} disabled={!draft.title.trim()}>{editingOccurrenceDate ? '修改整个系列' : editingTaskId ? '保存修改' : '保存任务'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
