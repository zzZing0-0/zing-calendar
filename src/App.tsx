import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { appendSyncChange, cleanupOrphanAttachmentBlobs, deleteAttachmentBlob, getAttachmentBlob, getOrCreateDeviceId, getStorageStats, replaceZingData, loadAnniversaries, loadDailyMoods, loadJournalEntries, loadTasks, loadTags, putAttachmentBlob, saveAnniversaries, saveDailyMoods, saveJournalEntries, saveTags, saveTasks, saveSyncTombstone, syncWithGitHub } from './db/calendar'
import type { SyncEntityType } from './db/calendar'
import './App.css'

type TaskPriority = 0 | 1 | 2 | 3
type TaskStatus = 'todo' | 'completed' | 'abandoned'
type RecurrenceUnit = 'day' | 'week' | 'month' | 'year'
type RecurrenceEnd = { type: 'date'; date: string } | { type: 'count'; count: number }
type RecurrenceRule = { unit: RecurrenceUnit; interval: number; weekdays?: number[]; end?: RecurrenceEnd }
type PostponeEvent = { from: string; to: string; at: string }
type Attachment = { id: string; type: 'image' | 'audio'; filename: string; mimeType: string; size: number; storageKey: string; createdAt: string; duration?: number }
type RecurrenceException = { deleted?: boolean; status?: TaskStatus; completedAt?: string; title?: string; date?: string; endDate?: string; priority?: TaskPriority; allDay?: boolean; time?: string; deadline?: string; notes?: string; tagIds?: string[]; postponeHistory?: PostponeEvent[]; attachments?: Attachment[]; updatedAt: string }

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
  completedAt?: string
  originalDate?: string
  postponeHistory?: PostponeEvent[]
  attachments?: Attachment[]
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
  title: string
  content: string
  impact: JournalImpact
  createdAt: string
  updatedAt: string
  tagIds?: string[]
  attachments?: Attachment[]
}

type AnniversaryType = 'birthday' | 'anniversary' | 'important' | 'other'
type AnniversaryCalendar = 'solar' | 'lunar'
type Anniversary = {
  id: string
  title: string
  type: AnniversaryType
  calendar: AnniversaryCalendar
  year?: number
  month: number
  day: number
  isLeapMonth?: boolean
  repeatYearly: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}
type AnniversaryDraft = {
  title: string
  type: AnniversaryType
  calendar: AnniversaryCalendar
  year: string
  month: number
  day: number
  isLeapMonth: boolean
  repeatYearly: boolean
  notes: string
}

type TagScope = 'task' | 'journal' | 'both'
type Tag = { id: string; name: string; color: string; scope: TagScope; sortOrder?: number; archived?: boolean; archivedAt?: string; system?: boolean; systemKind?: 'default' | 'import-source'; sourceKey?: string }

type JournalDraft = {
  date: string
  hasTime: boolean
  time: string
  title: string
  content: string
  impact: JournalImpact
  tagIds: string[]
  attachments: Attachment[]
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
  attachments: Attachment[]
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
const DEFAULT_TAG: Tag = { id: DEFAULT_TAG_ID, name: '默认', color: '#9aa59f', scope: 'both', system: true, systemKind: 'default' }
const IMPORT_SOURCE_TAG_PREFIX = 'system-import-source:'
// Keep the legacy `...:dida` id for the umbrella tag so existing imported tasks remain compatible.
const EXTERNAL_SOURCE_TAG_ID = `${IMPORT_SOURCE_TAG_PREFIX}dida`
const DIDA_APP_SOURCE_TAG_ID = `${IMPORT_SOURCE_TAG_PREFIX}dida-list`
const GENERIC_SOURCE_TAG_ID = `${IMPORT_SOURCE_TAG_PREFIX}generic`
const EXTERNAL_SOURCE_TAG: Tag = { id: EXTERNAL_SOURCE_TAG_ID, name: '从外部导入', color: '#789da3', scope: 'task', system: true, systemKind: 'import-source', sourceKey: 'external' }
const DIDA_APP_SOURCE_TAG: Tag = { id: DIDA_APP_SOURCE_TAG_ID, name: '滴答清单', color: '#789da3', scope: 'task', system: true, systemKind: 'import-source', sourceKey: 'dida' }
const GENERIC_SOURCE_TAG: Tag = { id: GENERIC_SOURCE_TAG_ID, name: '通用', color: '#789da3', scope: 'task', system: true, systemKind: 'import-source', sourceKey: 'generic' }
function isImportSourceTagId(id:string) { return id.startsWith(IMPORT_SOURCE_TAG_PREFIX) }
function isImportSourceTag(tag:Tag) { return tag.systemKind === 'import-source' || isImportSourceTagId(tag.id) }
const TAG_COLORS = ['#789c86', '#d3b64b', '#d88b48', '#c8665f', '#8798bd', '#9b83ad', '#789da3', '#a58d72']

const ANNIVERSARY_TYPES: { value: AnniversaryType; label: string; icon: string }[] = [
  { value: 'birthday', label: '生日', icon: '🎂' },
  { value: 'anniversary', label: '纪念日', icon: '❤️' },
  { value: 'important', label: '重要日期', icon: '⭐' },
  { value: 'other', label: '其他', icon: '📌' },
]
function anniversaryIcon(type: AnniversaryType) { return ANNIVERSARY_TYPES.find(item => item.value === type)?.icon ?? '📌' }
function emptyAnniversaryDraft(date: Date): AnniversaryDraft {
  return { title:'', type:'birthday', calendar:'solar', year:'', month:date.getMonth()+1, day:date.getDate(), isLeapMonth:false, repeatYearly:true, notes:'' }
}
function daysInMonth(year:number, month:number) { return new Date(year, month, 0).getDate() }
function lunarOccurrence(ann: Anniversary, solarYear: number): Date | null {
  // Find by scanning the solar year. This uses the browser's Chinese-calendar engine,
  // avoids duplicating lunar arithmetic, and correctly sees leap-month labels.
  const start=new Date(solarYear,0,1), end=new Date(solarYear,11,31)
  let normalFallback: Date | null = null
  for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) {
    const lunar=solarToLunar(d)
    const monthNumber=Number.parseInt(lunar.monthText.replace(/[^0-9]/g,''),10)
    // Intl may localize month names as Chinese words; derive month by formatter parts fallback below.
    const rawMonth=lunar.monthText
    const cnMonths=['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
    const clean=rawMonth.replace('闰','')
    const m=Number.isFinite(monthNumber) ? monthNumber : cnMonths.indexOf(clean)+1
    if (m!==ann.month || lunar.day!==ann.day) continue
    if (ann.isLeapMonth && lunar.isLeapMonth) return new Date(d)
    if (!ann.isLeapMonth && !lunar.isLeapMonth) return new Date(d)
    if (ann.isLeapMonth && !lunar.isLeapMonth) normalFallback=new Date(d)
  }
  // Common birthday policy: leap-month birthday falls back to the ordinary month
  // when that lunar year has no matching leap month.
  return ann.isLeapMonth ? normalFallback : null
}
function anniversaryOccurrence(ann: Anniversary, solarYear:number): Date | null {
  // A stored year is the origin year. Even a yearly recurrence must not exist before it.
  if (ann.repeatYearly && ann.year && solarYear < ann.year) return null
  if (ann.calendar==='solar') {
    const year=ann.repeatYearly ? solarYear : (ann.year ?? solarYear)
    if (!ann.repeatYearly && ann.year!==solarYear) return null
    const max=daysInMonth(year,ann.month)
    if (ann.day>max) return null
    return new Date(year,ann.month-1,ann.day)
  }
  if (!ann.repeatYearly && ann.year && ann.year!==solarYear) return null
  return lunarOccurrence(ann,solarYear)
}
function anniversaryMeta(ann: Anniversary, occurrence: Date) {
  if (!ann.year) return ann.calendar==='lunar' ? '农历' : ''
  const n=occurrence.getFullYear()-ann.year
  if (ann.type==='birthday') return n>=0 ? `${n}岁` : ''
  return n>0 ? `${n}周年` : ''
}

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

function buildMonth(year: number, month: number, weekStartsMonday = true): CalendarDay[] {
  const first = new Date(year, month, 1)
  const offset = weekStartsMonday ? (first.getDay() + 6) % 7 : first.getDay()
  const gridStart = new Date(year, month, 1 - offset)

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
  return { date: toDateKey(date), hasTime: true, time: currentTime(), title: '', content: '', impact: 0, tagIds: [DEFAULT_TAG_ID], attachments: [] }
}

function emptyDraft(date: Date, defaultPriority: TaskPriority = 1): TaskDraft {
  return {
    title: '',
    date: toDateKey(date),
    endDate: '',
    priority: defaultPriority,
    allDay: false,
    time: '',
    deadline: '',
    notes: '',
    tagIds: [DEFAULT_TAG_ID],
    attachments: [],
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

function secondOccurrenceDate(task: Task): string | null {
  if (!task.recurrence) return null
  let cursor = fromDateKey(task.date)
  // Search far enough for yearly/custom yearly rules while respecting recurrence end.
  const limit = new Date(cursor)
  limit.setFullYear(limit.getFullYear() + 20)
  let seen = 0
  while (cursor <= limit) {
    const key = toDateKey(cursor)
    if (occursOn(task, key)) {
      seen += 1
      if (seen === 2) return key
    }
    // A date-ended rule cannot produce anything after its end date.
    if (task.recurrence.end?.type === 'date' && key >= task.recurrence.end.date) break
    // A count-ended rule with count <= 1 is necessarily a single occurrence.
    if (task.recurrence.end?.type === 'count' && task.recurrence.end.count <= 1) break
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}

function normalizeSingleOccurrenceSeries(task: Task): Task {
  if (!task.recurrence || secondOccurrenceDate(task)) return task
  const first = task.recurrenceExceptions?.[task.date]
  return {
    ...task,
    ...(first ?? {}),
    id: task.id,
    seriesId: undefined,
    occurrenceDate: undefined,
    recurrence: undefined,
    recurrenceExceptions: undefined,
  }
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

  const aHasTime = !a.allDay && Boolean(a.time)
  const bHasTime = !b.allDay && Boolean(b.time)
  if (aHasTime !== bHasTime) return aHasTime ? -1 : 1
  if (aHasTime && bHasTime && a.time !== b.time) return (a.time ?? '').localeCompare(b.time ?? '')
  if (a.priority !== b.priority) return b.priority - a.priority

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
 
function isTaskOverdue(task: Task, todayKey = toDateKey(new Date())) {
  return task.status === 'todo' && taskEndDate(task) < todayKey
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
    const candidates = tasks
      .filter(task => isMultiDayTask(task) && task.date <= weekEnd && taskEndDate(task) >= weekStart)
      .sort((a, b) => a.date.localeCompare(b.date) || taskEndDate(b).localeCompare(taskEndDate(a)) || b.priority - a.priority)
    const lanes: { start:number; end:number }[][] = []
    candidates.forEach(task => {
      const clippedStart = task.date < weekStart ? weekStart : task.date
      const clippedEnd = taskEndDate(task) > weekEnd ? weekEnd : taskEndDate(task)
      const startColumn = weekDays.findIndex(day => toDateKey(day.date) === clippedStart)
      const endColumn = weekDays.findIndex(day => toDateKey(day.date) === clippedEnd)
      let lane = 0
      while ((lanes[lane] ?? []).some(item => !(endColumn < item.start || startColumn > item.end))) lane += 1
      if (!lanes[lane]) lanes[lane] = []
      lanes[lane].push({ start:startColumn, end:endColumn })
      segments.push({ task, week, startColumn, span:endColumn-startColumn+1, lane })
    })
  }
  return segments
}

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const maxSide = 1800
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const toBlob = (quality: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image compression failed')), 'image/webp', quality))
  let blob = await toBlob(0.84)
  if (blob.size > 1024 * 1024) blob = await toBlob(0.70)
  return blob
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function AttachmentThumb({ attachment, onRemove, onPreview }: { attachment: Attachment; onRemove?: () => void; onPreview: (attachment: Attachment) => void }) {
  const [url, setUrl] = useState<string>('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    getAttachmentBlob(attachment.storageKey).then(blob => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.storageKey])

  return <div className="attachment-card">
    <button className="attachment-image-button" type="button" onClick={() => onPreview(attachment)} disabled={!url} aria-label={`预览 ${attachment.filename}`}>
      {url ? <img src={url} alt="" /> : <span className="attachment-loading">加载中…</span>}
    </button>
    <div className="attachment-card-info">
      <span className="attachment-card-name" title={attachment.filename}>{attachment.filename}</span>
      <span className="attachment-card-size">压缩后 {formatFileSize(attachment.size)}</span>
    </div>
    {onRemove && <button className="attachment-remove-button" type="button" onClick={onRemove} aria-label={`删除 ${attachment.filename}`}>×</button>}
  </div>
}

function StorageImage({ attachment, onPreview }: { attachment: Attachment; onPreview:(attachment:Attachment)=>void }) {
  const [url,setUrl]=useState('')
  useEffect(() => {
    let active=true, objectUrl=''
    getAttachmentBlob(attachment.storageKey).then(blob => { if (!active || !blob) return; objectUrl=URL.createObjectURL(blob); setUrl(objectUrl) })
    return () => { active=false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  },[attachment.storageKey])
  return <button type="button" className="storage-image-item" onClick={()=>onPreview(attachment)}>{url ? <img src={url} alt={attachment.filename}/> : <span>加载中…</span>}<small>{attachment.filename}</small></button>
}

function AudioAttachment({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true, objectUrl = ''
    getAttachmentBlob(attachment.storageKey).then(blob => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [attachment.storageKey])
  return url ? <audio className="journal-audio-player" controls src={url} /> : <span>录音加载中…</span>
}

const chineseCalendarFormatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
  month: 'long',
  day: 'numeric',
})

function lunarParts(date: Date) {
  const parts = chineseCalendarFormatter.formatToParts(date)
  const month = parts.find(part => part.type === 'month')?.value ?? ''
  const day = parts.find(part => part.type === 'day')?.value ?? ''
  return { month, day }
}

function lunarCalendarLabel(date: Date) {
  const { month, day } = lunarParts(date)
  // Keep ordinary cells quiet; on the first lunar day, show the month name.
  return day === '1' || day === '初一' ? month : chineseLunarDayName(Number.parseInt(day, 10))
}

function chineseLunarDayName(day: number) {
  if (!Number.isFinite(day) || day < 1 || day > 30) return ''
  const names = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十']
  return names[day - 1]
}

type CalendarAnnotationKind = 'statutory' | 'traditional' | 'international' | 'solar-term' | 'week'
type CalendarAnnotation = { label: string; kind: CalendarAnnotationKind }

function lunarMonthNumber(monthText: string) {
  const clean = monthText.replace('闰', '').replace('月', '')
  const names: Record<string, number> = {
    '正':1,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'冬':11,'十二':12,'腊':12,
  }
  return names[clean] ?? Number.parseInt(clean, 10)
}

function isoWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function nthWeekdayOfMonth(date: Date, weekday: number, nth: number) {
  if (date.getDay() !== weekday) return false
  return Math.floor((date.getDate() - 1) / 7) + 1 === nth
}

// Standard 24-solar-term approximation used for modern Gregorian years.
// The table is minutes from the 1900 小寒 epoch; dates are resolved in China Standard Time.
const SOLAR_TERM_NAMES = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至']
const SOLAR_TERM_MINUTES = [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758]
function solarTermForDate(date: Date) {
  const year = date.getFullYear()
  for (let index=0; index<24; index+=1) {
    const utcMs = Date.UTC(1900,0,6,2,5) + 31556925974.7 * (year - 1900) + SOLAR_TERM_MINUTES[index] * 60000
    const china = new Date(utcMs + 8 * 3600000)
    if (china.getUTCMonth() === date.getMonth() && china.getUTCDate() === date.getDate()) return SOLAR_TERM_NAMES[index]
  }
  return undefined
}

function calendarFestival(date: Date): CalendarAnnotation | undefined {
  const month = date.getMonth() + 1, day = date.getDate()
  const lunar = solarToLunar(date)
  const lunarMonth = lunarMonthNumber(lunar.monthText)
  const lunarDay = lunar.day
  const lunarKey = `${lunarMonth}-${lunarDay}`
  const solarKey = `${month}-${day}`

  const statutorySolar: Record<string,string> = {'1-1':'元旦','5-1':'劳动节','10-1':'国庆节'}
  const statutoryLunar: Record<string,string> = {'1-1':'春节','5-5':'端午节','8-15':'中秋节'}
  if (statutorySolar[solarKey]) return {label:statutorySolar[solarKey],kind:'statutory'}
  if (statutoryLunar[lunarKey] && !lunar.isLeapMonth) return {label:statutoryLunar[lunarKey],kind:'statutory'}
  if (solarTermForDate(date) === '清明') return {label:'清明节',kind:'statutory'}

  const traditionalLunar: Record<string,string> = {
    '1-15':'元宵节','2-2':'龙抬头','3-3':'上巳节','7-7':'七夕','7-15':'中元节','9-9':'重阳节','10-15':'下元节','12-8':'腊八节',
  }
  if (traditionalLunar[lunarKey] && !lunar.isLeapMonth) return {label:traditionalLunar[lunarKey],kind:'traditional'}
  // 除夕 is the Gregorian day immediately before the next lunar new year.
  const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate()+1)
  const tomorrowLunar = solarToLunar(tomorrow)
  if (lunarMonth === 12 && tomorrowLunar.day === 1 && lunarMonthNumber(tomorrowLunar.monthText) === 1) return {label:'除夕',kind:'traditional'}

  const internationalFixed: Record<string,string> = {
    '2-14':'情人节','3-8':'妇女节','3-12':'植树节','4-1':'愚人节','5-4':'青年节','6-1':'儿童节','9-10':'教师节',
    '10-31':'万圣夜','12-24':'平安夜','12-25':'圣诞节','12-31':'跨年夜',
  }
  if (internationalFixed[solarKey]) return {label:internationalFixed[solarKey],kind:'international'}
  if (month===5 && nthWeekdayOfMonth(date,0,2)) return {label:'母亲节',kind:'international'}
  if (month===6 && nthWeekdayOfMonth(date,0,3)) return {label:'父亲节',kind:'international'}
  if (month===11 && nthWeekdayOfMonth(date,4,4)) return {label:'感恩节',kind:'international'}

  return undefined
}

function calendarAnnotation(date: Date, weekStartsMonday: boolean): CalendarAnnotation | undefined {
  const festival = calendarFestival(date)
  if (festival) return festival
  const term = solarTermForDate(date)
  if (term) return {label:term,kind:'solar-term'}
  const firstWeekday = weekStartsMonday ? 1 : 0
  if (date.getDay() === firstWeekday) return {label:`${isoWeekNumber(date)}周`,kind:'week'}
  return undefined
}

function lunarFullLabel(date: Date) {
  const { month, day } = lunarParts(date)
  const numericDay = Number.parseInt(day, 10)
  return `${month}${chineseLunarDayName(numericDay) || day}`
}

// Stable conversion-service boundary for the Anniversary module.
// Solar -> lunar is implemented here; lunar -> solar will plug into the same boundary
// when Anniversary starts storing semantic lunar dates (including leap-month policy).
type LunarDateParts = { year: number; monthText: string; day: number; isLeapMonth: boolean }
function solarToLunar(date: Date): LunarDateParts {
  const full = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
    year: 'numeric', month: 'long', day: 'numeric'
  }).formatToParts(date)
  const yearText = full.find(part => String(part.type) === 'relatedYear')?.value
    ?? full.find(part => part.type === 'year')?.value ?? String(date.getFullYear())
  const monthText = full.find(part => part.type === 'month')?.value ?? ''
  const dayText = full.find(part => part.type === 'day')?.value ?? ''
  return {
    year: Number.parseInt(yearText, 10),
    monthText,
    day: Number.parseInt(dayText, 10),
    isLeapMonth: monthText.includes('闰'),
  }
}


type ZipEntry = { path: string; bytes: Uint8Array }

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i=0;i<8;i+=1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
function zipDateTime(date: Date) {
  const year=Math.max(1980,date.getFullYear())
  return { time:(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1), date:((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate() }
}
function concatBytes(parts: Uint8Array[]) {
  const total=parts.reduce((sum,part)=>sum+part.length,0), out=new Uint8Array(total); let offset=0
  parts.forEach(part=>{ out.set(part,offset); offset+=part.length }); return out
}
function u16(value:number) { const b=new Uint8Array(2); new DataView(b.buffer).setUint16(0,value,true); return b }
function u32(value:number) { const b=new Uint8Array(4); new DataView(b.buffer).setUint32(0,value>>>0,true); return b }
function makeZip(entries: ZipEntry[]): Blob {
  const encoder=new TextEncoder(), locals:Uint8Array[]=[], centrals:Uint8Array[]=[]; let offset=0
  const stamp=zipDateTime(new Date())
  entries.forEach(entry=>{
    const name=encoder.encode(entry.path), crc=crc32(entry.bytes), size=entry.bytes.length
    const local=concatBytes([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.date),u32(crc),u32(size),u32(size),u16(name.length),u16(0),name,entry.bytes])
    locals.push(local)
    centrals.push(concatBytes([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.date),u32(crc),u32(size),u32(size),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]))
    offset+=local.length
  })
  const centralBytes=concatBytes(centrals)
  const end=concatBytes([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralBytes.length),u32(offset),u16(0)])
  const blobParts: BlobPart[] = [...locals, centralBytes, end].map(bytes => {
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    return copy.buffer
  })
  return new Blob(blobParts,{type:'application/zip'})
}
function safeBackupFilename(name:string) { return name.replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').trim() || 'attachment' }
function attachmentExtension(attachment: Attachment) {
  const match=attachment.filename.match(/(\.[A-Za-z0-9]{1,8})$/)
  if (match) return match[1].toLowerCase()
  if (attachment.mimeType==='image/webp') return '.webp'
  if (attachment.mimeType==='image/png') return '.png'
  if (attachment.mimeType==='image/jpeg') return '.jpg'
  if (attachment.mimeType.includes('webm')) return '.webm'
  if (attachment.mimeType.includes('mp4')) return '.m4a'
  return attachment.type==='image' ? '.img' : '.audio'
}


type BackupPreview = {
  file: File
  manifest: any
  tasks: Task[]
  journals: JournalEntry[]
  moods: DailyMood[]
  tags: Tag[]
  anniversaries: Anniversary[]
  settings: { greeting?:string; weekStart?:'monday'|'sunday'; dateFormat?:'dmy'|'mdy'; showEndedTasks?:boolean; wordCloudIgnored?:string[] }
  attachments: { storageKey:string; path:string; filename:string; mimeType:string; size:number; type:'image'|'audio'; duration?:number; createdAt:string; bytes:Uint8Array }[]
}
function readU16(view:DataView,offset:number){ return view.getUint16(offset,true) }
function readU32(view:DataView,offset:number){ return view.getUint32(offset,true) }
async function readZingZip(file:File): Promise<Map<string,Uint8Array>> {
  const bytes=new Uint8Array(await file.arrayBuffer()), view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  const decoder=new TextDecoder(), entries=new Map<string,Uint8Array>(); let offset=0
  while (offset+4<=bytes.length) {
    const signature=readU32(view,offset)
    if (signature===0x02014b50 || signature===0x06054b50) break
    if (signature!==0x04034b50) throw new Error('ZIP 结构无法识别')
    const flags=readU16(view,offset+6), method=readU16(view,offset+8), compressedSize=readU32(view,offset+18), uncompressedSize=readU32(view,offset+22)
    const nameLength=readU16(view,offset+26), extraLength=readU16(view,offset+28)
    if (flags & 0x0008) throw new Error('不支持 data descriptor ZIP')
    if (method!==0) throw new Error('备份 ZIP 使用了不支持的压缩方式')
    const nameStart=offset+30, dataStart=nameStart+nameLength+extraLength, dataEnd=dataStart+compressedSize
    if (dataEnd>bytes.length) throw new Error('ZIP 文件不完整')
    const name=decoder.decode(bytes.slice(nameStart,nameStart+nameLength))
    const payload=bytes.slice(dataStart,dataEnd)
    if (payload.length!==uncompressedSize) throw new Error(`文件大小异常：${name}`)
    entries.set(name,payload); offset=dataEnd
  }
  return entries
}
function decodeBackupJson<T>(entries:Map<string,Uint8Array>,path:string):T {
  const bytes=entries.get(path); if (!bytes) throw new Error(`缺少 ${path}`)
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T } catch { throw new Error(`${path} 无法解析`) }
}


function csvCell(value:unknown) {
  const text=value==null?'':String(value)
  return `"${text.replace(/"/g,'""')}"`
}
function downloadTextFile(filename:string,text:string,mimeType:string) {
  const blob=new Blob(['\ufeff',text],{type:mimeType}), url=URL.createObjectURL(blob), link=document.createElement('a')
  link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}


type ExternalImportStage = 'sources' | 'generic-file' | 'generic-preview' | 'dida-file' | 'dida-preview'
type DidaImportPreview = {
  fileName:string
  total:number
  tasks:Task[]
  tags:Tag[]
  duplicateCount:number
  skippedNoDate:number
  strippedAttachmentCount:number
  ignoredChecklistCount:number
}
function parseCsvRows(text:string): string[][] {
  const rows:string[][]=[]; let row:string[]=[], field='', quoted=false
  const pushField=()=>{ row.push(field); field='' }
  const pushRow=()=>{ pushField(); if(row.some(cell=>cell.length>0)) rows.push(row); row=[] }
  for(let i=0;i<text.length;i++){
    const ch=text[i]
    if(quoted){
      if(ch==='"' && text[i+1]==='"'){ field+='"'; i++ }
      else if(ch==='"') quoted=false
      else field+=ch
    } else {
      if(ch==='"') quoted=true
      else if(ch===',') pushField()
      else if(ch==='\n') pushRow()
      else if(ch==='\r') { if(text[i+1]==='\n') i++; pushRow() }
      else field+=ch
    }
  }
  if(field.length || row.length) pushRow()
  return rows
}
function genericDate(value:string) {
  const raw=value.trim()
  if(!raw) return ''
  const direct=raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if(direct) return `${direct[1]}-${direct[2].padStart(2,'0')}-${direct[3].padStart(2,'0')}`
  const parsed=new Date(raw)
  if(Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`
}
function genericHeaderIndex(header:string[], aliases:string[]) {
  const normalized=header.map(cell=>cell.trim().toLowerCase().replace(/[\s_-]+/g,''))
  for(const alias of aliases){
    const index=normalized.indexOf(alias.toLowerCase().replace(/[\s_-]+/g,''))
    if(index>=0) return index
  }
  return -1
}
function didaIso(value:string) {
  if(!value) return ''
  return value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
}
function zonedParts(value:string, timeZone:string) {
  if(!value) return null
  const date=new Date(didaIso(value))
  if(Number.isNaN(date.getTime())) return null
  try {
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timeZone||'UTC',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date)
    const get=(type:string)=>parts.find(part=>part.type===type)?.value ?? ''
    return { date:`${get('year')}-${get('month')}-${get('day')}`, time:`${get('hour')}:${get('minute')}` }
  } catch {
    return { date:date.toISOString().slice(0,10), time:date.toISOString().slice(11,16) }
  }
}
function cleanDidaContent(value:string) {
  const attachmentPattern=/!\[[^\]]*\]\([^)]*\)/g
  const matches=value.match(attachmentPattern)?.length ?? 0
  const text=value.replace(attachmentPattern,'').replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()
  return { text, removed:matches }
}
function parseDidaRecurrence(value:string): RecurrenceRule | undefined {
  if(!value) return undefined
  const parts=Object.fromEntries(value.split(';').map(piece=>{ const [key,...rest]=piece.split('='); return [key,rest.join('=')] }))
  const freq=(parts.FREQ||'').toUpperCase()
  const unit:RecurrenceUnit|undefined=freq==='DAILY'?'day':freq==='WEEKLY'?'week':freq==='MONTHLY'?'month':freq==='YEARLY'?'year':undefined
  if(!unit) return undefined
  const count=Number.parseInt(parts.COUNT||'',10)
  if(Number.isFinite(count) && count<=1) return undefined
  const interval=Math.max(1,Number.parseInt(parts.INTERVAL||'1',10)||1)
  const dayMap:Record<string,number>={MO:1,TU:2,WE:3,TH:4,FR:5,SA:6,SU:0}
  const weekdays=parts.BYDAY?.split(',').map(day=>dayMap[day]).filter(day=>day!==undefined)
  let end:RecurrenceEnd|undefined
  if(Number.isFinite(count) && count>1) end={type:'count',count}
  else if(/^\d{8}$/.test(parts.UNTIL||'')) end={type:'date',date:`${parts.UNTIL.slice(0,4)}-${parts.UNTIL.slice(4,6)}-${parts.UNTIL.slice(6,8)}`}
  return {unit,interval,...(weekdays?.length?{weekdays}:{}),...(end?{end}:{})}
}
function splitImportedTagNames(value:string) {
  return value.split(/[;,\n]+/).map(item=>item.trim()).filter(Boolean)
}


function syncEntityKey(entityType: SyncEntityType, entityId: string) {
  return `${entityType}:${entityId}`
}

function rowSyncId(entityType: SyncEntityType, row: any): string {
  return entityType === 'mood' ? String(row.date) : String(row.id)
}

async function recordSyncDiff(entityType: SyncEntityType, previousRows: any[], nextRows: any[]) {
  const deviceId = getOrCreateDeviceId()
  const previous = new Map(previousRows.map(row => [rowSyncId(entityType, row), row]))
  const next = new Map(nextRows.map(row => [rowSyncId(entityType, row), row]))
  const now = new Date().toISOString()

  for (const [id, row] of next) {
    const before = previous.get(id)
    if (before && JSON.stringify(before) === JSON.stringify(row)) continue
    await appendSyncChange({ entityType, entityId: id, operation: 'upsert', changedAt: now, deviceId })
  }

  for (const id of previous.keys()) {
    if (next.has(id)) continue
    const tombstone = { key: syncEntityKey(entityType, id), entityType, entityId: id, deletedAt: now, deviceId }
    await saveSyncTombstone(tombstone)
    await appendSyncChange({ entityType, entityId: id, operation: 'delete', changedAt: now, deviceId })
  }
}

function App() {
  const today = new Date()
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [moodMonth, setMoodMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [monthPickerTarget, setMonthPickerTarget] = useState<'calendar'|'mood'|null>(null)
  const [overdueInboxOpen, setOverdueInboxOpen] = useState(false)
  const [monthPickerYear, setMonthPickerYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [mainView, setMainView] = useState<'calendar' | 'statistics' | 'anniversaries' | 'settings'>('calendar')
  const [statsRange, setStatsRange] = useState<'week'|'month'|'30d'|'year'|'all'>('month')
  const [moodHeatmapYear, setMoodHeatmapYear] = useState<number>(() => today.getFullYear())
  const [wordCloudIgnored, setWordCloudIgnored] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('zing:wordCloudIgnored') || '[]') } catch { return [] }
  })
  const [wordIgnoreDraft, setWordIgnoreDraft] = useState('')
  const [wordIgnoreManagerOpen, setWordIgnoreManagerOpen] = useState(false)
  const [greeting, setGreeting] = useState(() => localStorage.getItem('zing:greeting') || 'Hello, Zing')
  const [weekStartsMonday, setWeekStartsMonday] = useState(() => localStorage.getItem('zing:weekStart') !== 'sunday')
  const [dateFormat, setDateFormat] = useState<'dmy'|'mdy'>(() => localStorage.getItem('zing:dateFormat') === 'mdy' ? 'mdy' : 'dmy')
  const [showEndedTasks, setShowEndedTasks] = useState(() => localStorage.getItem('zing:showEndedTasks') !== 'false')
  const [storageStats, setStorageStats] = useState({ total:0, images:0, audio:0, data:0, attachmentCount:0 })
  const [storageBrowser, setStorageBrowser] = useState<'image'|'audio'|null>(null)
  const [backupExporting, setBackupExporting] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [githubSyncOpen, setGithubSyncOpen] = useState(false)
  const [githubSyncOwner, setGithubSyncOwner] = useState(() => localStorage.getItem('zing:githubSyncOwner') || 'zzZing0-0')
  const [githubSyncRepo, setGithubSyncRepo] = useState(() => localStorage.getItem('zing:githubSyncRepo') || 'zing-calendar-data')
  const [githubSyncBranch, setGithubSyncBranch] = useState(() => localStorage.getItem('zing:githubSyncBranch') || 'main')
  const [githubSyncToken, setGithubSyncToken] = useState('')
  const [githubSyncBusy, setGithubSyncBusy] = useState(false)
  const [githubSyncMessage, setGithubSyncMessage] = useState('')
  const [githubSyncMessageKind, setGithubSyncMessageKind] = useState<'idle'|'working'|'success'|'error'>('idle')
  const [lastGithubSyncAt, setLastGithubSyncAt] = useState(() => localStorage.getItem('zing:lastGithubSyncAt') || '')
  const [backupPreview, setBackupPreview] = useState<BackupPreview|null>(null)
  const [backupRestoring, setBackupRestoring] = useState(false)
  const [resetDataConfirm, setResetDataConfirm] = useState(false)
  const [resettingData, setResettingData] = useState(false)
  const backupInputRef = useRef<HTMLInputElement|null>(null)
  const [externalImportOpen, setExternalImportOpen] = useState(false)
  const [externalImportStage, setExternalImportStage] = useState<ExternalImportStage>('sources')
  const [didaImportPreview, setDidaImportPreview] = useState<DidaImportPreview|null>(null)
  const [externalImportBusy, setExternalImportBusy] = useState(false)
  const [externalImportMessage, setExternalImportMessage] = useState('')
  const externalImportInputRef = useRef<HTMLInputElement|null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState<'all' | 'task' | 'journal' | 'anniversary'>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const selectedIsFuture = Boolean(selectedDate && toDateKey(selectedDate) > toDateKey(today))
  const [defaultPriority, setDefaultPriority] = useState<TaskPriority>(() => {
    const saved = Number(localStorage.getItem('zing:defaultPriority'))
    return ([0,1,2,3] as number[]).includes(saved) ? saved as TaskPriority : 1
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksHydrated, setTasksHydrated] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<string | null>(null)
  const [draft, setDraft] = useState<TaskDraft>(() => emptyDraft(today, defaultPriority))
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [dailyMoods, setDailyMoods] = useState<DailyMood[]>([])
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [anniversariesHydrated, setAnniversariesHydrated] = useState(false)
  const [anniversaryEditorOpen, setAnniversaryEditorOpen] = useState(false)
  const [editingAnniversaryId, setEditingAnniversaryId] = useState<string | null>(null)
  const [anniversaryDraft, setAnniversaryDraft] = useState<AnniversaryDraft>(() => emptyAnniversaryDraft(today))
  const [journalHydrated, setJournalHydrated] = useState(false)
  const [moodsHydrated, setMoodsHydrated] = useState(false)
  const [journalEditorOpen, setJournalEditorOpen] = useState(false)
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null)
  const [viewingJournalId, setViewingJournalId] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [journalDraft, setJournalDraft] = useState<JournalDraft>(() => emptyJournalDraft(today))
  const [tags, setTags] = useState<Tag[]>([DEFAULT_TAG])
  const [tagsHydrated, setTagsHydrated] = useState(false)
  const syncSnapshotsRef = useRef<Record<SyncEntityType, any[]>>({ task: [], journal: [], mood: [], tag: [], anniversary: [] })
  const syncSnapshotReadyRef = useRef<Record<SyncEntityType, boolean>>({ task: false, journal: false, mood: false, tag: false, anniversary: false })
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [newTagScope, setNewTagScope] = useState<TagScope>('both')
  const [openTagColorId, setOpenTagColorId] = useState<string | null>(null)
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null)
  const [dragOverTag, setDragOverTag] = useState<{id:string;position:'before'|'after'} | null>(null)
  const [seriesAction, setSeriesAction] = useState<'save' | 'delete' | null>(null)
  const [confirmSingleTask, setConfirmSingleTask] = useState(false)
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setRecordingSeconds(value => {
      if (value >= 1799) { window.setTimeout(stopJournalRecording, 0); return 1800 }
      return value + 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [recording, mediaRecorder])

  const openImagePreview = async (attachment: Attachment) => {
    const blob = await getAttachmentBlob(attachment.storageKey)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setImagePreview(current => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return { url, name: attachment.filename }
    })
  }

  const closeImagePreview = () => {
    setImagePreview(current => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
  }

  const openMonthPicker = (target:'calendar'|'mood') => {
    const source=target==='calendar'?visibleMonth:moodMonth
    setMonthPickerYear(source.getFullYear())
    setMonthPickerTarget(target)
  }
  const chooseMonth = (monthIndex:number) => {
    const next=new Date(monthPickerYear,monthIndex,1)
    if(monthPickerTarget==='calendar') setVisibleMonth(next)
    else if(monthPickerTarget==='mood') setMoodMonth(next)
    setMonthPickerTarget(null)
  }

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
  setJournalDraft({ date: entry.date, hasTime: Boolean(entry.time), time: entry.time ?? currentTime(), title: entry.title || entry.content.slice(0, 60) || '记录', content: entry.title ? entry.content : '', impact: entry.impact, tagIds: entry.tagIds?.length ? entry.tagIds : [DEFAULT_TAG_ID], attachments: entry.attachments ?? [] })
  setJournalEditorOpen(true)
  }

  const closeJournalEditor = () => {
  setJournalEditorOpen(false)
  setEditingJournalId(null)
  }

  const saveJournal = () => {
  const title = journalDraft.title.trim()
  if (!title) return
  const content = journalDraft.content.trim()
  const now = new Date().toISOString()
  const fields = {
    date: journalDraft.date, time: journalDraft.hasTime ? journalDraft.time || undefined : undefined,
    title, content, impact: journalDraft.impact,
    tagIds: journalDraft.tagIds.length ? journalDraft.tagIds : [DEFAULT_TAG_ID],
    attachments: journalDraft.attachments,
  }
  if (editingJournalId) {
    setJournalEntries(current => current.map(entry => entry.id === editingJournalId ? { ...entry, ...fields, updatedAt: now } : entry))
  } else {
    setJournalEntries(current => [...current, { id: crypto.randomUUID(), ...fields, createdAt: now, updatedAt: now }])
  }
  const entryDate = fromDateKey(journalDraft.date)
  setSelectedDate(entryDate)
  setVisibleMonth(new Date(entryDate.getFullYear(), entryDate.getMonth(), 1))
  closeJournalEditor()
  }

  const addJournalImages = async (files: FileList | null) => {
    if (!files?.length) return
    const room = Math.max(0, 9 - journalDraft.attachments.filter(a => a.type === 'image').length)
    const added: Attachment[] = []
    for (const file of Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, room)) {
      const blob = await compressImage(file)
      const id = crypto.randomUUID(), storageKey = `journal:${id}`
      await putAttachmentBlob(storageKey, blob)
      added.push({ id, type: 'image', filename: file.name, mimeType: blob.type || 'image/webp', size: blob.size, storageKey, createdAt: new Date().toISOString() })
    }
    if (added.length) setJournalDraft(current => ({ ...current, attachments: [...current.attachments, ...added] }))
  }

  const removeJournalAttachment = async (attachment: Attachment) => {
    await deleteAttachmentBlob(attachment.storageKey)
    setJournalDraft(current => ({ ...current, attachments: current.attachments.filter(item => item.id !== attachment.id) }))
  }

  const startJournalRecording = async () => {
    if (journalDraft.attachments.some(a => a.type === 'audio') || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const mimeType = preferredTypes.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      const startedAt = Date.now()
      recorder.ondataavailable = event => { if (event.data && event.data.size > 0) chunks.push(event.data) }
      recorder.onerror = () => {
        stream.getTracks().forEach(track => track.stop())
        setRecording(false); setMediaRecorder(null); setRecordingSeconds(0)
        window.alert('录音失败，请重新录制。')
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const duration = Math.max(0, Math.round((Date.now() - startedAt) / 1000))
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
        setRecording(false); setMediaRecorder(null); setRecordingSeconds(0)
        // Tiny container-only blobs (such as the previous 110 B file) contain no playable audio.
        if (duration < 1 || blob.size < 512) {
          window.alert('录音内容为空或时间太短，没有保存。请重新录制。')
          return
        }
        const id = crypto.randomUUID(), storageKey = `journal-audio:${id}`
        await putAttachmentBlob(storageKey, blob)
        const extension = blob.type.includes('mp4') ? 'm4a' : 'webm'
        setJournalDraft(current => ({ ...current, attachments: [...current.attachments.filter(a => a.type !== 'audio'), {
          id, type: 'audio', filename: `录音-${new Date().toLocaleString()}.${extension}`, mimeType: blob.type, size: blob.size,
          storageKey, duration, createdAt: new Date().toISOString(),
        }] }))
      }
      // A timeslice makes browsers flush audio chunks while recording instead of relying on one final event at stop.
      recorder.start(1000)
      setRecordingSeconds(0); setMediaRecorder(recorder); setRecording(true)
    } catch (error) {
      console.error('Failed to start recording', error)
      window.alert('无法开始录音，请检查麦克风权限。')
    }
  }

  const stopJournalRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.requestData() } catch {}
      window.setTimeout(() => { if (mediaRecorder.state !== 'inactive') mediaRecorder.stop() }, 80)
    }
  }

  const deleteJournal = (id: string) => {
    const entry = journalEntries.find(item => item.id === id)
    const stillReferenced = new Set<string>()
    tasks.forEach(task => {
      ;(task.attachments ?? []).forEach(a => stillReferenced.add(a.storageKey))
      Object.values(task.recurrenceExceptions ?? {}).forEach(exception => (exception.attachments ?? []).forEach(a => stillReferenced.add(a.storageKey)))
    })
    journalEntries.filter(item => item.id !== id).forEach(item => (item.attachments ?? []).forEach(a => stillReferenced.add(a.storageKey)))
    ;(entry?.attachments ?? []).forEach(a => { if (!stillReferenced.has(a.storageKey)) void deleteAttachmentBlob(a.storageKey) })
    setJournalEntries(current => current.filter(entry => entry.id !== id))
    setViewingJournalId(current => current === id ? null : current)
  }

  useEffect(() => {
    if (!tasksHydrated) return
    saveTasks(tasks).catch(error => console.error('Failed to save tasks to IndexedDB', error))
    if (!syncSnapshotReadyRef.current.task) {
      syncSnapshotsRef.current.task = tasks
      syncSnapshotReadyRef.current.task = true
    } else {
      const previous = syncSnapshotsRef.current.task
      syncSnapshotsRef.current.task = tasks
      void recordSyncDiff('task', previous, tasks).catch(error => console.error('Failed to record task sync changes', error))
    }
  }, [tasks, tasksHydrated])

  useEffect(() => {
    let active = true
    loadJournalEntries<JournalEntry>().then(rows => {
      if (!active) return
      setJournalEntries(rows.map(entry => entry.title ? entry : ({ ...entry, title: entry.content?.slice(0, 60) || '记录', content: '' })))
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
    loadAnniversaries<Anniversary>().then(rows => {
      if (!active) return
      setAnniversaries(rows)
      setAnniversariesHydrated(true)
    }).catch(error => {
      console.error('Failed to load anniversaries', error)
      if (active) setAnniversariesHydrated(true)
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
    if (!anniversariesHydrated) return
    saveAnniversaries(anniversaries).catch(error => console.error('Failed to save anniversaries', error))
    if (!syncSnapshotReadyRef.current.anniversary) {
      syncSnapshotsRef.current.anniversary = anniversaries
      syncSnapshotReadyRef.current.anniversary = true
    } else {
      const previous = syncSnapshotsRef.current.anniversary
      syncSnapshotsRef.current.anniversary = anniversaries
      void recordSyncDiff('anniversary', previous, anniversaries).catch(error => console.error('Failed to record anniversary sync changes', error))
    }
  }, [anniversaries, anniversariesHydrated])

  useEffect(() => {
    if (!journalHydrated) return
    saveJournalEntries(journalEntries).catch(error => console.error('Failed to save journal entries', error))
    if (!syncSnapshotReadyRef.current.journal) {
      syncSnapshotsRef.current.journal = journalEntries
      syncSnapshotReadyRef.current.journal = true
    } else {
      const previous = syncSnapshotsRef.current.journal
      syncSnapshotsRef.current.journal = journalEntries
      void recordSyncDiff('journal', previous, journalEntries).catch(error => console.error('Failed to record journal sync changes', error))
    }
  }, [journalEntries, journalHydrated])

  useEffect(() => {
    if (!tagsHydrated) return
    saveTags(tags).catch(error => console.error('Failed to save tags', error))
    if (!syncSnapshotReadyRef.current.tag) {
      syncSnapshotsRef.current.tag = tags
      syncSnapshotReadyRef.current.tag = true
    } else {
      const previous = syncSnapshotsRef.current.tag
      syncSnapshotsRef.current.tag = tags
      void recordSyncDiff('tag', previous, tags).catch(error => console.error('Failed to record tag sync changes', error))
    }
  }, [tags, tagsHydrated])

  useEffect(() => {
    if (!moodsHydrated) return
    saveDailyMoods(dailyMoods).catch(error => console.error('Failed to save daily moods', error))
    if (!syncSnapshotReadyRef.current.mood) {
      syncSnapshotsRef.current.mood = dailyMoods
      syncSnapshotReadyRef.current.mood = true
    } else {
      const previous = syncSnapshotsRef.current.mood
      syncSnapshotsRef.current.mood = dailyMoods
      void recordSyncDiff('mood', previous, dailyMoods).catch(error => console.error('Failed to record mood sync changes', error))
    }
  }, [dailyMoods, moodsHydrated])

  useEffect(() => { localStorage.setItem('zing:greeting', greeting || 'Hello, Zing') }, [greeting])
  useEffect(() => { localStorage.setItem('zing:weekStart', weekStartsMonday ? 'monday' : 'sunday') }, [weekStartsMonday])
  useEffect(() => { localStorage.setItem('zing:dateFormat', dateFormat) }, [dateFormat])
  useEffect(() => { localStorage.setItem('zing:showEndedTasks', String(showEndedTasks)) }, [showEndedTasks])
  useEffect(() => { localStorage.setItem('zing:defaultPriority', String(defaultPriority)) }, [defaultPriority])
  useEffect(() => { localStorage.setItem('zing:wordCloudIgnored', JSON.stringify(wordCloudIgnored)) }, [wordCloudIgnored])
  useEffect(() => { localStorage.setItem('zing:githubSyncOwner', githubSyncOwner) }, [githubSyncOwner])
  useEffect(() => { localStorage.setItem('zing:githubSyncRepo', githubSyncRepo) }, [githubSyncRepo])
  useEffect(() => { localStorage.setItem('zing:githubSyncBranch', githubSyncBranch) }, [githubSyncBranch])
  useEffect(() => {
    if (mainView !== 'settings' || !tasksHydrated || !journalHydrated) return
    const referencedKeys = new Set<string>()
    const add = (items?: Attachment[]) => (items ?? []).forEach(item => referencedKeys.add(item.storageKey))
    tasks.forEach(task => {
      add(task.attachments)
      Object.values(task.recurrenceExceptions ?? {}).forEach(exception => add(exception.attachments))
    })
    journalEntries.forEach(entry => add(entry.attachments))
    cleanupOrphanAttachmentBlobs([...referencedKeys])
      .then(() => getStorageStats())
      .then(setStorageStats)
      .catch(error => console.error('Failed to clean or calculate storage', error))
.catch(error => console.error('Failed to calculate storage', error))
  }, [mainView, tasks, journalEntries, dailyMoods, tags, anniversaries, tasksHydrated, journalHydrated])

  const displayWeekdays = useMemo(() => weekStartsMonday ? WEEKDAYS : [WEEKDAYS[6], ...WEEKDAYS.slice(0,6)], [weekStartsMonday])
  const formatUiDate = (date: Date) => dateFormat === 'mdy'
    ? `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
    : formatDate(date)
  const formatBytes = (bytes:number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
    if (bytes < 1024*1024*1024) return `${(bytes/1024/1024).toFixed(1)} MB`
    return `${(bytes/1024/1024/1024).toFixed(2)} GB`
  }

  const days = useMemo(
    () => buildMonth(visibleMonth.getFullYear(), visibleMonth.getMonth(), weekStartsMonday),
    [visibleMonth, weekStartsMonday],
  )

  const displayTasks = useMemo(() => {
    const start = toDateKey(days[0].date)
    const end = toDateKey(days[days.length - 1].date)
    const expanded = expandTasks(tasks, start, end)
    return showEndedTasks ? expanded : expanded.filter(task => task.status === 'todo')
  }, [tasks, days, showEndedTasks])

  const overdueTasks = useMemo(() => {
    const todayKey=toDateKey(today)
    const yesterday=addDaysKey(todayKey,-1)
    if(!tasks.length) return [] as Task[]
    const earliest=tasks.reduce((min,task)=>task.date<min?task.date:min,tasks[0].date)
    return expandTasks(tasks,earliest,yesterday)
      .filter(task=>isTaskOverdue(task,todayKey))
      .sort((a,b)=>taskEndDate(a).localeCompare(taskEndDate(b)) || b.priority-a.priority || a.title.localeCompare(b.title,'zh-CN'))
  },[tasks,today])

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return []
    const key = toDateKey(selectedDate)
    const pool = key >= toDateKey(days[0].date) && key <= toDateKey(days[days.length - 1].date) ? displayTasks : expandTasks(tasks, key, key)
    return pool.filter(task => taskCoversDate(task, key) && (showEndedTasks || task.status === 'todo')).sort(taskSort)
  }, [selectedDate, tasks, displayTasks, days, showEndedTasks])

  const anniversaryOccurrencesByDate = useMemo(() => {
    const map = new Map<string, { anniversary: Anniversary; occurrence: Date }[]>()
    const years = Array.from(new Set(days.map(day => day.date.getFullYear())))
    anniversaries.forEach(anniversary => years.forEach(year => {
      const occurrence = anniversaryOccurrence(anniversary, year)
      if (!occurrence) return
      const key = toDateKey(occurrence)
      const rows = map.get(key) ?? []
      rows.push({ anniversary, occurrence }); map.set(key, rows)
    }))
    return map
  }, [anniversaries, days])

  const selectedAnniversaries = useMemo(() => {
    if (!selectedDate) return []
    const key=toDateKey(selectedDate)
    const cached=anniversaryOccurrencesByDate.get(key)
    if (cached) return cached
    return anniversaries.map(anniversary => {
      const occurrence=anniversaryOccurrence(anniversary, selectedDate.getFullYear())
      return occurrence && toDateKey(occurrence)===key ? {anniversary, occurrence} : null
    }).filter(Boolean) as { anniversary: Anniversary; occurrence: Date }[]
  }, [selectedDate, anniversaries, anniversaryOccurrencesByDate])

  const selectedJournalEntries = useMemo(() => {
    if (!selectedDate) return []
    const key = toDateKey(selectedDate)
    return journalEntries.filter(entry => entry.date === key).sort((a, b) => {
      if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time)
      if (a.time !== b.time) return a.time ? -1 : 1
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [selectedDate, journalEntries])

  const viewingJournal = viewingJournalId ? journalEntries.find(entry => entry.id === viewingJournalId) ?? null : null
  const selectedMood = selectedDate ? dailyMoods.find(mood => mood.date === toDateKey(selectedDate)) : undefined
  const selectedImpactTotal = selectedJournalEntries.reduce((sum, entry) => sum + entry.impact, 0)
  const moodsByDate = useMemo(() => new Map(dailyMoods.map(mood => [mood.date, mood])), [dailyMoods])
  const journalDates = useMemo(() => new Set(journalEntries.map(entry => entry.date)), [journalEntries])
  const moodDays = useMemo(() => buildMonth(moodMonth.getFullYear(), moodMonth.getMonth(), weekStartsMonday), [moodMonth, weekStartsMonday])

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
  // Reserve exact physical multi-day lane indices for each date.
  const occupiedMultiLanesByDay = useMemo(() => days.map((_, dayIndex) => {
    const week = Math.floor(dayIndex / 7)
    const column = dayIndex % 7
    return new Set(multiDaySegments
      .filter(segment => segment.week === week && column >= segment.startColumn && column < segment.startColumn + segment.span)
      .map(segment => segment.lane)
      .filter(lane => lane >= 0 && lane < 5))
  }), [days, multiDaySegments])

  const endedTasksViewToggle = (className='') => (
    <label className={`ended-view-toggle ${className}`.trim()} title="显示或隐藏已完成和已放弃任务">
      <span>已结束</span>
      <input type="checkbox" checked={showEndedTasks} onChange={event=>setShowEndedTasks(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )

  const moveMonth = (offset: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const openMultiDaySegmentDate = (event: React.MouseEvent<HTMLButtonElement>, segment: MultiDaySegment) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    const relativeX = Math.max(0, Math.min(rect.width - 0.001, event.clientX - rect.left))
    const columnOffset = Math.min(segment.span - 1, Math.floor(relativeX / (rect.width / segment.span)))
    const dayIndex = segment.week * 7 + segment.startColumn + columnOffset
    const clickedDay = days[dayIndex]?.date
    if (clickedDay) openDay(clickedDay)
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

  const openAnniversaryEditor = (anniversary?: Anniversary) => {
    if (anniversary) {
      setEditingAnniversaryId(anniversary.id)
      setAnniversaryDraft({ title:anniversary.title, type:anniversary.type, calendar:anniversary.calendar, year:anniversary.year ? String(anniversary.year) : '', month:anniversary.month, day:anniversary.day, isLeapMonth:Boolean(anniversary.isLeapMonth), repeatYearly:anniversary.repeatYearly, notes:anniversary.notes ?? '' })
    } else {
      setEditingAnniversaryId(null)
      setAnniversaryDraft(emptyAnniversaryDraft(selectedDate ?? today))
    }
    setAnniversaryEditorOpen(true)
  }
  const saveAnniversary = () => {
    const title=anniversaryDraft.title.trim(); if (!title) return
    const now=new Date().toISOString()
    const fields={ title, type:anniversaryDraft.type, calendar:anniversaryDraft.calendar, year:anniversaryDraft.year ? Number(anniversaryDraft.year) : undefined, month:anniversaryDraft.month, day:anniversaryDraft.day, isLeapMonth:anniversaryDraft.calendar==='lunar' ? anniversaryDraft.isLeapMonth : undefined, repeatYearly:anniversaryDraft.repeatYearly, notes:anniversaryDraft.notes.trim() || undefined, updatedAt:now }
    if (editingAnniversaryId) setAnniversaries(cur=>cur.map(a=>a.id===editingAnniversaryId ? {...a,...fields}:a))
    else setAnniversaries(cur=>[...cur,{id:crypto.randomUUID(),...fields,createdAt:now}])
    setAnniversaryEditorOpen(false); setEditingAnniversaryId(null)
  }
  const deleteAnniversary = () => {
    if (!editingAnniversaryId) return
    setAnniversaries(cur=>cur.filter(a=>a.id!==editingAnniversaryId))
    setAnniversaryEditorOpen(false); setEditingAnniversaryId(null)
  }

  const openTaskEditor = () => {
    const date = selectedDate ?? today
    setEditingTaskId(null)
    setEditingOccurrenceDate(null)
    setDraft(emptyDraft(date, defaultPriority))
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
      attachments: task.attachments ?? [],
      ...draftRepeat(series),
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingTaskId(null)
    setEditingOccurrenceDate(null)
  }

  const saveTask = (scope: 'occurrence' | 'future' | 'series' = 'series') => {
    const title = draft.title.trim()
    if (!title) return
    const now = new Date().toISOString()
    const buildFields = (date: string, endDate?: string) => ({
      title, date, endDate,
      priority: draft.priority, allDay: draft.allDay,
      time: draft.allDay ? undefined : draft.time || undefined,
      deadline: draft.deadline || undefined, notes: draft.notes.trim() || undefined,
      tagIds: draft.tagIds.length ? draft.tagIds : [DEFAULT_TAG_ID],
      attachments: draft.attachments,
    })

    if (editingTaskId) {
      setTasks(current => {
        const series = current.find(task => task.id === editingTaskId)
        if (!series) return current
        const occurrence = editingOccurrenceDate && series.recurrence ? materializeOccurrence(series, editingOccurrenceDate) : null

        if (occurrence && scope === 'occurrence') {
          const exception: RecurrenceException = { ...buildFields(draft.date, draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined), updatedAt: now }
          return current.map(task => task.id === series.id
            ? { ...task, recurrenceExceptions: { ...task.recurrenceExceptions, [editingOccurrenceDate!]: exception }, updatedAt: now }
            : task)
        }

        if (occurrence && scope === 'future') {
          const splitDate = editingOccurrenceDate!
          const previousDate = addDaysKey(splitDate, -1)
          const oldExceptions = Object.fromEntries(Object.entries(series.recurrenceExceptions ?? {}).filter(([key]) => key < splitDate))
          const futureExceptions = Object.fromEntries(Object.entries(series.recurrenceExceptions ?? {}).filter(([key]) => key >= splitDate))

          // End the old series immediately before this occurrence. Its past history/exceptions remain intact.
          const oldSeries = normalizeSingleOccurrenceSeries({
            ...series,
            recurrence: series.recurrence ? { ...series.recurrence, end: { type: 'date', date: previousDate } } : undefined,
            recurrenceExceptions: oldExceptions,
            updatedAt: now,
          })

          // "不重复" from this occurrence forward means: keep this occurrence as one ordinary task,
          // and discard the future recurrence branch/exceptions.
          if (draft.repeatPreset === 'none') {
            const ordinary: Task = {
              ...series,
              ...buildFields(draft.date, draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined),
              id: crypto.randomUUID(), status: occurrence.status, completedAt: occurrence.completedAt,
              originalDate: draft.date, recurrence: undefined, recurrenceExceptions: undefined,
              createdAt: now, updatedAt: now,
            }
            return [...current.filter(task => task.id !== series.id), oldSeries, ordinary]
          }

          // Otherwise split into a new independent series beginning at the selected occurrence.
          const newSeries: Task = {
            ...series,
            ...buildFields(draft.date, draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined),
            id: crypto.randomUUID(), status: 'todo', completedAt: undefined,
            originalDate: draft.date, recurrence: recurrenceFromDraft(draft),
            recurrenceExceptions: futureExceptions, createdAt: now, updatedAt: now,
          }
          return [...current.filter(task => task.id !== series.id), oldSeries, newSeries]
        }

        // Whole-series edit. If Repeat becomes "不重复", this is a real conversion:
        // recurrence and every old occurrence exception are removed, so nothing can later "revive".
        const seriesDate = occurrence && draft.date === occurrence.date ? series.date : draft.date
        const seriesEndDate = occurrence && (draft.endDate || '') === (occurrence.endDate || '')
          ? series.endDate
          : (draft.endDate && draft.endDate > seriesDate ? draft.endDate : undefined)
        const seriesDraft: TaskDraft = { ...draft, date: seriesDate, endDate: seriesEndDate ?? '' }
        const nextRecurrence = recurrenceFromDraft(seriesDraft)
        return current.map(task => task.id === series.id ? normalizeSingleOccurrenceSeries({
          ...task, ...buildFields(seriesDate, seriesEndDate),
          recurrence: nextRecurrence,
          recurrenceExceptions: nextRecurrence ? task.recurrenceExceptions : undefined,
          updatedAt: now,
        }) : task)
      })
    } else {
      const task: Task = {
        id: crypto.randomUUID(),
        ...buildFields(draft.date, draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined),
        status: 'todo', originalDate: draft.date, recurrence: recurrenceFromDraft(draft),
        createdAt: now, updatedAt: now,
      }
      setTasks(current => [...current, normalizeSingleOccurrenceSeries(task)])
    }

    const taskDate = fromDateKey(draft.date)
    setSelectedDate(taskDate)
    setVisibleMonth(new Date(taskDate.getFullYear(), taskDate.getMonth(), 1))
    closeEditor()
  }

  const convertOccurrenceToSingleTask = () => {
    if (!editingTaskId || !editingOccurrenceDate) return
    const title = draft.title.trim()
    if (!title) return
    const now = new Date().toISOString()
    setTasks(current => {
      const series = current.find(task => task.id === editingTaskId)
      if (!series?.recurrence) return current
      const occurrence = materializeOccurrence(series, editingOccurrenceDate)
      if (!occurrence) return current
      const previousDate = addDaysKey(editingOccurrenceDate, -1)
      const oldExceptions = Object.fromEntries(
        Object.entries(series.recurrenceExceptions ?? {}).filter(([key]) => key < editingOccurrenceDate)
      )
      const oldSeries = normalizeSingleOccurrenceSeries({
        ...series,
        recurrence: { ...series.recurrence, end: { type: 'date', date: previousDate } },
        recurrenceExceptions: oldExceptions,
        updatedAt: now,
      })
      const ordinary: Task = {
        ...occurrence,
        id: crypto.randomUUID(),
        seriesId: undefined,
        occurrenceDate: undefined,
        title,
        date: draft.date,
        endDate: draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined,
        priority: draft.priority,
        allDay: draft.allDay,
        time: draft.allDay ? undefined : draft.time || undefined,
        deadline: draft.deadline || undefined,
        notes: draft.notes.trim() || undefined,
        tagIds: draft.tagIds.length ? draft.tagIds : [DEFAULT_TAG_ID],
        attachments: draft.attachments,
        originalDate: draft.date,
        recurrence: undefined,
        recurrenceExceptions: undefined,
        createdAt: now,
        updatedAt: now,
      }
      return [...current.filter(task => task.id !== series.id), oldSeries, ordinary]
    })
    setConfirmSingleTask(false)
    closeEditor()
  }

  const setTaskStatus = (task: Task, status: TaskStatus) => {
    const now = new Date().toISOString()
    const completedAt = status === 'completed' ? now : undefined
    if (task.seriesId && task.occurrenceDate) {
      setTasks(current => current.map(series => series.id === task.seriesId ? {
        ...series,
        recurrenceExceptions: { ...series.recurrenceExceptions, [task.occurrenceDate!]: { ...series.recurrenceExceptions?.[task.occurrenceDate!], status, completedAt, updatedAt: now } },
        updatedAt: now,
      } : series))
    } else setTasks(current => current.map(item => item.id === task.id ? { ...item, status, completedAt, updatedAt: now } : item))
  }

  const postponeTask = (task: Task, newDate: string) => {
    if (!newDate || newDate <= task.date) return
    const now = new Date().toISOString()
    const duration = dayDiff(task.date, taskEndDate(task))
    const event: PostponeEvent = { from: task.date, to: newDate, at: now }
    if (task.seriesId && task.occurrenceDate) {
      setTasks(current => current.map(series => series.id === task.seriesId ? {
        ...series,
        recurrenceExceptions: {
          ...series.recurrenceExceptions,
          [task.occurrenceDate!]: {
            ...series.recurrenceExceptions?.[task.occurrenceDate!],
            date: newDate,
            endDate: duration > 0 ? addDaysKey(newDate, duration) : undefined,
            postponeHistory: [...(task.postponeHistory ?? []), event], updatedAt: now,
          },
        }, updatedAt: now,
      } : series))
    } else setTasks(current => current.map(item => item.id === task.id ? {
      ...item, originalDate: item.originalDate ?? item.date, date: newDate,
      endDate: duration > 0 ? addDaysKey(newDate, duration) : undefined,
      postponeHistory: [...(item.postponeHistory ?? []), event], updatedAt: now,
    } : item))
  }

  const addTaskImages = async (files: FileList | null) => {
    if (!files?.length) return
    const added: Attachment[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const blob = await compressImage(file)
      const id = crypto.randomUUID()
      const storageKey = `attachment:${id}`
      await putAttachmentBlob(storageKey, blob)
      added.push({ id, type: 'image', filename: file.name, mimeType: blob.type || 'image/webp', size: blob.size, storageKey, createdAt: new Date().toISOString() })
    }
    if (added.length) setDraft(current => ({ ...current, attachments: [...current.attachments, ...added] }))
  }

  const removeTaskImage = async (attachment: Attachment) => {
    await deleteAttachmentBlob(attachment.storageKey)
    setDraft(current => ({ ...current, attachments: current.attachments.filter(item => item.id !== attachment.id) }))
  }

  const deleteTask = (task: Task, scope: 'occurrence' | 'future' | 'series' = 'series') => {
    const seriesId = task.seriesId ?? task.id
    const occurrenceDate = task.occurrenceDate
    const now = new Date().toISOString()
    if (occurrenceDate && scope === 'occurrence') {
      setTasks(current => current.map(series => series.id === seriesId ? {
        ...series,
        recurrenceExceptions: { ...series.recurrenceExceptions, [occurrenceDate]: { ...series.recurrenceExceptions?.[occurrenceDate], deleted: true, updatedAt: now } },
        updatedAt: now,
      } : series))
      return
    }
    if (occurrenceDate && scope === 'future') {
      const previousDate = addDaysKey(occurrenceDate, -1)
      setTasks(current => current.map(series => series.id === seriesId ? normalizeSingleOccurrenceSeries({
        ...series,
        recurrence: series.recurrence ? { ...series.recurrence, end: { type: 'date', date: previousDate } } : undefined,
        recurrenceExceptions: Object.fromEntries(Object.entries(series.recurrenceExceptions ?? {}).filter(([key]) => key < occurrenceDate)),
        updatedAt: now,
      }) : series))
      return
    }
    setTasks(current => {
      const next = current.filter(item => item.id !== seriesId)
      const stillReferenced = new Set<string>()
      next.forEach(item => {
        ;(item.attachments ?? []).forEach(a => stillReferenced.add(a.storageKey))
        Object.values(item.recurrenceExceptions ?? {}).forEach(exception => (exception.attachments ?? []).forEach(a => stillReferenced.add(a.storageKey)))
      })
      journalEntries.forEach(entry => (entry.attachments ?? []).forEach(a => stillReferenced.add(a.storageKey)))
      const removed = current.find(item => item.id === seriesId)
      const candidates = new Set<string>()
      ;(removed?.attachments ?? []).forEach(a => candidates.add(a.storageKey))
      Object.values(removed?.recurrenceExceptions ?? {}).forEach(exception => (exception.attachments ?? []).forEach(a => candidates.add(a.storageKey)))
      candidates.forEach(key => { if (!stillReferenced.has(key)) void deleteAttachmentBlob(key) })
      return next
    })
  }

  const stopRepeating = (series: Task, occurrenceDate: string) => {
    const now = new Date().toISOString()
    setTasks(current => current.map(item => item.id === series.id ? normalizeSingleOccurrenceSeries({
      ...item,
      recurrence: item.recurrence ? { ...item.recurrence, end: { type: 'date', date: occurrenceDate } } : undefined,
      recurrenceExceptions: Object.fromEntries(Object.entries(item.recurrenceExceptions ?? {}).filter(([key]) => key <= occurrenceDate)),
      updatedAt: now,
    }) : item))
    closeEditor()
  }

  const toggleDraftTag = (kind: 'task' | 'journal', id: string) => {
    const update = (ids: string[]) => {
      const managed = ids.filter(isImportSourceTagId)
      const real = ids.filter(tagId => tagId !== DEFAULT_TAG_ID && !isImportSourceTagId(tagId))
      if (id === DEFAULT_TAG_ID) return [DEFAULT_TAG_ID, ...managed]
      const next = real.includes(id) ? real.filter(tagId => tagId !== id) : [...real, id]
      return next.length ? [...next, ...managed] : [DEFAULT_TAG_ID, ...managed]
    }
    if (kind === 'task') setDraft(current => ({ ...current, tagIds: update(current.tagIds) }))
    else setJournalDraft(current => ({ ...current, tagIds: update(current.tagIds) }))
  }

  const addTag = () => {
    const name = newTagName.trim()
    if (!name || tags.some(tag => tag.name.toLowerCase() === name.toLowerCase())) return
    setTags(current => [...current, { id: crypto.randomUUID(), name, color: newTagColor, scope: newTagScope, sortOrder: Math.max(-1, ...current.filter(tag => !tag.system).map(tag => tag.sortOrder ?? 0)) + 1 }])
    setNewTagName('')
  }

  const setTagArchived = (id: string, archived: boolean) => {
    const archivedAt = archived ? toDateKey(new Date()) : undefined
    setTags(current => current.map(tag => tag.id === id ? { ...tag, archived, archivedAt } : tag))
  }

  const deleteTag = (id: string) => {
    if (id === DEFAULT_TAG_ID || tags.find(tag=>tag.id===id)?.system) return
    setTags(current => current.filter(tag => tag.id !== id))
    const clean = (ids?: string[]) => {
      const next = (ids ?? []).filter(tagId => tagId !== id && tagId !== DEFAULT_TAG_ID)
      return next.length ? next : [DEFAULT_TAG_ID]
    }
    setTasks(current => current.map(task => ({ ...task, tagIds: clean(task.tagIds) })))
    setJournalEntries(current => current.map(entry => ({ ...entry, tagIds: clean(entry.tagIds) })))
  }

  const tagsFor = (kind: 'task' | 'journal') => tags.filter(tag => !isImportSourceTag(tag) && !tag.archived && (tag.scope === 'both' || tag.scope === kind)).sort((a, b) => Number(b.id === DEFAULT_TAG_ID) - Number(a.id === DEFAULT_TAG_ID))

  const managedTags = useMemo(() => tags
    .filter(tag => tag.id !== DEFAULT_TAG_ID && !isImportSourceTag(tag))
    .sort((a,b) => Number(Boolean(a.archived)) - Number(Boolean(b.archived)) || (a.sortOrder ?? tags.indexOf(a)) - (b.sortOrder ?? tags.indexOf(b))), [tags])

  const tagDateFromKey = (key:string) => {
    const [year,month,day] = key.split('-').map(Number)
    if (!year || !month || !day) return null
    const date = new Date(year,month-1,day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const tagUsage = useMemo(() => {
    const usage = new Map<string,{tasks:number;journals:number;days:number}>()
    managedTags.forEach(tag => {
      const taskRows = tasks.filter(task => (task.tagIds ?? [DEFAULT_TAG_ID]).includes(tag.id))
      const journalRows = journalEntries.filter(entry => (entry.tagIds ?? [DEFAULT_TAG_ID]).includes(tag.id))
      const days = new Set<string>()
      taskRows.forEach(task => {
        const start = tagDateFromKey(task.date), end = tagDateFromKey(taskEndDate(task))
        if (!start || !end) { days.add(task.date); return }
        for (let cursor=new Date(start); cursor<=end; cursor.setDate(cursor.getDate()+1)) days.add(toDateKey(cursor))
      })
      journalRows.forEach(entry => days.add(entry.date))
      usage.set(tag.id,{tasks:taskRows.length,journals:journalRows.length,days:days.size})
    })
    return usage
  },[managedTags,tasks,journalEntries])

  const moveManagedTag = (dragId:string,targetId:string,position:'before'|'after') => {
    if (dragId===targetId) return
    const ids=managedTags.map(tag=>tag.id)
    const from=ids.indexOf(dragId)
    if (from<0) return
    ids.splice(from,1)
    const targetIndex=ids.indexOf(targetId)
    if (targetIndex<0) return
    ids.splice(position==='after' ? targetIndex+1 : targetIndex,0,dragId)
    const order=new Map(ids.map((id,index)=>[id,index]))
    setTags(current=>current.map(tag=>order.has(tag.id)?{...tag,sortOrder:order.get(tag.id)}:tag))
  }

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase()

  const searchSnippet = (text: string) => {
    const clean = text.replace(/[#>*_`~\[\]()!-]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (!clean) return ''
    const index = clean.toLocaleLowerCase().indexOf(normalizedSearch)
    if (index < 0) return clean.slice(0, 100)
    const from = Math.max(0, index - 22)
    const to = Math.min(clean.length, index + normalizedSearch.length + 34)
    return `${from > 0 ? '…' : ''}${clean.slice(from, to)}${to < clean.length ? '…' : ''}`
  }

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

  type SearchResult =
    | { kind:'task'; id:string; title:string; date:string; snippet:string; item:Task }
    | { kind:'journal'; id:string; title:string; date:string; snippet:string; item:JournalEntry }
    | { kind:'anniversary'; id:string; title:string; date:string; snippet:string; item:Anniversary; nextOccurrence?:Date }
    | { kind:'tag'; id:string; title:string; date:string; snippet:string; item:Tag }

  const tagSearchMode = normalizedSearch.startsWith('#')
  const tagSearchTerm = tagSearchMode ? normalizedSearch.slice(1).trim() : ''

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!normalizedSearch) return []
    if (tagSearchMode) {
      return managedTags
        .filter(tag => !tagSearchTerm || tag.name.toLocaleLowerCase().includes(tagSearchTerm))
        .map(tag => {
          const usage=tagUsage.get(tag.id) ?? {tasks:0,journals:0,days:0}
          return {kind:'tag' as const,id:tag.id,title:`#${tag.name}`,date:'',snippet:`任务 ${usage.tasks} · 记录 ${usage.journals} · ${usage.days}天`,item:tag}
        })
    }
    const results: SearchResult[] = []
    if (searchFilter === 'all' || searchFilter === 'task') tasks.forEach(task => {
      const hay = `${task.title} ${task.notes ?? ''}`.toLocaleLowerCase()
      if (hay.includes(normalizedSearch)) results.push({ kind:'task', id:task.id, title:task.title, date:task.date, snippet:searchSnippet(task.notes ?? ''), item:task })
    })
    if (searchFilter === 'all' || searchFilter === 'journal') journalEntries.forEach(entry => {
      const hay = `${entry.title} ${entry.content}`.toLocaleLowerCase()
      if (hay.includes(normalizedSearch)) results.push({ kind:'journal', id:entry.id, title:entry.title, date:entry.date, snippet:searchSnippet(entry.content), item:entry })
    })
    if (searchFilter === 'all' || searchFilter === 'anniversary') anniversaries.forEach(anniversary => {
      const hay = `${anniversary.title} ${anniversary.notes ?? ''}`.toLocaleLowerCase()
      if (hay.includes(normalizedSearch)) {
        const candidateYear = Math.max(today.getFullYear(), anniversary.year ?? today.getFullYear())
        let occurrence = anniversaryOccurrence(anniversary, candidateYear)
        if (!occurrence || occurrence < new Date(today.getFullYear(), today.getMonth(), today.getDate())) occurrence = anniversaryOccurrence(anniversary, candidateYear+1)
        const sortDate = occurrence ? toDateKey(occurrence) : (anniversary.year ? `${anniversary.year}-${String(anniversary.month).padStart(2,'0')}-${String(anniversary.day).padStart(2,'0')}` : '')
        results.push({ kind:'anniversary', id:anniversary.id, title:anniversary.title, date:sortDate, snippet:searchSnippet(anniversary.notes ?? ''), item:anniversary, nextOccurrence:occurrence ?? undefined })
      }
    })
    return results.sort((a,b) => b.date.localeCompare(a.date))
  }, [normalizedSearch, tagSearchMode, tagSearchTerm, searchFilter, tasks, journalEntries, anniversaries, managedTags, tagUsage])

  const searchDateLabel = (result: SearchResult) => {
    if (result.kind === 'tag') return ''
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

  const searchMarker = (result: SearchResult) => {
    if (result.kind === 'tag') return <span className="search-tag-marker" style={{background:result.item.color}} />
    if (result.kind === 'task') return <span className={`search-task-marker priority-${result.item.priority} status-${result.item.status}`}>{result.item.status === 'completed' ? '✓' : result.item.status === 'abandoned' ? '×' : ''}</span>
    if (result.kind === 'journal') return <span className={`search-journal-marker impact-${result.item.impact}`} />
    return <span className="search-anniversary-marker">{anniversaryIcon(result.item.type)}</span>
  }

  const openTaskAtItsDay = (task:Task) => {
    const [year,month,day]=task.date.split('-').map(Number)
    const date=new Date(year,month-1,day)
    setMainView('calendar')
    setVisibleMonth(new Date(year,month-1,1))
    setSelectedDate(date)
    setOverdueInboxOpen(false)
    window.setTimeout(()=>editTask(task),0)
  }

  const openSearchResult = (result: SearchResult) => {
    if (result.kind === 'tag') return
    setSearchOpen(false)
    if (result.kind === 'task' || result.kind === 'journal') {
      const dateKey=result.kind==='task' ? result.item.date : result.item.date
      const [year,month,day]=dateKey.split('-').map(Number)
      const date=new Date(year,month-1,day)
      setMainView('calendar')
      setVisibleMonth(new Date(date.getFullYear(),date.getMonth(),1))
      setSelectedDate(date)
      window.setTimeout(()=>{
        if(result.kind==='task') editTask(result.item)
        else setViewingJournalId(result.id)
      },0)
    } else openAnniversaryEditor(result.item)
  }

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) setSearchOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const statistics = useMemo(() => {
    const todayKey = toDateKey(today)
    const startOfMonth = toDateKey(new Date(today.getFullYear(), today.getMonth(), 1))
    const weekOffset = weekStartsMonday ? (today.getDay()+6)%7 : today.getDay()
    const startOfWeek = toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate()-weekOffset))
    const start30 = toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29))
    const startYear = `${today.getFullYear()}-01-01`
    const rangeStart = statsRange==='week' ? startOfWeek : statsRange==='month' ? startOfMonth : statsRange==='30d' ? start30 : statsRange==='year' ? startYear : '0000-01-01'
    const inRange = (key?:string) => Boolean(key && key >= rangeStart && key <= todayKey)
    const taskOrigin = (task:Task) => task.originalDate ?? task.occurrenceDate ?? task.date
    const taskOriginalEnd = (task:Task) => {
      const origin = taskOrigin(task)
      const duration = Math.max(0, dayDiff(task.date, taskEndDate(task)))
      return addDaysKey(origin, duration)
    }

    // Expand recurring tasks only across the selected historical window, then use original planned date as cohort.
    const earliestTaskDate = tasks.length ? tasks.reduce((min,task)=>task.date<min?task.date:min,tasks[0].date) : todayKey
    const statsTasks = expandTasks(tasks, rangeStart==='0000-01-01' ? earliestTaskDate : rangeStart, todayKey)
      .filter(task => inRange(taskOrigin(task)))
    const eligibleTasks = statsTasks.filter(task => task.status!=='todo' || taskEndDate(task) <= todayKey)
    const completed = eligibleTasks.filter(task=>task.status==='completed').length
    const abandoned = eligibleTasks.filter(task=>task.status==='abandoned').length
    const overdue = eligibleTasks.filter(task=>task.status==='todo').length
    const completionRate = eligibleTasks.length ? completed/eligibleTasks.length : 0

    const postponedTasks = eligibleTasks.filter(task=>(task.postponeHistory?.length ?? 0)>0)
    const postponeEvents = eligibleTasks.flatMap(task=>task.postponeHistory ?? [])
    const postponeRate = eligibleTasks.length ? postponedTasks.length/eligibleTasks.length : 0
    const maxPostponeCount = eligibleTasks.reduce((max,task)=>Math.max(max,task.postponeHistory?.length ?? 0),0)
    const postponeDays = (task:Task) => Math.max(0, dayDiff(taskOriginalEnd(task), taskEndDate(task)))
    const maxPostponeDays = eligibleTasks.reduce((max,task)=>Math.max(max,postponeDays(task)),0)

    const completedByDay = new Map<string,number>()
    statsTasks.forEach(task=>{ if(task.completedAt){
      const key=toDateKey(new Date(task.completedAt))
      if(inRange(key)) completedByDay.set(key,(completedByDay.get(key)??0)+1)
    }})
    const rawCompletedTrend = [...completedByDay.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
    const completionTrend = (() => {
      if (statsRange==='all') {
        if (!rawCompletedTrend.length) return []
        const first=rawCompletedTrend[0][0], last=todayKey
        const totalDays=Math.max(1,dayDiff(first,last)+1)
        const bucketCount=Math.max(10,Math.min(20,Math.ceil(totalDays/75)))
        const bucketDays=Math.max(1,Math.ceil(totalDays/bucketCount))
        const buckets=Array.from({length:bucketCount},(_,index)=>{
          const start=addDaysKey(first,index*bucketDays)
          const end=index===bucketCount-1 ? last : addDaysKey(first,Math.min(totalDays-1,(index+1)*bucketDays-1))
          return {key:`${start}:${end}`,start,end,count:0,label:`${Number(start.slice(5,7))}/${Number(start.slice(8,10))}`}
        }).filter(bucket=>bucket.start<=last)
        rawCompletedTrend.forEach(([date,count])=>{
          const index=Math.min(buckets.length-1,Math.max(0,Math.floor(dayDiff(first,date)/bucketDays)))
          if(buckets[index]) buckets[index].count+=count
        })
        return buckets
      }
      const grouped=new Map<string,number>()
      rawCompletedTrend.forEach(([date,count])=>{
        const key = statsRange==='year' ? date.slice(0,7) : date
        grouped.set(key,(grouped.get(key)??0)+count)
      })
      return [...grouped.entries()].map(([key,count])=>({
        key,count,
        label: statsRange==='year' ? `${Number(key.slice(5,7))}月` : `${Number(key.slice(5,7))}/${Number(key.slice(8,10))}`
      }))
    })()
    const mostPostponedTask = [...eligibleTasks].sort((a,b)=>(b.postponeHistory?.length??0)-(a.postponeHistory?.length??0))[0]
    const longestPostponedTask = [...eligibleTasks].sort((a,b)=>postponeDays(b)-postponeDays(a))[0]

    const journals = journalEntries.filter(entry=>inRange(entry.date))
    const moods = dailyMoods.filter(mood=>inRange(mood.date))
    const journalDays = new Set(journals.map(entry=>entry.date)).size
    const moodDays = new Set(moods.map(mood=>mood.date)).size
    const impactCounts = [-2,-1,0,1,2].map(value=>({value:value as JournalImpact,count:journals.filter(j=>j.impact===value).length}))
    const moodCounts = [1,2,3,4,5].map(value=>({value:value as MoodLevel,count:moods.filter(m=>m.level===value).length}))
    const priorityCounts = [3,2,1,0].map(value=>({value:value as TaskPriority,count:eligibleTasks.filter(t=>t.priority===value).length}))

    const tagRows = managedTags.map(tag=>{
      const tagTasks=eligibleTasks.filter(task=>(task.tagIds??[DEFAULT_TAG_ID]).includes(tag.id))
      const tagJournals=journals.filter(entry=>(entry.tagIds??[DEFAULT_TAG_ID]).includes(tag.id))
      const tagPostponed=tagTasks.filter(task=>(task.postponeHistory?.length??0)>0)
      const impacts=[-2,-1,0,1,2].map(value=>({value:value as JournalImpact,count:tagJournals.filter(j=>j.impact===value).length}))
      const days=new Set<string>()
      tagTasks.forEach(task=>days.add(taskOrigin(task)))
      tagJournals.forEach(entry=>days.add(entry.date))
      const tagCompleted=tagTasks.filter(t=>t.status==='completed').length
      const tagMoodDates=new Set(tagJournals.map(entry=>entry.date))
      const tagMoods=moods.filter(mood=>tagMoodDates.has(mood.date))
      const moodDistribution=[1,2,3,4,5].map(value=>({value:value as MoodLevel,count:tagMoods.filter(m=>m.level===value).length}))
      return {
        tag, tasks:tagTasks.length, journals:tagJournals.length, days:days.size,
        completed:tagCompleted,
        completionRate:tagTasks.length ? tagCompleted/tagTasks.length : 0,
        postponeTasks:tagPostponed.length,
        postponeRate:tagTasks.length ? tagPostponed.length/tagTasks.length : 0,
        postponeCount:tagTasks.reduce((sum,t)=>sum+(t.postponeHistory?.length??0),0),
        maxPostponeDays:tagTasks.reduce((max,t)=>Math.max(max,postponeDays(t)),0),
        impacts,moodDistribution,moodSample:tagMoods.length,
      }
    }).filter(row=>row.tasks||row.journals)
    const mostPostponedTag = [...tagRows]
      .filter(row=>row.tasks>=3 && row.postponeTasks>0)
      .sort((a,b)=>b.postponeRate-a.postponeRate || b.postponeTasks-a.postponeTasks)[0]


    // Tag × Task has two modes:
    // "全部" = lifecycle view; shorter ranges = activity only inside the selected range.
    const tagTimelineAll = statsRange === 'all'
    const timelineStart = tagTimelineAll ? earliestTaskDate : rangeStart
    const timelineEnd = todayKey
    const timelineTasks = expandTasks(tasks, timelineStart, timelineEnd).filter(task=>taskOrigin(task)<=todayKey)
    const tagTaskTimelines = managedTags.map(tag=>{
      const archiveEnd = tag.archived && tag.archivedAt && tag.archivedAt < todayKey ? tag.archivedAt : todayKey
      const endKey = tagTimelineAll ? archiveEnd : (archiveEnd < todayKey ? archiveEnd : todayKey)
      const tagged = timelineTasks.filter(task=>{
        if (!(task.tagIds??[DEFAULT_TAG_ID]).includes(tag.id)) return false
        const taskStart = task.date
        const taskEnd = taskEndDate(task)
        return taskStart <= endKey && taskEnd >= timelineStart
      })
      if (!tagged.length) return {tag, completed:0, firstDate:'', endKey, days:[] as {date:string,count:number}[]}
      const historicalFirst = tagged.reduce((min,task)=>taskOrigin(task)<min?taskOrigin(task):min,taskOrigin(tagged[0]))
      const firstDate = tagTimelineAll ? historicalFirst : timelineStart
      const counts=new Map<string,number>()
      tagged.forEach(task=>{
        const start = task.date < timelineStart ? timelineStart : task.date
        const end = taskEndDate(task) > endKey ? endKey : taskEndDate(task)
        if(start>end) return
        for(let key=start; key<=end; key=addDaysKey(key,1)) counts.set(key,(counts.get(key)??0)+1)
      })
      const completed = tagged.filter(task=>task.status==='completed' && inRange(taskOrigin(task))).length
      return {tag, completed, firstDate, endKey, days:[...counts].map(([date,count])=>({date,count}))}
    }).filter(row=>row.firstDate && row.days.length)
    const effectiveTimelineStart = tagTimelineAll && tagTaskTimelines.length
      ? tagTaskTimelines.reduce((min,row)=>row.firstDate<min?row.firstDate:min,tagTaskTimelines[0].firstDate)
      : timelineStart
    const timelineSpan = Math.max(1,dayDiff(effectiveTimelineStart,todayKey))

    // Word cloud tokenizer: prefer the browser's mature Intl.Segmenter for Chinese word boundaries.
    // Fallback avoids the old overlapping-bigram behaviour that produced fragments such as “始前 / 程没”.
    const stop = new Set([
      '今天','然后','就是','这个','那个','一个','还是','但是','因为','所以','感觉','觉得','可以','没有','不是','自己','我们','你们','他们','她们',
      '现在','时候','什么','怎么','已经','可能','其实','比较','非常','一下','一些','一点','这样','那样','这里','那里','起来','的话','东西','事情',
      '之前','之后','前面','后面','开始','最后','真的','应该','需要','还有','以及','而且','或者','如果','虽然','不过','只是','一直','一次','有点',
      'and','the','that','this','with','have','was','were','but','for','you','your','are'
    ])
    wordCloudIgnored.forEach(word=>stop.add(word.trim().toLowerCase()))
    const fallbackWords = new Set([
      '记录','任务','科研','论文','数据','实验','英语','学习','小说','工作','医院','临床','报告','病人','医生','老师','师妹','师姐','导师',
      '心情','睡觉','睡眠','游戏','电脑','网站','代码','标签','日历','统计','词云','完成','延期','优先级','时间','今天','明天','昨天',
      '生活','运动','阅读','求职','毕业','投稿','修改','整理','分析','结果','问题','功能','设置','同步','备份','恢复','导入','导出'
    ])
    const fallbackChinese = (run:string) => {
      const result:string[]=[]; let index=0
      while(index<run.length){
        let matched=''
        for(let size=Math.min(4,run.length-index);size>=2;size--){
          const candidate=run.slice(index,index+size)
          if(fallbackWords.has(candidate)){matched=candidate;break}
        }
        if(matched){result.push(matched);index+=matched.length}
        else index+=1
      }
      return result
    }
    const segmentChinese = (source:string) => {
      const tokens:string[]=[]
      const SegmenterCtor=(Intl as any).Segmenter
      if(SegmenterCtor){
        const segmenter=new SegmenterCtor('zh-CN',{granularity:'word'})
        for(const item of segmenter.segment(source)){
          const word=String(item.segment).trim().toLowerCase()
          if(item.isWordLike && /[\u4e00-\u9fff]/.test(word) && word.length>=2) tokens.push(word)
        }
        return tokens
      }
      ;(source.match(/[\u4e00-\u9fff]{2,}/g)??[]).forEach(run=>tokens.push(...fallbackChinese(run)))
      return tokens
    }
    const wordCounts=new Map<string,number>()
    journals.forEach(entry=>{
      const source=`${entry.title} ${entry.content}`.replace(/[#>*_`~\[\]()!]/g,' ')
      const latin=source.toLowerCase().match(/[a-z][a-z'-]{2,}/g)??[]
      latin.forEach(word=>{if(!stop.has(word))wordCounts.set(word,(wordCounts.get(word)??0)+1)})
      segmentChinese(source).forEach(word=>{if(!stop.has(word))wordCounts.set(word,(wordCounts.get(word)??0)+1)})
    })
    const words=[...wordCounts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'zh-CN')).slice(0,36).map(([word,count])=>({word,count}))

    const moodLinePoints = [...moods].sort((a,b)=>a.date.localeCompare(b.date)).map(mood=> {
      const span = Math.max(1, dayDiff(rangeStart==='0000-01-01' ? mood.date : rangeStart, todayKey))
      const offset = rangeStart==='0000-01-01' ? 0 : Math.max(0, dayDiff(rangeStart, mood.date))
      return { ...mood, x: rangeStart==='0000-01-01' ? 50 : 6+(offset/span)*92, y: 36 - ((mood.level-1)/4)*32 }
    })
    const yearStartDate = new Date(today.getFullYear(),0,1)
    const heatmapLeading = weekStartsMonday ? (yearStartDate.getDay()+6)%7 : yearStartDate.getDay()
    const moodByDate = new Map(dailyMoods.map(item=>[item.date,item.level]))
    const yearHeatmap = Array.from({length:365 + (new Date(today.getFullYear(),1,29).getMonth()===1 ? 1 : 0)},(_,index)=>{
      const date=new Date(today.getFullYear(),0,index+1)
      const key=toDateKey(date)
      return {key,level:moodByDate.get(key),future:key>todayKey}
    })
    const allMoodYears = dailyMoods.length
      ? Array.from(new Set(dailyMoods.map(item=>Number(item.date.slice(0,4))))).sort((a,b)=>a-b)
      : [today.getFullYear()]
    const allHeatmapYears = allMoodYears.map(year=>{
      const first=new Date(year,0,1)
      const leading=weekStartsMonday ? (first.getDay()+6)%7 : first.getDay()
      const leap=new Date(year,1,29).getMonth()===1
      const days=Array.from({length:365+(leap?1:0)},(_,index)=>{
        const date=new Date(year,0,index+1)
        const key=toDateKey(date)
        return {key,level:moodByDate.get(key),future:key>todayKey}
      })
      return {year,leading,days}
    })

    return {rangeStart,todayKey,eligibleTasks,completed,abandoned,overdue,completionRate,postponedTasks:postponedTasks.length,
      postponeEvents:postponeEvents.length,postponeRate,maxPostponeCount,maxPostponeDays,completedByDay,completionTrend,mostPostponedTag,mostPostponedTask,longestPostponedTask,journals,journalDays,moods,moodDays,
      impactCounts,moodCounts,priorityCounts,tagRows,tagTaskTimelines,timelineStart:effectiveTimelineStart,timelineSpan,tagTimelineAll,words,moodLinePoints,heatmapLeading,yearHeatmap,allHeatmapYears}
  },[tasks,journalEntries,dailyMoods,managedTags,statsRange,weekStartsMonday,wordCloudIgnored])

  const statsPercent = (value:number) => `${Math.round(value*100)}%`
  const impactLabel = (value:JournalImpact) => value>0 ? `+${value}` : String(value)
  const moodStatLabels = ['','特别差','有点差','一般','还可以','很高兴']

  const anniversaryPageRows = useMemo(() => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return anniversaries.map(anniversary => {
      let occurrence: Date | null = null
      if (anniversary.repeatYearly) {
        const candidateYear = Math.max(today.getFullYear(), anniversary.year ?? today.getFullYear())
        occurrence = anniversaryOccurrence(anniversary, candidateYear)
        if (!occurrence || occurrence < todayStart) occurrence = anniversaryOccurrence(anniversary, candidateYear + 1)
      } else if (anniversary.year) {
        occurrence = anniversaryOccurrence(anniversary, anniversary.year)
      }
      return { anniversary, occurrence }
    }).sort((a,b) => {
      if (!a.occurrence) return 1
      if (!b.occurrence) return -1

      const aPastOneOff = !a.anniversary.repeatYearly && a.occurrence < todayStart
      const bPastOneOff = !b.anniversary.repeatYearly && b.occurrence < todayStart

      // Active/upcoming anniversaries always come first.
      if (aPastOneOff !== bPastOneOff) return aPastOneOff ? 1 : -1

      if (aPastOneOff && bPastOneOff) {
        // Finished one-off dates sink to the bottom; most recently passed first.
        return b.occurrence.getTime() - a.occurrence.getTime()
      }

      // Today/future: nearest occurrence first.
      return a.occurrence.getTime() - b.occurrence.getTime()
    })
  }, [anniversaries])

  const anniversaryDistanceLabel = (anniversary: Anniversary, occurrence: Date | null) => {
    if (!occurrence) return ''
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const occurrenceStart = new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate())
    const days = Math.round((occurrenceStart.getTime() - todayStart.getTime()) / 86400000)
    if (days === 0) return '今天'
    if (anniversary.repeatYearly) return `还有 ${days} 天`
    return days > 0 ? `还有 ${days} 天` : `过去 ${Math.abs(days)} 天`
  }

  const allStoredAttachments = useMemo(() => {
    const seen = new Map<string, Attachment>()
    const add = (items?: Attachment[]) => (items ?? []).forEach(item => seen.set(item.storageKey, item))
    tasks.forEach(task => {
      add(task.attachments)
      Object.values(task.recurrenceExceptions ?? {}).forEach(exception => add(exception.attachments))
    })
    journalEntries.forEach(entry => add(entry.attachments))
    return [...seen.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt))
  }, [tasks, journalEntries])
  const browsedAttachments = storageBrowser ? allStoredAttachments.filter(item => item.type === storageBrowser) : []

  const openExternalImport = () => {
    setExternalImportOpen(true); setExternalImportStage('sources'); setDidaImportPreview(null); setExternalImportMessage('')
  }
  const closeExternalImport = () => {
    if(externalImportBusy) return
    setExternalImportOpen(false); setExternalImportStage('sources'); setDidaImportPreview(null); setExternalImportMessage('')
    if(externalImportInputRef.current) externalImportInputRef.current.value=''
  }
  const inspectGenericCsv = async (file:File) => {
    setExternalImportBusy(true); setExternalImportMessage('正在识别通用 CSV…')
    try {
      const text=await file.text(), rows=parseCsvRows(text)
      if(rows.length<2) throw new Error('CSV 中没有可导入的数据')
      const headerIndex=rows.findIndex(row=>{
        const title=genericHeaderIndex(row,['标题','任务','任务名称','title','task','name'])
        const date=genericHeaderIndex(row,['日期','开始日期','任务日期','date','startdate','start'])
        return title>=0 && date>=0
      })
      if(headerIndex<0) throw new Error('至少需要“标题”和“日期”两列')
      const header=rows[headerIndex], sourceRows=rows.slice(headerIndex+1).filter(row=>row.some(cell=>cell.trim()))
      const col={
        id:genericHeaderIndex(header,['taskid','id','任务id']),
        date:genericHeaderIndex(header,['日期','开始日期','任务日期','date','startdate','start']),
        end:genericHeaderIndex(header,['结束日期','enddate','end']),
        title:genericHeaderIndex(header,['标题','任务','任务名称','title','task','name']),
        notes:genericHeaderIndex(header,['描述','备注','笔记','notes','note','description','content']),
        subtask:genericHeaderIndex(header,['子任务','checklist','subtask','subtasks']),
        status:genericHeaderIndex(header,['是否完成','完成','状态','completed','done','status']),
        category:genericHeaderIndex(header,['分类','标签','tags','tag','category','list']),
        priority:genericHeaderIndex(header,['优先级','priority']),
        time:genericHeaderIndex(header,['时间','开始时间','time','starttime']),
      }
      const existingIds=new Set(tasks.map(task=>task.id))
      const tagByName=new Map<string,Tag>(tags.filter(tag=>!isImportSourceTag(tag)).map(tag=>[tag.name.trim().toLowerCase(),tag] as [string,Tag]))
      const importedTags:Tag[]=[]
      let duplicateCount=0, skippedNoDate=0
      const converted:Task[]=[]
      sourceRows.forEach((row,rowIndex)=>{
        const cell=(index:number)=>index>=0?(row[index]??'').trim():''
        const title=cell(col.title); if(!title) return
        const date=genericDate(cell(col.date)); if(!date){skippedNoDate++;return}
        const sourceId=cell(col.id)||`${date}:${title}:${rowIndex+1}`
        const id=`import:generic:${sourceId}`
        if(existingIds.has(id)){duplicateCount++;return}
        const category=cell(col.category)
        const ordinaryTagIds:string[]=[]
        category.split(/[;,，、|]/).map(v=>v.trim()).filter(Boolean).forEach(name=>{
          const key=name.toLowerCase(); let tag=tagByName.get(key)
          if(!tag){
            tag={id:`import:generic:tag:${crypto.randomUUID()}`,name,color:TAG_COLORS[(tagByName.size+importedTags.length)%TAG_COLORS.length],scope:'task'}
            tagByName.set(key,tag); importedTags.push(tag)
          }
          ordinaryTagIds.push(tag.id)
        })
        const tagIds=ordinaryTagIds.length?[...new Set([...ordinaryTagIds,EXTERNAL_SOURCE_TAG_ID,GENERIC_SOURCE_TAG_ID])]:[DEFAULT_TAG_ID,EXTERNAL_SOURCE_TAG_ID,GENERIC_SOURCE_TAG_ID]
        const statusText=cell(col.status).toLowerCase()
        const completed=['yes','y','true','1','完成','已完成','done','completed'].includes(statusText)
        const abandoned=['放弃','已放弃','abandoned','cancelled','canceled'].includes(statusText)
        const status:TaskStatus=completed?'completed':abandoned?'abandoned':'todo'
        const priorityText=cell(col.priority)
        const p=Number.parseInt(priorityText,10)
        const priority:TaskPriority=Number.isFinite(p)&&p>=0&&p<=3?p as TaskPriority:defaultPriority
        const noteParts=[cell(col.notes),cell(col.subtask)].filter(Boolean)
        const timeRaw=cell(col.time).match(/(\d{1,2}):(\d{2})/)
        const time=timeRaw?`${timeRaw[1].padStart(2,'0')}:${timeRaw[2]}`:undefined
        const endDate=genericDate(cell(col.end))
        const createdAt=`${date}T12:00:00`
        converted.push({
          id,title,date,...(endDate&&endDate!==date?{endDate}:{}),priority,status,allDay:!time,...(time?{time}:{}),
          ...(noteParts.length?{notes:noteParts.join('\n\n')}:{}),
          createdAt,updatedAt:new Date().toISOString(),
          ...(status==='completed'?{completedAt:`${date}T12:00:00`}:{}),
          tagIds
        })
      })
      const requiredSystemTags=[EXTERNAL_SOURCE_TAG,GENERIC_SOURCE_TAG].filter(required=>!tags.some(tag=>tag.id===required.id))
      const finalTags=[...requiredSystemTags,...importedTags]
      setDidaImportPreview({fileName:file.name,total:sourceRows.length,tasks:converted,tags:finalTags,duplicateCount,skippedNoDate,strippedAttachmentCount:0,ignoredChecklistCount:0})
      setExternalImportStage('generic-preview'); setExternalImportMessage('')
    } catch(error) {
      console.error('Failed to inspect generic CSV',error)
      setDidaImportPreview(null); setExternalImportMessage(error instanceof Error?`无法读取：${error.message}`:'无法读取这个文件')
    } finally {
      setExternalImportBusy(false)
      if(externalImportInputRef.current) externalImportInputRef.current.value=''
    }
  }
  const inspectDidaCsv = async (file:File) => {
    setExternalImportBusy(true); setExternalImportMessage('正在解析滴答清单…')
    try {
      const text=await file.text(), rows=parseCsvRows(text)
      const headerIndex=rows.findIndex(row=>row[0]==='Folder Name' && row.includes('Title') && row.includes('taskId'))
      if(headerIndex<0) throw new Error('没有找到滴答清单 CSV 表头')
      const header=rows[headerIndex]
      const sourceRows=rows.slice(headerIndex+1).filter(row=>row.some(cell=>cell.trim()))
      const existingIds=new Set(tasks.map(task=>task.id))
      const tagByName=new Map<string,Tag>(tags.filter(tag=>!isImportSourceTag(tag)).map(tag=>[tag.name.trim().toLowerCase(),tag] as [string,Tag]))
      const importedTags:Tag[]=[]
      let duplicateCount=0, skippedNoDate=0, strippedAttachmentCount=0, ignoredChecklistCount=0
      const converted:Task[]=[]
      sourceRows.forEach((row,rowIndex)=>{
        const get=(name:string)=>row[header.indexOf(name)] ?? ''
        const taskId=get('taskId').trim() || `row-${rowIndex+1}`
        const id=`import:dida:${taskId}`
        if(existingIds.has(id)){ duplicateCount++; return }
        const timezone=get('Timezone') || 'Asia/Shanghai'
        const start=zonedParts(get('Start Date'),timezone), due=zonedParts(get('Due Date'),timezone)
        const base=start ?? due
        if(!base){ skippedNoDate++; return }
        const allDay=get('Is All Day').toLowerCase()==='true'
        const content=cleanDidaContent(get('Content')); strippedAttachmentCount+=content.removed
        if(get('Kind')==='CHECKLIST' || get('Is Check list')==='Y') ignoredChecklistCount++
        const ordinaryTagIds:string[]=[]
        splitImportedTagNames(get('Tags')).forEach(name=>{
          const key=name.toLowerCase()
          let tag=tagByName.get(key)
          if(!tag){
            tag={id:`import:dida:tag:${crypto.randomUUID()}`,name,color:TAG_COLORS[(tagByName.size+importedTags.length)%TAG_COLORS.length],scope:'task'}
            tagByName.set(key,tag); importedTags.push(tag)
          }
          ordinaryTagIds.push(tag.id)
        })
        const tagIds=ordinaryTagIds.length ? [...new Set([...ordinaryTagIds,EXTERNAL_SOURCE_TAG_ID,DIDA_APP_SOURCE_TAG_ID])] : [DEFAULT_TAG_ID,EXTERNAL_SOURCE_TAG_ID,DIDA_APP_SOURCE_TAG_ID]
        const statusRaw=get('Status')
        const status:TaskStatus=statusRaw==='2'?'completed':statusRaw==='-1'?'abandoned':'todo'
        const priorityRaw=Number.parseInt(get('Priority')||'0',10)
        const priority:TaskPriority=priorityRaw>=5?3:priorityRaw>=3?2:priorityRaw>=1?1:0
        const createdRaw=didaIso(get('Created Time'))
        const completedRaw=didaIso(get('Completed Time'))
        const recurrence=parseDidaRecurrence(get('Repeat'))
        const endDate=due && due.date!==base.date ? due.date : undefined
        converted.push({
          id,title:get('Title').trim() || '未命名任务',date:base.date,...(endDate?{endDate}:{}),priority,status,allDay,
          ...(!allDay?{time:base.time}:{}),
          ...(content.text?{notes:content.text}:{}),
          createdAt:createdRaw && !Number.isNaN(new Date(createdRaw).getTime()) ? new Date(createdRaw).toISOString() : new Date().toISOString(),
          updatedAt:new Date().toISOString(),
          ...(status==='completed' && completedRaw && !Number.isNaN(new Date(completedRaw).getTime())?{completedAt:new Date(completedRaw).toISOString()}:{}),
          tagIds,...(recurrence?{recurrence}:{})
        })
      })
      const requiredSystemTags=[EXTERNAL_SOURCE_TAG,DIDA_APP_SOURCE_TAG].filter(required=>!tags.some(tag=>tag.id===required.id))
      const finalTags=[...requiredSystemTags,...importedTags]
      setDidaImportPreview({fileName:file.name,total:sourceRows.length,tasks:converted,tags:finalTags,duplicateCount,skippedNoDate,strippedAttachmentCount,ignoredChecklistCount})
      setExternalImportStage('dida-preview'); setExternalImportMessage('')
    } catch(error) {
      console.error('Failed to inspect Dida CSV',error)
      setDidaImportPreview(null); setExternalImportMessage(error instanceof Error?`无法读取：${error.message}`:'无法读取这个文件')
    } finally {
      setExternalImportBusy(false)
      if(externalImportInputRef.current) externalImportInputRef.current.value=''
    }
  }
  const importDidaCsv = async () => {
    if(!didaImportPreview || externalImportBusy) return
    setExternalImportBusy(true); setExternalImportMessage('正在导入…')
    try {
      const mergedTasks=[...tasks,...didaImportPreview.tasks]
      const existingTagIds=new Set(tags.map(tag=>tag.id))
      const mergedTags=[...tags,...didaImportPreview.tags.filter(tag=>!existingTagIds.has(tag.id))]
      await Promise.all([saveTasks(mergedTasks),saveTags(mergedTags)])
      setTasks(mergedTasks); setTags(mergedTags)
      const imported=didaImportPreview.tasks.length
      setDidaImportPreview(null); setExternalImportMessage(`已导入 ${imported} 条任务`)
      setExternalImportStage('sources')
    } catch(error) {
      console.error('Failed to import Dida CSV',error)
      setExternalImportMessage(error instanceof Error?`导入失败：${error.message}`:'导入失败')
    } finally { setExternalImportBusy(false) }
  }

  const resetAllUserData = async () => {
    if (resettingData) return
    setResettingData(true); setBackupMessage('正在清空数据…')
    try {
      await replaceZingData({tasks:[],journals:[],moods:[],tags:[DEFAULT_TAG],anniversaries:[],attachments:[]})
      setTasks([]); setJournalEntries([]); setDailyMoods([]); setTags([DEFAULT_TAG]); setAnniversaries([])
      setSelectedDate(today); setSearchQuery('')
      setResetDataConfirm(false)
      setStorageStats({total:0,images:0,audio:0,data:0,attachmentCount:0})
      setBackupMessage('数据已清空 · 应用设置已保留')
    } catch (error) {
      console.error('Failed to reset Zing data', error)
      setBackupMessage(error instanceof Error ? `清空失败：${error.message}` : '清空失败')
    } finally { setResettingData(false) }
  }

  const exportTasksCsv = () => {
    const tagName=(id:string)=>tags.find(tag=>tag.id===id)?.name ?? id
    const rows=[
      ['id','title','start_date','end_date','all_day','time','priority','status','deadline','completed_at','original_date','postpone_count','repeat_rule','tags','notes','attachment_count','created_at','updated_at'],
      ...tasks.map(task=>[
        task.id,task.title,task.date,task.endDate??'',task.allDay,task.time??'',`P${task.priority}`,task.status,task.deadline??'',task.completedAt??'',task.originalDate??'',
        task.postponeHistory?.length??0,task.recurrence?JSON.stringify(task.recurrence):'',(task.tagIds??[]).map(tagName).join(' | '),task.notes??'',task.attachments?.length??0,task.createdAt,task.updatedAt
      ])
    ]
    const csv=rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
    downloadTextFile(`zing-tasks-${toDateKey(new Date())}.csv`,csv,'text/csv;charset=utf-8')
    setBackupMessage(`任务 CSV 已导出 · ${tasks.length} 条`)
  }

  const exportJournalsCsv = () => {
    const tagName=(id:string)=>tags.find(tag=>tag.id===id)?.name ?? id
    const rows=[
      ['id','date','time','title','event_impact','tags','body_markdown','image_count','audio_count','created_at','updated_at'],
      ...journalEntries.map(entry=>[
        entry.id,entry.date,entry.time??'',entry.title,entry.impact,(entry.tagIds??[]).map(tagName).join(' | '),entry.content??'',
        (entry.attachments??[]).filter(item=>item.type==='image').length,(entry.attachments??[]).filter(item=>item.type==='audio').length,entry.createdAt,entry.updatedAt
      ])
    ]
    const csv=rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
    downloadTextFile(`zing-journals-${toDateKey(new Date())}.csv`,csv,'text/csv;charset=utf-8')
    setBackupMessage(`记录 CSV 已导出 · ${journalEntries.length} 条`)
  }

  const exportFullBackup = async () => {
    if (backupExporting) return
    setBackupExporting(true); setBackupMessage('正在整理备份…')
    try {
      const encoder=new TextEncoder()
      const json=(value:unknown)=>encoder.encode(JSON.stringify(value,null,2))
      const exportedAt=new Date().toISOString()
      const attachmentRows:{ storageKey:string; path:string; filename:string; mimeType:string; size:number; type:'image'|'audio'; duration?:number; createdAt:string }[]=[]
      const entries:ZipEntry[]=[
        {path:'data/tasks.json',bytes:json(tasks)},
        {path:'data/journals.json',bytes:json(journalEntries)},
        {path:'data/moods.json',bytes:json(dailyMoods)},
        {path:'data/tags.json',bytes:json(tags)},
        {path:'data/anniversaries.json',bytes:json(anniversaries)},
        {path:'data/settings.json',bytes:json({greeting,weekStart:weekStartsMonday?'monday':'sunday',dateFormat,showEndedTasks,wordCloudIgnored})},
      ]
      for (let index=0; index<allStoredAttachments.length; index+=1) {
        const attachment=allStoredAttachments[index]
        setBackupMessage(`正在读取附件 ${index+1}/${allStoredAttachments.length}…`)
        const blob=await getAttachmentBlob(attachment.storageKey)
        if (!blob) throw new Error(`找不到附件：${attachment.filename}`)
        const base=safeBackupFilename(attachment.filename.replace(/\.[A-Za-z0-9]{1,8}$/,''))
        const path=`attachments/${String(index+1).padStart(4,'0')}-${base}${attachmentExtension(attachment)}`
        entries.push({path,bytes:new Uint8Array(await blob.arrayBuffer())})
        attachmentRows.push({storageKey:attachment.storageKey,path,filename:attachment.filename,mimeType:attachment.mimeType,size:blob.size,type:attachment.type,duration:attachment.duration,createdAt:attachment.createdAt})
      }
      const manifest={format:'zing-calendar-backup',schemaVersion:1,appVersion:'0.6.22',exportedAt,
        counts:{tasks:tasks.length,journals:journalEntries.length,moods:dailyMoods.length,tags:tags.length,anniversaries:anniversaries.length,attachments:attachmentRows.length},
        attachments:attachmentRows}
      entries.unshift({path:'manifest.json',bytes:json(manifest)})
      setBackupMessage('正在生成 ZIP…')
      const zip=makeZip(entries), url=URL.createObjectURL(zip), link=document.createElement('a')
      const d=new Date(), stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}`
      link.href=url; link.download=`zing-backup-${stamp}.zip`; document.body.appendChild(link); link.click(); link.remove()
      setTimeout(()=>URL.revokeObjectURL(url),1000)
      setBackupMessage(`备份完成 · ${formatBytes(zip.size)}`)
    } catch (error) {
      console.error('Failed to export Zing backup',error)
      setBackupMessage(error instanceof Error ? `备份失败：${error.message}` : '备份失败')
    } finally { setBackupExporting(false) }
  }


  const inspectBackupFile = async (file:File) => {
    setBackupMessage('正在验证备份…')
    try {
      const entries=await readZingZip(file)
      const manifest=decodeBackupJson<any>(entries,'manifest.json')
      if (manifest?.format!=='zing-calendar-backup' || manifest?.schemaVersion!==1) throw new Error('这不是可识别的 Zing Backup v1')
      const tasks=decodeBackupJson<Task[]>(entries,'data/tasks.json')
      const journals=decodeBackupJson<JournalEntry[]>(entries,'data/journals.json')
      const moods=decodeBackupJson<DailyMood[]>(entries,'data/moods.json')
      const restoredTags=decodeBackupJson<Tag[]>(entries,'data/tags.json')
      const restoredAnniversaries=decodeBackupJson<Anniversary[]>(entries,'data/anniversaries.json')
      const settings=decodeBackupJson<BackupPreview['settings']>(entries,'data/settings.json')
      if (![tasks,journals,moods,restoredTags,restoredAnniversaries].every(Array.isArray)) throw new Error('备份中的数据格式不完整')
      const rows=Array.isArray(manifest.attachments)?manifest.attachments:[]
      const attachments=rows.map((row:any)=>{
        if (!row?.storageKey || !row?.path || !row?.mimeType || !row?.type) throw new Error('附件清单格式错误')
        const bytes=entries.get(row.path); if (!bytes) throw new Error(`缺少附件：${row.filename ?? row.path}`)
        if (typeof row.size==='number' && bytes.length!==row.size) throw new Error(`附件大小不一致：${row.filename ?? row.path}`)
        return {...row,bytes}
      })
      const expected=manifest.counts ?? {}
      if ((expected.tasks??tasks.length)!==tasks.length || (expected.journals??journals.length)!==journals.length ||
          (expected.moods??moods.length)!==moods.length || (expected.tags??restoredTags.length)!==restoredTags.length ||
          (expected.anniversaries??restoredAnniversaries.length)!==restoredAnniversaries.length ||
          (expected.attachments??attachments.length)!==attachments.length) throw new Error('备份数量校验失败')
      setBackupPreview({file,manifest,tasks,journals,moods,tags:restoredTags,anniversaries:restoredAnniversaries,settings,attachments})
      setBackupMessage('')
    } catch(error) {
      console.error('Failed to inspect backup',error)
      setBackupPreview(null); setBackupMessage(error instanceof Error?`备份无效：${error.message}`:'备份无效')
    } finally {
      if (backupInputRef.current) backupInputRef.current.value=''
    }
  }

  const restoreBackup = async () => {
    if (!backupPreview || backupRestoring) return
    setBackupRestoring(true); setBackupMessage('正在恢复数据…')
    try {
      // The archive is fully parsed and validated before any local write begins.
      await replaceZingData({
        tasks:backupPreview.tasks,journals:backupPreview.journals,moods:backupPreview.moods,
        tags:backupPreview.tags,anniversaries:backupPreview.anniversaries,
        attachments:backupPreview.attachments.map(item=>({key:item.storageKey,blob:new Blob([(() => {
          const copy = new Uint8Array(item.bytes.byteLength)
          copy.set(item.bytes)
          return copy.buffer
        })()],{type:item.mimeType})}))
      })
      const s=backupPreview.settings ?? {}
      if (s.greeting!==undefined) localStorage.setItem('zing:greeting',s.greeting || 'Hello, Zing')
      if (s.weekStart) localStorage.setItem('zing:weekStart',s.weekStart)
      if (s.dateFormat) localStorage.setItem('zing:dateFormat',s.dateFormat)
      if (typeof s.showEndedTasks==='boolean') localStorage.setItem('zing:showEndedTasks',String(s.showEndedTasks))
      if (Array.isArray(s.wordCloudIgnored)) localStorage.setItem('zing:wordCloudIgnored',JSON.stringify(s.wordCloudIgnored))
      setTasks(backupPreview.tasks); setJournalEntries(backupPreview.journals); setDailyMoods(backupPreview.moods)
      setTags(backupPreview.tags); setAnniversaries(backupPreview.anniversaries)
      if (s.greeting!==undefined) setGreeting(s.greeting || 'Hello, Zing')
      if (s.weekStart) setWeekStartsMonday(s.weekStart==='monday')
      if (s.dateFormat) setDateFormat(s.dateFormat)
      if (typeof s.showEndedTasks==='boolean') setShowEndedTasks(s.showEndedTasks)
      if (Array.isArray(s.wordCloudIgnored)) setWordCloudIgnored(s.wordCloudIgnored)
      setBackupPreview(null); setBackupMessage('恢复完成')
      setStorageStats(await getStorageStats())
    } catch(error) {
      console.error('Failed to restore backup',error)
      setBackupMessage(error instanceof Error?`恢复失败：${error.message}`:'恢复失败')
    } finally { setBackupRestoring(false) }
  }


  const runGithubSync = async () => {
    if (!githubSyncOwner.trim() || !githubSyncRepo.trim() || !githubSyncBranch.trim()) {
      setGithubSyncMessageKind('error')
      setGithubSyncMessage('请先填写 GitHub 用户名、数据仓库和分支。')
      return
    }
    if (!githubSyncToken.trim()) {
      setGithubSyncMessageKind('error')
      setGithubSyncMessage('请输入本设备的 GitHub Token。Token 不会保存到 Zing 数据或备份中。')
      return
    }
    setGithubSyncBusy(true)
    setGithubSyncMessageKind('working')
    setGithubSyncMessage('正在连接 GitHub…')
    try {
      const result = await syncWithGitHub({
        owner: githubSyncOwner.trim(),
        repo: githubSyncRepo.trim(),
        branch: githubSyncBranch.trim(),
        token: githubSyncToken.trim(),
      })
      const stamp = result.finishedAt
      setLastGithubSyncAt(stamp)
      localStorage.setItem('zing:lastGithubSyncAt', stamp)
      setGithubSyncMessageKind('success')
      setGithubSyncMessage(result.initializedRemote
        ? `✓ 首次同步完成 · 已上传 ${result.pushedRecords} 条数据`
        : `✓ 同步完成 · 拉取 ${result.pulled.upserts} 条更新 / ${result.pulled.deletes} 条删除`)
      // Rehydrate merged records so remote changes become visible immediately.
      const [nextTasks,nextJournals,nextMoods,nextTags,nextAnniversaries] = await Promise.all([
        loadTasks<Task>(), loadJournalEntries<JournalEntry>(), loadDailyMoods<DailyMood>(), loadTags<Tag>(), loadAnniversaries<Anniversary>()
      ])
      setTasks(nextTasks); setJournalEntries(nextJournals); setDailyMoods(nextMoods)
      setTags(nextTags.some(tag=>tag.id===DEFAULT_TAG_ID)?nextTags:[DEFAULT_TAG,...nextTags])
      setAnniversaries(nextAnniversaries)
    } catch (error) {
      setGithubSyncMessageKind('error')
      setGithubSyncMessage(`同步失败 · ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setGithubSyncBusy(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">Z</div>
          <div className="brand-copy">
            <p>{greeting}</p>
          </div>
        </div>

        <div className="global-search-wrap" ref={searchWrapRef}>
          <span className="global-search-icon">⌕</span>
          <input value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }} placeholder="搜索任务、记录、纪念日；#标签…" aria-label="全局搜索" />
          {searchQuery && <button type="button" className="search-clear" onClick={() => setSearchQuery('')} aria-label="清空搜索">×</button>}
          {searchOpen && normalizedSearch && (
            <div className="search-panel">
              {tagSearchMode ? <div className="search-tag-mode"># 标签搜索</div> : <div className="search-filters">
                {([['all','全部'],['task','任务'],['journal','记录'],['anniversary','纪念日']] as const).map(([value,label]) => <button key={value} type="button" className={searchFilter===value?'active':''} onClick={() => setSearchFilter(value)}>{label}</button>)}
              </div>}
              <div className="search-results">
                {searchResults.length === 0 ? <p className="search-empty">没有找到结果。</p> : searchResults.map(result => (
                  <button key={`${result.kind}-${result.id}`} type="button" className={`search-result${result.kind==='tag'?' tag-search-result':''}`} onClick={() => openSearchResult(result)} disabled={result.kind==='tag'}>
                    <span className={`search-kind kind-${result.kind}`}>{searchMarker(result)}</span>
                    <span className="search-result-main"><strong>{result.kind==='tag' ? result.title : highlightSearch(result.title)}</strong>{result.snippet && <small>{result.kind==='tag' ? result.snippet : highlightSearch(result.snippet)}</small>}</span>
                    {result.kind!=='tag' && <time>{searchDateLabel(result)}</time>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {mainView === 'calendar' && <section className="calendar-card" aria-label="月历">
        <div className="calendar-toolbar">
          <div className="month-navigation">
            <button className="nav-button" type="button" onClick={() => moveMonth(-1)} aria-label="上个月">‹</button>
            <button className="month-title-button" type="button" onClick={()=>openMonthPicker('calendar')} aria-label="快速选择年月">{MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()} <span>⌄</span></button>
            <button className="nav-button" type="button" onClick={() => moveMonth(1)} aria-label="下个月">›</button>
            <button className="today-button" type="button" onClick={goToday}>Today</button>
            {overdueTasks.length>0 && <button className={`overdue-inbox-trigger${overdueTasks.length>=5?' urgent':''}`} type="button" onClick={()=>setOverdueInboxOpen(true)} aria-label={`打开已逾期任务，共 ${overdueTasks.length} 条`}><span>⚠</span> 已逾期 {overdueTasks.length}</button>}
          </div>
          {endedTasksViewToggle('calendar-ended-toggle')}
        </div>

        <div className="weekday-row">
          {displayWeekdays.map(day => <div key={day}>{day}</div>)}
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
            const occupiedLanes = occupiedMultiLanesByDay[dayIndex]
            const freeSlots = [0, 1, 2, 3, 4].filter(slot => !occupiedLanes.has(slot))
            const visibleCapacity = dayTasks.length <= freeSlots.length ? freeSlots.length : Math.max(0, freeSlots.length - 1)
            const visibleDayTasks = dayTasks.slice(0, visibleCapacity)
            const visibleTaskSlots = freeSlots.slice(0, visibleDayTasks.length)
            const hiddenDayTaskCount = Math.max(0, dayTasks.length - visibleDayTasks.length)
            const overflowSlot = hiddenDayTaskCount > 0 ? freeSlots[visibleDayTasks.length] : undefined
            return (
              <button
                key={key}
                type="button"
                className={`day-cell${inCurrentMonth ? '' : ' outside-month'}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                aria-label={formatDate(date)}
                onClick={() => openDay(date)}
              >
                <span className="day-number">{date.getDate()}</span>
                {isToday && (
                  <svg className="today-hand-ring" viewBox="0 0 64 48" aria-hidden="true">
                    <path className="today-ring-stroke today-ring-top" d="M46 7 C33 3 17 6 9 15 C3 22 4 31 11 37" />
                    <path className="today-ring-stroke today-ring-bottom" d="M11 37 C21 46 40 44 51 35" />
                    <path className="today-ring-stroke today-ring-end" d="M51 35 C58 29 59 21 53 14" />
                  </svg>
                )}
                {(() => {
                  const annotation = calendarAnnotation(date, weekStartsMonday)
                  return <span className={`lunar-day-label${annotation ? ` calendar-annotation annotation-${annotation.kind}` : ''}`}>{annotation?.label ?? lunarCalendarLabel(date)}</span>
                })()}
                {(anniversaryOccurrencesByDate.get(key)?.length ?? 0) > 0 && (
                  <span className="anniversary-cell-icons">
                    {(anniversaryOccurrencesByDate.get(key) ?? []).slice(0, (anniversaryOccurrencesByDate.get(key)?.length ?? 0) > 3 ? 2 : 3).map(({anniversary}) => (
                      <span key={anniversary.id} title={anniversary.title}>{anniversaryIcon(anniversary.type)}</span>
                    ))}
                    {(anniversaryOccurrencesByDate.get(key)?.length ?? 0) > 3 && <span className="anniversary-overflow">+{(anniversaryOccurrencesByDate.get(key)?.length ?? 0)-2}</span>}
                  </span>
                )}
                {dayTasks.length > 0 && (
                  <span className="task-preview-list">
                    {visibleDayTasks.map((task, visibleIndex) => (
                      <span key={task.id} className={`task-preview priority-${task.priority} status-${task.status}`} style={{ '--calendar-slot': visibleTaskSlots[visibleIndex] } as any}>
                        {task.status === 'todo' ? <span className="priority-dot" /> : <span className="calendar-status-mark" aria-label={task.status === 'completed' ? '已完成' : '已放弃'}>{task.status === 'completed' ? '✓' : '×'}</span>}
                        <span className="task-preview-title">{task.title}</span>
                        {!task.allDay && task.time && <span className="task-preview-time">{task.time}</span>}
                      </span>
                    ))}
                    {hiddenDayTaskCount > 0 && overflowSlot !== undefined && <span className="more-tasks" style={{ '--calendar-slot': overflowSlot } as any}>+{hiddenDayTaskCount}</span>}
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
                onClick={event => openMultiDaySegmentDate(event, segment)}
                title={`${segment.task.title} · ${segment.task.date} → ${taskEndDate(segment.task)}`}
              >
                {segment.task.status === 'todo' ? <span className="priority-dot" /> : <span className="calendar-status-mark" aria-label={segment.task.status === 'completed' ? '已完成' : '已放弃'}>{segment.task.status === 'completed' ? '✓' : '×'}</span>}
                <span className="multi-day-title">{segment.task.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>}

      {mainView === 'statistics' && (
        <section className="statistics-page">
          <div className="page-heading stats-heading">
            <div><span className="eyebrow">STATISTICS</span><h2>统计</h2></div>
          </div>
          <div className="stats-range" role="group" aria-label="统计时间范围">
            {([['week','本周'],['month','本月'],['30d','近30天'],['year','今年'],['all','全部']] as const).map(([value,label])=>
              <button type="button" key={value} className={statsRange===value?'active':''} onClick={()=>setStatsRange(value)}>{label}</button>
            )}
          </div>

          <div className="stats-overview">
            <div className="stat-number-card"><span>完成任务</span><strong>{statistics.completed}</strong><small>{statistics.eligibleTasks.length} 个已进入执行期</small></div>
            <div className="stat-number-card"><span>完成率</span><strong>{statistics.eligibleTasks.length?statsPercent(statistics.completionRate):'—'}</strong><small>{statistics.eligibleTasks.length?`${statistics.completed} / ${statistics.eligibleTasks.length}`:'暂无可统计任务'}</small></div>
            <div className="stat-number-card"><span>记录</span><strong>{statistics.journals.length}</strong><small>{statistics.journalDays} 天写过 Journal</small></div>
            <div className="stat-number-card"><span>心情记录</span><strong>{statistics.moodDays}</strong><small>Daily Mood 天数</small></div>
          </div>

          <section className="stats-section">
            <div className="stats-section-title"><div><span className="eyebrow">TASKS</span><h3>任务</h3></div></div>
            <div className="stats-inline-cards">
              <div><span>完成</span><strong>{statistics.completed}</strong></div>
              <div><span>放弃</span><strong>{statistics.abandoned}</strong></div>
              <div><span>逾期待办</span><strong>{statistics.overdue}</strong></div>
            </div>
            {statistics.eligibleTasks.length ? <>
              <div className="stats-subblock"><h4>优先级分布</h4>
                <div className="stat-bars">{statistics.priorityCounts.map(row=><div className={`stat-bar-row priority-stat-${row.value}`} key={row.value}><span>P{row.value}</span><div><i style={{width:`${row.count/statistics.eligibleTasks.length*100}%`}} /></div><strong>{row.count}</strong></div>)}</div>
              </div>
              <div className="postpone-summary">
                <div><span>延期率</span><strong>{statsPercent(statistics.postponeRate)}</strong><small>{statistics.postponedTasks} / {statistics.eligibleTasks.length} 个任务</small></div>
                <div><span>延期总次数</span><strong>{statistics.postponeEvents}</strong></div>
                <div><span>单任务最多</span><strong>{statistics.maxPostponeCount} 次</strong></div>
                <div><span>最长累计延期</span><strong>{statistics.maxPostponeDays} 天</strong></div>
              </div>
            </> : <p className="page-empty compact">这个时间范围还没有进入执行期的任务，暂不统计优先级与延期。</p>}
            {statistics.mostPostponedTag && <div className="most-postponed-tag">
              <span>最常延期标签</span><strong>#{statistics.mostPostponedTag.tag.name}</strong>
              <small>{statsPercent(statistics.mostPostponedTag.postponeRate)} · {statistics.mostPostponedTag.postponeTasks}/{statistics.mostPostponedTag.tasks}个任务</small>
            </div>}
            {(statistics.maxPostponeCount>0||statistics.maxPostponeDays>0) && <div className="postpone-extremes">
              {statistics.maxPostponeCount>0 && statistics.mostPostponedTask && <span>延期次数最多：<strong>{statistics.mostPostponedTask.title}</strong> · {statistics.maxPostponeCount}次</span>}
              {statistics.maxPostponeDays>0 && statistics.longestPostponedTask && <span>累计延期最长：<strong>{statistics.longestPostponedTask.title}</strong> · {statistics.maxPostponeDays}天</span>}
            </div>}
            <div className="stats-subblock">
              <h4>完成趋势</h4>
              {statistics.completionTrend.length ? <div className="completion-chart-wrap">
                <div className="completion-trend">
                  {statistics.completionTrend.map((item,index)=>{
                    const max=Math.max(...statistics.completionTrend.map(x=>x.count),1)
                    const labelEvery=Math.max(1,Math.ceil(statistics.completionTrend.length/8))
                    const showLabel=index===0||index===statistics.completionTrend.length-1||index%labelEvery===0
                    return <div key={item.key} title={`${item.key} · 完成 ${item.count}`}>
                      <span className="completion-count">{item.count}</span>
                      <i style={{height:`${Math.max(8,item.count/max*100)}%`}} />
                      <span className="completion-date">{showLabel?item.label:''}</span>
                    </div>
                  })}
                </div>
              </div> : <p className="page-empty compact">这个时间范围还没有完成记录。</p>}
            </div>
          </section>

          <section className="stats-section">
            <div className="stats-section-title"><div><span className="eyebrow">JOURNAL</span><h3>记录与事件影响</h3></div><small>{statistics.journals.length} 篇 · {statistics.journalDays} 天</small></div>
            <div className="impact-distribution">
              {statistics.journals.length ? statistics.impactCounts.map(row=><div key={row.value} className={`impact-stat impact-${row.value<0?'negative':row.value>0?'positive':'neutral'}`}><span>{impactLabel(row.value)}</span><strong>{row.count}</strong></div>) : <p className="page-empty compact">这个时间范围还没有 Journal，暂不统计 Event Impact。</p>}
            </div>
            <div className="stats-subblock"><h4>词云</h4><p className="stats-note">来自当前时间范围内 Journal 的标题与正文；字体越大，出现越频繁。点击词语可屏蔽。</p>
              {statistics.words.length ? <div className="journal-word-cloud">{statistics.words.map(({word,count},index)=>{
                const max=statistics.words[0]?.count||1
                const frequencyScale=Math.sqrt(count/max)
                const rankScale=Math.max(.46,1-index/70)
                const size=12+Math.round(26*frequencyScale*rankScale)
                if(index===0) return <button type="button" className="word-cloud-center word-cloud-word" key={word} style={{fontSize:`${Math.max(38,size)}px`}} title={`${count} 次 · 点击屏蔽`} onClick={()=>setWordCloudIgnored(list=>list.includes(word)?list:[...list,word])}>{word}</button>
                const angle=index*2.399963229728653
                const radius=Math.min(43,10+Math.sqrt(index)*7.2)
                const left=50+Math.cos(angle)*radius
                const top=50+Math.sin(angle)*radius*.78
                return <button type="button" className="word-cloud-word" key={word} style={{fontSize:`${size}px`,left:`${left}%`,top:`${top}%`}} title={`${count} 次 · 点击屏蔽`} onClick={()=>setWordCloudIgnored(list=>list.includes(word)?list:[...list,word])}>{word}</button>
              })}</div> : <p className="page-empty compact">还没有足够的文字。</p>}
            </div>
          </section>

          <section className="stats-section">
            <div className="stats-section-title"><div><span className="eyebrow">MOOD</span><h3>心情</h3></div><small>{statistics.moodDays} 天</small></div>
            {(statsRange==='year'||statsRange==='all') && <div className="mood-stat-list">{statistics.moodDays ? statistics.moodCounts.map(row=><div key={row.value}><span className="mood-stat-face"><MoodFace level={row.value} /></span><span>{moodStatLabels[row.value]}</span><strong>{row.count}</strong></div>) : <p className="page-empty compact">这个时间范围还没有 Daily Mood。</p>}</div>}
            {(statsRange==='year'||statsRange==='all') ? (
              <div className="mood-heatmap-wrap">
                <h4>{statsRange==='all'?'全部心情热力图':'全年心情热力图'}</h4>
                {statsRange==='all' ? (()=> {
                  const years=statistics.allHeatmapYears
                  const selected=years.find(group=>group.year===moodHeatmapYear) ?? years[years.length-1]
                  if(!selected) return <p className="page-empty compact">还没有心情记录。</p>
                  const index=Math.max(0,years.findIndex(group=>group.year===selected.year))
                  return <div className="mood-single-year-wrap">
                    <div className="mood-heatmap-year">
                      <span>{selected.year}</span>
                      <div className="mood-year-heatmap">
                        {Array.from({length:selected.leading}).map((_,i)=><i key={`blank-${selected.year}-${i}`} className="heatmap-blank" />)}
                        {selected.days.map(day=><i key={day.key} title={`${day.key}${day.level?` · ${moodStatLabels[day.level]}`:' · 未记录'}`} className={`${day.level?`mood-${day.level}`:''}${day.future?' future':''}`} />)}
                      </div>
                    </div>
                    {years.length>1&&<div className="mood-year-navigator" onWheel={event=>{
                      if(Math.abs(event.deltaY)+Math.abs(event.deltaX)<8) return
                      const direction=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)>0?1:-1
                      const next=Math.max(0,Math.min(years.length-1,index+direction))
                      if(next!==index)setMoodHeatmapYear(years[next].year)
                    }}>
                      <button type="button" disabled={index<=0} onClick={()=>index>0&&setMoodHeatmapYear(years[index-1].year)} aria-label="上一年">‹</button>
                      <strong>{selected.year}年</strong>
                      <button type="button" disabled={index>=years.length-1} onClick={()=>index<years.length-1&&setMoodHeatmapYear(years[index+1].year)} aria-label="下一年">›</button>
                    </div>}
                  </div>
                })() : (
                  <div className="mood-year-heatmap">
                    {Array.from({length:statistics.heatmapLeading}).map((_,i)=><i key={`blank-${i}`} className="heatmap-blank" />)}
                    {statistics.yearHeatmap.map(day=><i key={day.key} title={`${day.key}${day.level?` · ${moodStatLabels[day.level]}`:' · 未记录'}`} className={`${day.level?`mood-${day.level}`:''}${day.future?' future':''}`} />)}
                  </div>
                )}
              </div>
            ) : (statsRange==='week'||statsRange==='month'||statsRange==='30d') && (
              <div className="mood-trend-wrap">
                <h4>心情变化</h4>
                {statistics.moodLinePoints.length ? <div className="mood-trend-layout">
                  <div className="mood-y-axis">{[5,4,3,2,1].map(level=>{const count=statistics.moodCounts.find(row=>row.value===level)?.count??0;return <span key={level}><MoodFace level={level as MoodLevel} /><small>({count})</small></span>})}</div>
                  <div className="mood-chart-area">
                    <svg className="mood-trend-chart" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="心情随时间变化曲线">
                      {[4,12,20,28,36].map(y=><line key={y} x1="0" x2="100" y1={y} y2={y} className="mood-grid-line" />)}
                      {statistics.moodLinePoints.length>1 && <polyline points={statistics.moodLinePoints.map(p=>`${p.x},${p.y}`).join(' ')} className="mood-trend-line" />}
                      {statistics.moodLinePoints.map(p=><circle key={p.date} cx={p.x} cy={p.y} r="1.4" className={`mood-trend-point mood-${p.level}`}><title>{p.date} · {moodStatLabels[p.level]}</title></circle>)}
                    </svg>
                    <div className="mood-x-axis">
                      <span className="mood-x-start">{statistics.rangeStart.slice(5).replace('-','/')}</span>
                      <span className="mood-x-end">{statistics.todayKey.slice(5).replace('-','/')}</span>
                    </div>
                  </div>
                </div> : <p className="page-empty compact">这个时间范围还没有心情记录。</p>}
              </div>
            )}
          </section>

          <section className="stats-section">
            <div className="stats-section-title"><div><span className="eyebrow">TAGS</span><h3>标签分析</h3></div></div>
            <div className="tag-subsection">
              <div className="tag-subsection-heading"><h4>标签与任务的联系</h4><small>{statistics.tagTimelineAll?'完整生命周期 · 完成量与实际执行频率':'当前时间范围 · 完成量与实际执行频率'} · 未来任务不计</small></div>
              {statistics.tagTaskTimelines.length ? <div className="tag-task-timelines">
                <div className="tag-timeline-axis"><span>{statistics.timelineStart}</span><span>今天</span></div>
                {[...statistics.tagTaskTimelines].sort((a,b)=>b.completed-a.completed||a.firstDate.localeCompare(b.firstDate)).map(row=>{
                  const startPct=Math.max(0,dayDiff(statistics.timelineStart,row.firstDate)/statistics.timelineSpan*100)
                  const endPct=Math.min(100,dayDiff(statistics.timelineStart,row.endKey)/statistics.timelineSpan*100)
                  return <div className={`tag-timeline-row${row.tag.archived?' archived':''}`} key={row.tag.id}>
                    <div className="tag-timeline-meta"><strong>#{row.tag.name}</strong><span>完成 {row.completed}</span>{row.tag.archived&&<em>已归档</em>}</div>
                    <div className="tag-timeline-track" title={`${row.firstDate} → ${row.endKey}`}>
                      <i className="tag-lifecycle" style={{left:`${startPct}%`,width:`${Math.max(.4,endPct-startPct)}%`}} />
                      {statistics.tagTimelineAll&&<span className="tag-start-date" style={{left:`${startPct}%`}}>{row.firstDate}</span>}
                      {row.days.map(day=>{const x=dayDiff(statistics.timelineStart,day.date)/statistics.timelineSpan*100;return <b key={day.date} title={`${day.date} · ${day.count} 个任务`} style={{left:`${x}%`,background:row.tag.color,opacity:Math.min(1,.42+day.count*.18)}} />})}
                      {row.tag.archived&&<span className="tag-archive-end" style={{left:`${endPct}%`}} title={`归档于 ${row.endKey}`} />}
                    </div>
                  </div>
                })}
              </div> : <p className="page-empty compact">还没有带标签的历史任务。</p>}
            </div>
            <div className="tag-subsection">
              <div className="tag-subsection-heading"><h4>标签与心情的联系</h4><small>Event Impact · 具体 Journal 事件对你的影响</small></div>
              <p className="stats-note tag-matrix-note">颜色深浅表示该标签内部这一档所占比例。</p>
            <div className="tag-impact-matrix-wrap">
              <table className="tag-impact-matrix">
                <thead>
                  <tr>
                    <th>标签</th>
                    {([-2,-1,0,1,2] as JournalImpact[]).map(value=><th key={value} title={`Event Impact ${impactLabel(value)}`}><MoodFace level={(value+3) as MoodLevel} /></th>)}
                    <th>Journal</th>
                  </tr>
                </thead>
                <tbody>
                  {[...statistics.tagRows].filter(row=>row.journals>0).sort((a,b)=>b.journals-a.journals||a.tag.name.localeCompare(b.tag.name)).map(row=><tr key={row.tag.id}>
                    <th scope="row">#{row.tag.name}</th>
                    {row.impacts.map(item=>{
                      const ratio=row.journals ? item.count/row.journals : 0
                      return <td key={item.value} title={`${impactLabel(item.value)} · ${item.count}篇 · ${statsPercent(ratio)}`}>
                        {item.count>0 ? <span className={`impact-cell impact-cell-${item.value<0?'negative':item.value>0?'positive':'neutral'}`} style={{'--impact-alpha':Math.max(.10,ratio*.78)} as any}>{item.count}</span> : <span className="impact-cell-zero">—</span>}
                      </td>
                    })}
                    <td className="tag-journal-total"><strong>{row.journals}</strong><small>篇</small></td>
                  </tr>)}
                  {statistics.journals.length>0&&<tr className="tag-impact-total-row">
                    <th scope="row">总计</th>
                    {statistics.impactCounts.map(item=><td key={item.value}>
                      {item.count>0?<span className={`impact-cell impact-cell-${item.value<0?'negative':item.value>0?'positive':'neutral'}`} style={{'--impact-alpha':Math.max(.10,(item.count/statistics.journals.length)*.78)} as any}>{item.count}</span>:<span className="impact-cell-zero">—</span>}
                    </td>)}
                    <td className="tag-journal-total"><strong>{statistics.journals.length}</strong><small>篇</small></td>
                  </tr>}
                </tbody>
              </table>
              {statistics.tagRows.every(row=>row.journals===0) && <p className="page-empty compact">当前时间范围还没有带标签的 Journal。</p>}
            </div>
            </div>
          </section>
        </section>
      )}

      {mainView === 'anniversaries' && (
        <section className="anniversary-page">
          <div className="page-heading">
            <div><span className="eyebrow">ANNIVERSARIES</span><h2>纪念日</h2></div>
            <button className="page-add-button" type="button" onClick={() => openAnniversaryEditor()}>＋</button>
          </div>
          {anniversaryPageRows.length === 0 ? <p className="page-empty">还没有纪念日。</p> : (
            <div className="anniversary-page-list">
              {anniversaryPageRows.map(({anniversary, occurrence}) => (
                <button key={anniversary.id} className="anniversary-page-row" type="button" onClick={() => openAnniversaryEditor(anniversary)}>
                  <span className="anniversary-page-icon">{anniversaryIcon(anniversary.type)}</span>
                  <span className="anniversary-page-main"><strong>{anniversary.title}</strong><small>{anniversary.calendar==='lunar' ? `农历 ${anniversary.isLeapMonth?'闰':''}${anniversary.month}月${anniversary.day}日` : `${anniversary.month}月${anniversary.day}日`}</small></span>
                  <span className="anniversary-page-next">
                    {occurrence && anniversary.year && occurrence.getFullYear() >= anniversary.year && anniversary.type === 'birthday' && (
                      <strong>{occurrence.getFullYear() === anniversary.year ? '出生日' : `${occurrence.getFullYear() - anniversary.year}岁生日`}</strong>
                    )}
                    {occurrence && anniversary.year && occurrence.getFullYear() >= anniversary.year && anniversary.type === 'anniversary' && (
                      <strong>{occurrence.getFullYear() === anniversary.year ? '纪念日当天' : `${occurrence.getFullYear() - anniversary.year}周年`}</strong>
                    )}
                    <small>{anniversaryDistanceLabel(anniversary, occurrence)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {mainView === 'settings' && (
        <section className="settings-page">
          <div className="page-heading"><div><span className="eyebrow">SETTINGS</span><h2>设置</h2></div></div>

          <div className="settings-group">
            <div className="settings-group-title"><h3>个人化</h3></div>
            <label className="setting-row">
              <span><strong>顶部问候语</strong><small>显示在左上角品牌标记旁。</small></span>
              <input className="setting-text-input" value={greeting} onChange={e => setGreeting(e.target.value)} onBlur={() => { if (!greeting.trim()) setGreeting('Hello, Zing') }} />
            </label>
          </div>

          <div className="settings-group">
            <div className="settings-group-title"><h3>日历</h3></div>
            <div className="setting-row"><span><strong>每周开始日</strong></span><div className="setting-segment"><button className={weekStartsMonday?'active':''} onClick={()=>setWeekStartsMonday(true)}>周一</button><button className={!weekStartsMonday?'active':''} onClick={()=>setWeekStartsMonday(false)}>周日</button></div></div>
            <div className="setting-row"><span><strong>日期格式</strong></span><div className="setting-segment"><button className={dateFormat==='dmy'?'active':''} onClick={()=>setDateFormat('dmy')}>22 Sep 2026</button><button className={dateFormat==='mdy'?'active':''} onClick={()=>setDateFormat('mdy')}>Sep 22, 2026</button></div></div>
            <div className="setting-row">
              <span><strong>新任务默认优先级</strong><small>只影响以后新建的任务，不修改已有任务。</small></span>
              <div className="default-priority-setting">{PRIORITIES.map(priority=><button key={priority.value} type="button" className={`default-priority-button priority-${priority.value}${defaultPriority===priority.value?' active':''}`} onClick={()=>setDefaultPriority(priority.value)}><i />{priority.label}</button>)}</div>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-title"><h3>显示</h3></div>
            <label className="setting-row">
              <span><strong>显示已结束任务</strong><small>同时显示已完成和已放弃的任务。</small></span>
              <input type="checkbox" checked={showEndedTasks} onChange={e=>setShowEndedTasks(e.target.checked)} />
            </label>
          </div>

          <div className="settings-group">
            <div className="settings-group-title"><h3>词云</h3></div>
            <button className="settings-link-row" type="button" onClick={()=>setWordIgnoreManagerOpen(true)}>
              <span><strong>管理屏蔽词</strong><small>{wordCloudIgnored.length ? `已屏蔽 ${wordCloudIgnored.length} 个词` : '添加或恢复不参与词云统计的词。'}</small></span><b>›</b>
            </button>
          </div>

          <div className="settings-group">
            <div className="settings-group-title"><h3>云同步</h3></div>
            <button className="settings-link-row" type="button" onClick={()=>setGithubSyncOpen(true)}>
              <span><strong>GitHub Sync</strong><small>{lastGithubSyncAt ? `上次同步 ${new Date(lastGithubSyncAt).toLocaleString()}` : '使用独立 Private Repository 同步 Zing 数据。'}</small></span><b>›</b>
            </button>
          </div>

          <div className="settings-group">
            <div className="settings-group-title"><h3>数据</h3></div>
            <div className="storage-card">
              <div className="storage-total"><span>本地存储</span><strong>{formatBytes(storageStats.total)}</strong></div>
              <div className="storage-breakdown">
                <button type="button" onClick={()=>setStorageBrowser('image')}><i>图片</i><b>{formatBytes(storageStats.images)}</b></button>
                <button type="button" onClick={()=>setStorageBrowser('audio')}><i>录音</i><b>{formatBytes(storageStats.audio)}</b></button>
                <span><i>数据</i><b>{formatBytes(storageStats.data)}</b></span>
              </div>
              <small>任务 {tasks.length} · 记录 {journalEntries.length} · 纪念日 {anniversaries.length} · 附件 {storageStats.attachmentCount}</small>
            </div>
            <button className="settings-link-row" type="button" onClick={()=>setTagManagerOpen(true)}><span><strong>标签管理</strong><small>管理任务与记录共用的标签。</small></span><b>›</b></button>
            <div className="backup-settings-block">
              <button className="settings-link-row external-import-row" type="button" onClick={openExternalImport}>
                <span><strong>从外部导入</strong><small>通用 CSV 或已支持来源；导入任务统一标记为“从外部导入”。</small></span><b>›</b>
              </button>
              <div className="plain-export-heading"><strong>通用导出</strong><small>CSV 可直接用 Numbers、Excel 或其他软件打开，不用于 Zing 完整恢复。</small></div>
              <div className="plain-export-actions">
                <button type="button" onClick={exportTasksCsv}><span>任务 CSV</span><b>↓</b></button>
                <button type="button" onClick={exportJournalsCsv}><span>记录 CSV</span><b>↓</b></button>
              </div>
              <button className="settings-link-row backup-export-row" type="button" onClick={()=>void exportFullBackup()} disabled={backupExporting}>
                <span><strong>备份</strong><small>任务、记录、心情、标签、纪念日、设置与所有附件打包为 ZIP。</small></span>
                <b>{backupExporting?'…':'↓'}</b>
              </button>
              <button className="settings-link-row backup-import-row" type="button" onClick={()=>backupInputRef.current?.click()}>
                <span><strong>恢复数据</strong><small>从 Zing 完整备份 ZIP 恢复；确认后替换当前设备数据。</small></span><b>↑</b>
              </button>
              <input ref={backupInputRef} className="backup-file-input" type="file" accept=".zip,application/zip" onChange={event=>{ const file=event.target.files?.[0]; if(file) void inspectBackupFile(file) }} />
              <button className="settings-link-row danger-data-row" type="button" onClick={()=>setResetDataConfirm(true)}>
                <span><strong>清空所有数据</strong><small>清空任务、记录、心情、纪念日、自建标签与附件；保留应用设置。</small></span><b>×</b>
              </button>
              {backupMessage && <div className="backup-status" role="status">{backupMessage}</div>}
            </div>
          </div>
        </section>
      )}

      {githubSyncOpen && (
        <div className="modal-layer github-sync-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭 GitHub Sync" onClick={()=>setGithubSyncOpen(false)} />
          <section className="task-editor github-sync-modal" role="dialog" aria-modal="true" aria-label="GitHub Sync">
            <div className="editor-header">
              <div><span className="eyebrow">SYNC</span><h2>GitHub Sync</h2></div>
              <button className="close-button" type="button" onClick={()=>setGithubSyncOpen(false)}>×</button>
            </div>
            <div className="editor-body github-sync-body">
              <p className="github-sync-intro">Zing 仍以本地数据为主。同步时会先合并 Private Repository 中的数据，再写回云端。</p>
              <label><span>GitHub 用户名</span><input value={githubSyncOwner} onChange={e=>setGithubSyncOwner(e.target.value)} autoCapitalize="none" /></label>
              <label><span>数据仓库</span><input value={githubSyncRepo} onChange={e=>setGithubSyncRepo(e.target.value)} autoCapitalize="none" /></label>
              <label><span>分支</span><input value={githubSyncBranch} onChange={e=>setGithubSyncBranch(e.target.value)} autoCapitalize="none" /></label>
              <label><span>Fine-grained Token</span><input type="password" value={githubSyncToken} onChange={e=>setGithubSyncToken(e.target.value)} autoComplete="off" placeholder="github_pat_…" /></label>
              <div className="github-sync-security">🔐 Token 仅保存在当前页面内存中：不会写入 Zing 数据库、localStorage、备份或 GitHub 数据仓库。刷新页面后需要重新输入。</div>
              {githubSyncMessage && <div className={`github-sync-status ${githubSyncMessageKind}`} role="status" aria-live="polite">{githubSyncMessage}</div>}
              <button className="github-sync-now" type="button" disabled={githubSyncBusy} onClick={()=>void runGithubSync()}>{githubSyncBusy?'正在同步…':'立即同步'}</button>
              {lastGithubSyncAt && <small className="github-sync-last">上次成功：{new Date(lastGithubSyncAt).toLocaleString()}</small>}
            </div>
          </section>
        </div>
      )}

      {wordIgnoreManagerOpen && (
        <div className="modal-layer word-ignore-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭屏蔽词管理" onClick={()=>setWordIgnoreManagerOpen(false)} />
          <section className="task-editor word-ignore-modal" role="dialog" aria-modal="true" aria-label="管理屏蔽词">
            <div className="editor-header">
              <div><span className="eyebrow">WORD CLOUD</span><h2>管理屏蔽词</h2></div>
              <button className="close-button" type="button" onClick={()=>setWordIgnoreManagerOpen(false)}>×</button>
            </div>
            <div className="editor-body">
              <p className="word-ignore-intro">这些词不会进入 Journal 词云。词云中点击词语也可以直接加入这里。</p>
              <div className="word-ignore-add">
                <input value={wordIgnoreDraft} onChange={e=>setWordIgnoreDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();const word=wordIgnoreDraft.trim().toLowerCase();if(word){setWordCloudIgnored(list=>list.includes(word)?list:[...list,word]);setWordIgnoreDraft('')}}}} placeholder="添加屏蔽词" />
                <button type="button" onClick={()=>{const word=wordIgnoreDraft.trim().toLowerCase();if(word){setWordCloudIgnored(list=>list.includes(word)?list:[...list,word]);setWordIgnoreDraft('')}}}>添加</button>
              </div>
              <div className="word-ignore-panel-list">
                {wordCloudIgnored.length ? wordCloudIgnored.map(word=><button type="button" key={word} title="点击恢复到词云" onClick={()=>setWordCloudIgnored(list=>list.filter(item=>item!==word))}><span>{word}</span><b>×</b></button>) : <p className="page-empty compact">还没有手动屏蔽的词。</p>}
              </div>
            </div>
          </section>
        </div>
      )}

      {externalImportOpen && (
        <div className="modal-layer external-import-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭外部导入" onClick={closeExternalImport} />
          <section className="task-editor external-import-modal" role="dialog" aria-modal="true" aria-label="从外部导入">
            <div className="editor-header">
              <div><span className="eyebrow">IMPORT</span><h2>从外部导入</h2></div>
              <button className="close-button" type="button" onClick={closeExternalImport} disabled={externalImportBusy}>×</button>
            </div>
            <div className="editor-body">
              {externalImportStage==='sources' && <>
                <p className="external-import-intro">外部数据会适配 Zing 的数据模型；Zing 没有的字段不会强行保存，需要时请回原 App 查看。</p>
                <button className="import-source-card" type="button" onClick={()=>{setExternalImportStage('generic-file');setExternalImportMessage('')}}>
                  <span className="import-source-icon">CSV</span><span><strong>通用导入 CSV</strong><small>自动识别常见任务字段；兼容滴答清单等 CSV 导出</small></span><b>›</b>
                </button>
                <button className="import-source-card" type="button" onClick={()=>{setExternalImportStage('dida-file');setExternalImportMessage('')}}>
                  <span className="import-source-icon">滴</span><span><strong>滴答清单</strong><small>保留原有滴答 CSV 导入入口</small></span><b>›</b>
                </button>
                <div className="import-source-placeholder"><strong>其他来源</strong><small>以后可以继续添加 Todoist、Microsoft To Do 或其他格式，不需要改动这个入口。</small></div>
              </>}
              {externalImportStage==='generic-file' && <>
                <button className="import-back-link" type="button" onClick={()=>setExternalImportStage('sources')}>‹ 返回来源</button>
                <div className="import-file-panel">
                  <strong>通用 CSV</strong>
                  <p>自动识别标题、日期、完成状态、描述/备注、子任务、分类/标签、优先级和时间等常见中英文列名。无法映射的列会忽略。</p>
                  <button className="save-button" type="button" disabled={externalImportBusy} onClick={()=>externalImportInputRef.current?.click()}>{externalImportBusy?'正在解析…':'选择 CSV 文件'}</button>
                  <input ref={externalImportInputRef} className="backup-file-input" type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)void inspectGenericCsv(file)}} />
                </div>
              </>}
              {externalImportStage==='generic-preview' && didaImportPreview && <>
                <button className="import-back-link" type="button" onClick={()=>{setExternalImportStage('generic-file');setDidaImportPreview(null)}}>‹ 重新选择</button>
                <div className="import-preview-header"><strong>{didaImportPreview.fileName}</strong><small>字段识别完成，确认后才写入 Zing。</small></div>
                <div className="import-preview-grid">
                  <span>识别记录<b>{didaImportPreview.total}</b></span>
                  <span>将导入<b>{didaImportPreview.tasks.length}</b></span>
                  <span>重复跳过<b>{didaImportPreview.duplicateCount}</b></span>
                  <span>无日期跳过<b>{didaImportPreview.skippedNoDate}</b></span>
                </div>
                <div className="import-rule-note">
                  <strong>通用映射</strong>
                  <p>标题和日期为必需字段；完成状态、备注/描述、子任务、分类/标签、优先级和时间会在存在时自动迁入。无法识别的列直接忽略。历史完成任务若没有独立完成时间，则以任务日期作为完成日期。通用导入任务会带系统来源标签「从外部导入」和「通用」。</p>
                </div>
                <div className="backup-restore-actions">
                  <button type="button" onClick={closeExternalImport} disabled={externalImportBusy}>取消</button>
                  <button className="primary" type="button" onClick={()=>void importDidaCsv()} disabled={externalImportBusy||!didaImportPreview.tasks.length}>{externalImportBusy?'正在导入…':`导入 ${didaImportPreview.tasks.length} 条`}</button>
                </div>
              </>}
              {externalImportStage==='dida-file' && <>
                <button className="import-back-link" type="button" onClick={()=>setExternalImportStage('sources')}>‹ 返回来源</button>
                <div className="import-file-panel">
                  <strong>滴答清单 CSV</strong>
                  <p>只导入 Zing 能表达的任务字段。滴答内部附件路径会被丢弃，不占用备注；导入记录会自动带系统来源标签「从外部导入」和「滴答清单」。</p>
                  <button className="save-button" type="button" disabled={externalImportBusy} onClick={()=>externalImportInputRef.current?.click()}>{externalImportBusy?'正在解析…':'选择 CSV 文件'}</button>
                  <input ref={externalImportInputRef} className="backup-file-input" type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)void inspectDidaCsv(file)}} />
                </div>
              </>}
              {externalImportStage==='dida-preview' && didaImportPreview && <>
                <button className="import-back-link" type="button" onClick={()=>{setExternalImportStage('dida-file');setDidaImportPreview(null)}}>‹ 重新选择</button>
                <div className="import-preview-header"><strong>{didaImportPreview.fileName}</strong><small>解析完成，确认后才会写入 Zing。</small></div>
                <div className="import-preview-grid">
                  <span>识别记录<b>{didaImportPreview.total}</b></span>
                  <span>将导入<b>{didaImportPreview.tasks.length}</b></span>
                  <span>重复跳过<b>{didaImportPreview.duplicateCount}</b></span>
                  <span>无日期跳过<b>{didaImportPreview.skippedNoDate}</b></span>
                  <span>附件路径丢弃<b>{didaImportPreview.strippedAttachmentCount}</b></span>
                  <span>清单型任务<b>{didaImportPreview.ignoredChecklistCount}</b></span>
                </div>
                <div className="import-rule-note">
                  <strong>本次规则</strong>
                  <p>标题、日期/时间、优先级、状态、完成时间、备注、重复规则与可识别标签会迁入；Zing 不支持的字段直接忽略。清单型任务保留文字内容，但不保留滴答的清单结构。系统来源标签由程序维护；滴答导入任务会标记「从外部导入」和「滴答清单」，普通任务不会出现这些来源标签。</p>
                </div>
                <div className="backup-restore-actions">
                  <button type="button" onClick={closeExternalImport} disabled={externalImportBusy}>取消</button>
                  <button className="primary" type="button" onClick={()=>void importDidaCsv()} disabled={externalImportBusy || didaImportPreview.tasks.length===0}>{externalImportBusy?'正在导入…':`导入 ${didaImportPreview.tasks.length} 条`}</button>
                </div>
              </>}
              {externalImportMessage && <div className="backup-status" role="status">{externalImportMessage}</div>}
            </div>
          </section>
        </div>
      )}

      {resetDataConfirm && (
        <div className="backup-restore-backdrop" role="presentation">
          <section className="backup-restore-modal reset-data-modal" role="dialog" aria-modal="true" aria-label="确认清空所有数据">
            <span className="eyebrow">RESET DATA</span><h2>清空所有数据？</h2>
            <p className="backup-restore-warning">任务、记录、Daily Mood、纪念日、自建标签和附件都会被永久清空；应用设置与系统默认标签保留。此操作不可撤销，建议先导出完整备份。</p>
            <div className="backup-restore-actions">
              <button type="button" onClick={()=>setResetDataConfirm(false)} disabled={resettingData}>取消</button>
              <button className="danger-confirm" type="button" onClick={()=>void resetAllUserData()} disabled={resettingData}>{resettingData?'正在清空…':'确认清空'}</button>
            </div>
          </section>
        </div>
      )}

      {backupPreview && (
        <div className="backup-restore-backdrop" role="presentation">
          <section className="backup-restore-modal" role="dialog" aria-modal="true" aria-label="确认恢复备份">
            <h2>Zing Backup</h2>
            <p className="backup-restore-date">{new Date(backupPreview.manifest.exportedAt).toLocaleString()}</p>
            <div className="backup-summary-grid">
              <span>任务 <b>{backupPreview.tasks.length}</b></span><span>记录 <b>{backupPreview.journals.length}</b></span>
              <span>心情 <b>{backupPreview.moods.length}</b></span><span>标签 <b>{backupPreview.tags.length}</b></span>
              <span>纪念日 <b>{backupPreview.anniversaries.length}</b></span><span>附件 <b>{backupPreview.attachments.length}</b></span>
            </div>
            <p className="backup-restore-warning">恢复后将替换当前设备中的 Zing Calendar 数据。请确认当前数据已经另行备份。</p>
            <div className="backup-restore-actions">
              <button type="button" onClick={()=>setBackupPreview(null)} disabled={backupRestoring}>取消</button>
              <button className="primary" type="button" onClick={()=>void restoreBackup()} disabled={backupRestoring}>{backupRestoring?'正在恢复…':'恢复此备份'}</button>
            </div>
          </section>
        </div>
      )}

      {!editorOpen && !journalEditorOpen && !anniversaryEditorOpen && !tagManagerOpen && !viewingJournalId && !storageBrowser && !backupPreview && !resetDataConfirm && !externalImportOpen && !overdueInboxOpen && !monthPickerTarget && !imagePreview && !seriesAction && !confirmSingleTask && (
      <nav className="bottom-nav" aria-label="主要功能">
        <button type="button" className={mainView==='calendar'?'active':''} onClick={() => setMainView('calendar')}><span>▦</span>日历</button>
        <button type="button" className={mainView==='anniversaries'?'active':''} onClick={() => setMainView('anniversaries')}><span>🎂</span>纪念日</button>
        <button type="button" className={mainView==='statistics'?'active':''} onClick={() => setMainView('statistics')}><span>⌁</span>统计</button>
        <button type="button" className={mainView==='settings'?'active':''} onClick={() => setMainView('settings')}><span>⚙</span>设置</button>
      </nav>
      )}

      {storageBrowser && (
        <div className="modal-layer storage-browser-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭附件浏览" onClick={()=>setStorageBrowser(null)} />
          <section className="storage-browser">
            <div className="storage-browser-header">
              <div><span className="eyebrow">STORAGE</span><h2>{storageBrowser==='image'?'所有图片':'所有录音'}</h2><small>{browsedAttachments.length} 个附件 · {formatBytes(storageBrowser==='image'?storageStats.images:storageStats.audio)}</small></div>
              <button className="close-button" type="button" onClick={()=>setStorageBrowser(null)}>×</button>
            </div>
            {browsedAttachments.length===0 ? <p className="page-empty">还没有{storageBrowser==='image'?'图片':'录音'}。</p> :
              storageBrowser==='image' ? <div className="storage-image-grid">{browsedAttachments.map(attachment => <StorageImage key={attachment.storageKey} attachment={attachment} onPreview={openImagePreview} />)}</div>
              : <div className="storage-audio-list">{browsedAttachments.map(attachment => <div className="storage-audio-row" key={attachment.storageKey}><span><strong>{attachment.filename}</strong><small>{formatBytes(attachment.size)}</small></span><AudioAttachment attachment={attachment}/></div>)}</div>
            }
          </section>
        </div>
      )}

      <footer className="status-line">
        <span>Zing Calendar · v0.9.5.3</span>
      </footer>

      {selectedDate && (
        <>
          <button className="drawer-backdrop" type="button" aria-label="关闭日期详情" onClick={() => setSelectedDate(null)} />
          <aside className="day-drawer" aria-label={`${formatUiDate(selectedDate)} 日期详情`}>
            <div className="drawer-header">
              <div>
                <span className="eyebrow">DAY DETAIL</span>
                <div className="drawer-date-line">
                  <h2>{formatUiDate(selectedDate)}</h2>
                  <button className="date-action-button" type="button" onClick={() => openAnniversaryEditor()} aria-label="添加纪念日" title="添加纪念日">＋</button>
                </div>
                <span className="drawer-lunar-date">农历 {lunarFullLabel(selectedDate)}</span>
              </div>
              <button className="close-button" type="button" onClick={() => setSelectedDate(null)} aria-label="关闭">×</button>
            </div>

            {selectedAnniversaries.length > 0 && (
              <section className="detail-section anniversary-section">
                <div className="section-heading"><h3>纪念日</h3><span>{selectedAnniversaries.length}</span></div>
                <div className="anniversary-list">{selectedAnniversaries.map(({anniversary, occurrence}) => (
                  <button key={anniversary.id} type="button" className="anniversary-row" onClick={() => openAnniversaryEditor(anniversary)}>
                    <span className="anniversary-row-icon">{anniversaryIcon(anniversary.type)}</span>
                    <span className="anniversary-row-title">{anniversary.title}</span>
                    <span className="anniversary-row-meta">{anniversaryMeta(anniversary, occurrence)}</span>
                  </button>
                ))}</div>
              </section>
            )}

            <section className="detail-section task-section">
              <div className="section-heading task-section-heading">
                <div className="task-heading-title"><h3>任务</h3>{selectedTasks.length > 0 && <span>{selectedTasks.length}</span>}</div>
                {endedTasksViewToggle('detail-ended-toggle')}
              </div>

              {selectedTasks.length === 0 ? (
                <p className="empty-state">这一天还没有任务。</p>
              ) : (
                <div className="task-list">
                  {selectedTasks.map(task => (
                    <article
                      key={task.id}
                      className={`task-item priority-${task.priority} status-${task.status} ${deadlineStage(task)}${isTaskOverdue(task) ? ' task-overdue' : ''}`}
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

            {!selectedIsFuture && <>
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

                        </>}

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
              <div className="mini-weekdays">{displayWeekdays.map(day => <span key={day}>{day.slice(0, 1)}</span>)}</div>
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
                      disabled={key > toDateKey(today)}
                      onClick={() => {
                        if (key > toDateKey(today)) return
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
                      {inCurrentMonth && journalDates.has(key) && <span className="mini-journal-dot" aria-label="当天有记录" />}
                    </button>
                  )
                })}
              </div>
            </section>

            {!selectedIsFuture && <>
            <section className="detail-section journal-section">
              <div className="section-heading journal-heading">
                <h3>记录</h3>
                {selectedJournalEntries.length > 0 && <span>{selectedJournalEntries.length}</span>}
                {selectedJournalEntries.length > 0 && <strong className={`impact-total ${selectedImpactTotal > 0 ? 'positive' : selectedImpactTotal < 0 ? 'negative' : ''}`}>事件合计 {selectedImpactTotal > 0 ? '+' : ''}{selectedImpactTotal}</strong>}
              </div>
              {selectedJournalEntries.length === 0 ? <p className="empty-state">暂无记录</p> : (
                <div className="journal-list">
                  {selectedJournalEntries.map(entry => {
                    const entryTagIds = (entry.tagIds ?? [DEFAULT_TAG_ID]).filter(id => id !== DEFAULT_TAG_ID)
                    const visibleTags = entryTagIds.slice(0, 3)
                    const extraTags = Math.max(0, entryTagIds.length - visibleTags.length)
                    const images = (entry.attachments ?? []).filter(a => a.type === 'image').length
                    const hasAudio = (entry.attachments ?? []).some(a => a.type === 'audio')
                    return <button key={entry.id} type="button" className="journal-entry journal-card-v067" onClick={() => setViewingJournalId(entry.id)}>
                      <span className="journal-meta">{entry.time ?? '无时间'}</span>
                      <strong className="journal-title">{entry.title || '记录'}</strong>
                      <span className={`impact-badge impact-${entry.impact}`}>{entry.impact > 0 ? '+' : ''}{entry.impact}</span>
                      <span className="journal-card-bottom">
                        <span className="entry-tags">{visibleTags.map(id => { const tag = tags.find(item => item.id === id); return tag ? <span key={id} className="mini-tag" style={{ '--tag-color': tag.color } as any}>#{tag.name}</span> : null })}{extraTags > 0 && <span className="extra-tags">+{extraTags}</span>}</span>
                        <span className="journal-markers">{entry.content && <span title="有正文" aria-label="有正文">≡</span>}{images > 0 && <span title="有图片" aria-label="有图片">▧</span>}{hasAudio && <span title="有录音" aria-label="有录音">●</span>}</span>
                      </span>
                    </button>
                  })}
                </div>
              )}
              <button className="add-button" type="button" onClick={openJournalEditor}>＋ 添加记录</button>
            </section>

            </>}

                      </aside>
        </>
      )}

      {overdueInboxOpen && (
        <div className="modal-layer overdue-inbox-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭已逾期收件箱" onClick={()=>setOverdueInboxOpen(false)} />
          <section className="task-editor overdue-inbox-panel" role="dialog" aria-modal="true" aria-labelledby="overdue-inbox-title">
            <div className="editor-header">
              <div><span className="eyebrow">OVERDUE INBOX</span><h2 id="overdue-inbox-title">已逾期 · {overdueTasks.length}</h2></div>
              <button className="close-button" type="button" onClick={()=>setOverdueInboxOpen(false)} aria-label="关闭">×</button>
            </div>
            <div className="editor-body overdue-inbox-body">
              {overdueTasks.length===0 ? <p className="page-empty compact">目前没有已逾期任务。</p> :
                <div className="overdue-inbox-list">
                  {overdueTasks.map(task=><article key={task.id} className={`overdue-inbox-item priority-${task.priority}`}>
                    <div className="overdue-inbox-main">
                      <button className="overdue-priority-box" type="button" aria-label={`完成 ${task.title}`} title="标记完成" onClick={()=>setTaskStatus(task,'completed')}>✓</button>
                      <button className="overdue-task-link" type="button" onClick={()=>openTaskAtItsDay(task)}>
                        <strong>{task.title}</strong>
                        <time>{task.date.replaceAll('-','/')}</time>
                      </button>
                    </div>
                    <button className="overdue-postpone-today" type="button" onClick={()=>postponeTask(task,toDateKey(today))}>延期到今天</button>
                  </article>)}
                </div>}
            </div>
          </section>
        </div>
      )}

      {monthPickerTarget && (
        <div className="modal-layer month-picker-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭年月选择" onClick={()=>setMonthPickerTarget(null)} />
          <section className="month-picker-panel" role="dialog" aria-modal="true" aria-label="选择年月">
            <div className="month-picker-year">
              <button type="button" onClick={()=>setMonthPickerYear(y=>y-1)} aria-label="上一年">‹</button>
              <strong>{monthPickerYear}</strong>
              <button type="button" onClick={()=>setMonthPickerYear(y=>y+1)} aria-label="下一年">›</button>
            </div>
            <div className="month-picker-grid">
              {MONTHS.map((name,index)=><button key={name} type="button" className={(monthPickerTarget==='calendar'?visibleMonth:moodMonth).getFullYear()===monthPickerYear && (monthPickerTarget==='calendar'?visibleMonth:moodMonth).getMonth()===index?'active':''} onClick={()=>chooseMonth(index)}>{name}</button>)}
            </div>
            <button className="month-picker-today" type="button" onClick={()=>{setMonthPickerYear(today.getFullYear());chooseMonth(today.getMonth())}}>今年本月</button>
          </section>
        </div>
      )}

      {anniversaryEditorOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭纪念日编辑" onClick={() => setAnniversaryEditorOpen(false)} />
          <section className="task-editor anniversary-editor" role="dialog" aria-modal="true" aria-labelledby="anniversary-editor-title">
            <div className="editor-header"><div><span className="eyebrow">ANNIVERSARY</span><h2 id="anniversary-editor-title">{editingAnniversaryId ? '编辑纪念日' : '新建纪念日'}</h2></div><button className="close-button" type="button" onClick={() => setAnniversaryEditorOpen(false)}>×</button></div>
            <div className="editor-body">
              <label className="field"><span>名称</span><input value={anniversaryDraft.title} onChange={e=>setAnniversaryDraft(d=>({...d,title:e.target.value}))} placeholder="例如：小A生日" autoFocus /></label>
              <div className="anniversary-type-grid">{ANNIVERSARY_TYPES.map(item=><button key={item.value} type="button" className={`anniversary-type-button${anniversaryDraft.type===item.value?' selected':''}`} onClick={()=>setAnniversaryDraft(d=>({...d,type:item.value}))}><span>{item.icon}</span>{item.label}</button>)}</div>
              <div className="segmented-control"><button type="button" className={anniversaryDraft.calendar==='solar'?'active':''} onClick={()=>setAnniversaryDraft(d=>({...d,calendar:'solar',isLeapMonth:false}))}>公历</button><button type="button" className={anniversaryDraft.calendar==='lunar'?'active':''} onClick={()=>setAnniversaryDraft(d=>({...d,calendar:'lunar'}))}>农历</button></div>
              <div className="anniversary-date-grid">
                <label className="field"><span>年份（可选）</span><input type="number" min="1900" max="2200" value={anniversaryDraft.year} onChange={e=>setAnniversaryDraft(d=>({...d,year:e.target.value}))} placeholder="不填写也可以" /></label>
                <label className="field"><span>月</span><select value={anniversaryDraft.month} onChange={e=>setAnniversaryDraft(d=>({...d,month:Number(e.target.value)}))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}月</option>)}</select></label>
                <label className="field"><span>日</span><select value={anniversaryDraft.day} onChange={e=>setAnniversaryDraft(d=>({...d,day:Number(e.target.value)}))}>{Array.from({length:30},(_,i)=><option key={i+1} value={i+1}>{i+1}日</option>)}</select></label>
              </div>
              {anniversaryDraft.calendar==='lunar' && <label className="anniversary-check"><input type="checkbox" checked={anniversaryDraft.isLeapMonth} onChange={e=>setAnniversaryDraft(d=>({...d,isLeapMonth:e.target.checked}))} /> 闰月</label>}
              <label className="anniversary-check"><input type="checkbox" checked={anniversaryDraft.repeatYearly} onChange={e=>setAnniversaryDraft(d=>({...d,repeatYearly:e.target.checked}))} /> 每年重复</label>
              <label className="field"><span>备注</span><textarea rows={3} value={anniversaryDraft.notes} onChange={e=>setAnniversaryDraft(d=>({...d,notes:e.target.value}))} placeholder="可选" /></label>
            </div>
            <div className="editor-actions">{editingAnniversaryId && <button className="danger-button" type="button" onClick={deleteAnniversary}>删除</button>}<button className="ghost-button" type="button" onClick={()=>setAnniversaryEditorOpen(false)}>取消</button><button className="save-button" type="button" onClick={saveAnniversary} disabled={!anniversaryDraft.title.trim()}>保存</button></div>
          </section>
        </div>
      )}

      {tagManagerOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭标签管理" onClick={() => setTagManagerOpen(false)} />
          <section className="task-editor tag-manager" role="dialog" aria-modal="true" aria-labelledby="tag-manager-title">
            <div className="editor-header"><div><span className="eyebrow">TAGS</span><h2 id="tag-manager-title">标签</h2></div><button className="close-button" type="button" onClick={() => setTagManagerOpen(false)}>×</button></div>
            <div className="editor-body">
              <div className="tag-create-row"><input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="新标签名称" /><select value={newTagScope} onChange={e => setNewTagScope(e.target.value as TagScope)}><option value="both">任务 + 记录</option><option value="task">仅任务</option><option value="journal">仅记录</option></select><button className="save-button" type="button" onClick={addTag} disabled={!newTagName.trim()}>添加</button></div>
              <div className="tag-color-row">{TAG_COLORS.map(color => <button key={color} type="button" className={`tag-color${newTagColor === color ? ' active' : ''}`} style={{ background: color }} onClick={() => setNewTagColor(color)} aria-label={`选择颜色 ${color}`} />)}</div>
              <div className="tag-list">{managedTags.map(tag => {
                const dropPosition=dragOverTag?.id===tag.id ? dragOverTag.position : null
                return <div className={`tag-row tag-manage-row${tag.archived?' archived':''}${draggingTagId===tag.id?' dragging':''}${dropPosition?` drag-over-${dropPosition}`:''}`} key={tag.id}
                  draggable
                  onDragStart={event=>{setDraggingTagId(tag.id);setDragOverTag(null);event.dataTransfer.effectAllowed='move'}}
                  onDragOver={event=>{
                    event.preventDefault()
                    if (!draggingTagId || draggingTagId===tag.id) return
                    const rect=event.currentTarget.getBoundingClientRect()
                    setDragOverTag({id:tag.id,position:event.clientY < rect.top+rect.height/2 ? 'before' : 'after'})
                    event.dataTransfer.dropEffect='move'
                  }}
                  onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverTag(current=>current?.id===tag.id?null:current)}}
                  onDrop={event=>{
                    event.preventDefault()
                    if(draggingTagId && dragOverTag?.id===tag.id) moveManagedTag(draggingTagId,tag.id,dragOverTag.position)
                    setDraggingTagId(null);setDragOverTag(null)
                  }}
                  onDragEnd={()=>{setDraggingTagId(null);setDragOverTag(null)}}>
                  <span className="tag-drag-handle" title="拖动排序" aria-label="拖动排序">⋮⋮</span>
                  <div className="tag-color-control">
                    <button type="button" className="tag-current-color" style={{ background: tag.color }} onClick={() => setOpenTagColorId(current => current === tag.id ? null : tag.id)} aria-label={`修改 ${tag.name} 的颜色`} />
                    {openTagColorId === tag.id && <div className="tag-color-popover">
                      <div className="tag-popover-palette">{TAG_COLORS.map(color => <button key={color} type="button" className={`tag-row-color${tag.color === color ? ' active' : ''}`} style={{ background: color }} onClick={() => { setTags(current => current.map(item => item.id === tag.id ? { ...item, color } : item)); setOpenTagColorId(null) }} aria-label={`设为 ${color}`} />)}</div>
                      <div className="tag-custom-color"><span>自定义</span><input type="color" value={tag.color} onChange={e => setTags(current => current.map(item => item.id === tag.id ? { ...item, color: e.target.value } : item))} /></div>
                    </div>}
                  </div>
                  <div className="tag-manage-main">
                    <input value={tag.name} onChange={e => setTags(current => current.map(item => item.id === tag.id ? { ...item, name: e.target.value } : item))} />
                  </div>
                  <select value={tag.scope} onChange={e => setTags(current => current.map(item => item.id === tag.id ? { ...item, scope: e.target.value as TagScope } : item))}><option value="both">任务 + 记录</option><option value="task">仅任务</option><option value="journal">仅记录</option></select>
                  <div className="tag-row-actions"><button type="button" className="archive-button" onClick={() => setTagArchived(tag.id,!tag.archived)}>{tag.archived?'取消归档':'归档'}</button><button type="button" className="delete-button compact-delete" onClick={() => deleteTag(tag.id)}>删除</button></div>
                </div>
              })}</div>
            </div>
          </section>
        </div>
      )}

      {viewingJournal && (
        <div className="modal-layer journal-view-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭记录详情" onClick={() => setViewingJournalId(null)} />
          <section className="task-editor journal-viewer" role="dialog" aria-modal="true" aria-labelledby="journal-view-title">
            <div className="editor-header">
              <div><span className="eyebrow">JOURNAL</span><h2 id="journal-view-title">{viewingJournal.title || '记录'}</h2></div>
              <button className="close-button" type="button" onClick={() => setViewingJournalId(null)} aria-label="关闭">×</button>
            </div>
            <div className="editor-body">
              <div className="journal-view-meta">
                <span>{viewingJournal.date}{viewingJournal.time ? ` · ${viewingJournal.time}` : ''}</span>
                <span className={`impact-badge impact-${viewingJournal.impact}`}>{viewingJournal.impact > 0 ? '+' : ''}{viewingJournal.impact}</span>
              </div>
              {viewingJournal.content && <div className="journal-view-content">{viewingJournal.content}</div>}
              {(viewingJournal.tagIds ?? []).filter(id=>id!==DEFAULT_TAG_ID && !isImportSourceTagId(id)).length>0 && <div className="entry-tags journal-view-tags">{(viewingJournal.tagIds ?? []).filter(id=>id!==DEFAULT_TAG_ID && !isImportSourceTagId(id)).map(id=>{const tag=tags.find(item=>item.id===id);return tag?<span key={id} className="mini-tag" style={{'--tag-color':tag.color} as any}>#{tag.name}</span>:null})}</div>}
              {(viewingJournal.attachments ?? []).some(a=>a.type==='image') && <div className="attachment-list">{(viewingJournal.attachments ?? []).filter(a=>a.type==='image').map(attachment=><AttachmentThumb key={attachment.id} attachment={attachment} onPreview={attachment=>void openImagePreview(attachment)} />)}</div>}
              {(viewingJournal.attachments ?? []).filter(a=>a.type==='audio').map(attachment=><AudioAttachment key={attachment.id} attachment={attachment}/>)}
            </div>
            <div className="editor-footer">
              <div className="editor-secondary-actions"><button type="button" className="delete-button" onClick={()=>deleteJournal(viewingJournal.id)}>删除记录</button></div>
              <div className="editor-primary-actions">
                <button className="cancel-button" type="button" onClick={()=>setViewingJournalId(null)}>关闭</button>
                <button className="save-button" type="button" onClick={()=>{const entry=viewingJournal;setViewingJournalId(null);editJournal(entry)}}>编辑</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {journalEditorOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭记录编辑器" onClick={closeJournalEditor} />
          <section className="task-editor journal-editor" role="dialog" aria-modal="true" aria-labelledby="journal-editor-title">
            <div className="editor-header">
              <div><span className="eyebrow">{editingJournalId ? 'EDIT JOURNAL' : 'NEW JOURNAL'}</span><h2 id="journal-editor-title">{editingJournalId ? '编辑记录' : '添加记录'}</h2></div>
              <button className="close-button" type="button" onClick={closeJournalEditor} aria-label="关闭">×</button>
            </div>
            <div className="editor-body">
              <label className="field full-field"><span>标题 *</span><input autoFocus value={journalDraft.title} onChange={event => setJournalDraft(current => ({ ...current, title: event.target.value }))} placeholder="给这条记录一个标题" /></label>
              <div className="field full-field"><span>事件影响</span><div className="impact-picker">{IMPACTS.map(impact => <button key={impact} type="button" className={`impact-choice impact-${impact}${journalDraft.impact === impact ? ' active' : ''}`} onClick={() => setJournalDraft(current => ({ ...current, impact }))}>{impact > 0 ? '+' : ''}{impact}</button>)}</div></div>
              <label className="field full-field"><span>正文 · Markdown</span><textarea rows={10} value={journalDraft.content} onChange={event => setJournalDraft(current => ({ ...current, content: event.target.value }))} placeholder="正文可选。支持标题、粗体、斜体、删除线、列表、引用、行内代码、分隔线和链接。" /></label>
              <div className="field full-field"><span>标签</span><div className="tag-picker">{tagsFor('journal').map(tag => <button key={tag.id} type="button" className={`tag-choice${journalDraft.tagIds.includes(tag.id) ? ' active' : ''}`} style={{ '--tag-color': tag.color } as any} onClick={() => toggleDraftTag('journal', tag.id)}><i />#{tag.name}</button>)}</div></div>
              <div className="field full-field journal-image-field"><span>图片 · 最多 9 张</span><input className="journal-file-input" type="file" accept="image/*" multiple onChange={event => { void addJournalImages(event.target.files); event.currentTarget.value = '' }} disabled={journalDraft.attachments.filter(a => a.type === 'image').length >= 9} />
                {journalDraft.attachments.some(a => a.type === 'image') && <div className="attachment-list">{journalDraft.attachments.filter(a => a.type === 'image').map(attachment => <AttachmentThumb key={attachment.id} attachment={attachment} onRemove={() => void removeJournalAttachment(attachment)} onPreview={attachment => void openImagePreview(attachment)} />)}</div>}
                <small>自动压缩后保存 · 单张约 1 MB · 最多 9 张</small>
              </div>
              <div className="field full-field"><span>录音 · 最多 1 条 / 30 分钟</span>
                {journalDraft.attachments.find(a => a.type === 'audio') ? (() => { const audio = journalDraft.attachments.find(a => a.type === 'audio')!; return <div className="journal-audio-edit"><AudioAttachment attachment={audio}/><button type="button" onClick={() => void removeJournalAttachment(audio)}>删除录音</button></div> })() :
                  <button type="button" className="record-button" onClick={recording ? stopJournalRecording : () => void startJournalRecording()}>{recording ? `■ 停止录音 ${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2,'0')}` : '● 开始录音'}</button>}
              </div>
              <div className="field-grid journal-date-row">
                <label className="field"><span>日期</span><input type="date" value={journalDraft.date} onChange={event => setJournalDraft(current => ({ ...current, date: event.target.value }))} /></label>
                <label className="field"><span>时间</span><input type="time" value={journalDraft.time} onChange={event => setJournalDraft(current => ({ ...current, hasTime: true, time: event.target.value }))} /></label>
              </div>
            </div>
            <div className="editor-footer">
              {editingJournalId && <div className="editor-secondary-actions"><button type="button" className="delete-button" onClick={() => { deleteJournal(editingJournalId); closeJournalEditor() }}>删除记录</button></div>}
              <div className="editor-primary-actions"><button className="cancel-button" type="button" onClick={closeJournalEditor}>取消</button><button className="save-button" type="button" onClick={saveJournal} disabled={!journalDraft.title.trim()}>{editingJournalId ? '保存修改' : '保存记录'}</button></div>
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
              <label className="field full-field task-title-field">
                <span>任务名称 *</span>
                <div className="task-title-input-wrap">
                  <input autoFocus value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="要做什么？" />
                  {editingTaskId && (() => {
                    const series = tasks.find(task => task.id === editingTaskId)
                    const shown = series ? (editingOccurrenceDate ? materializeOccurrence(series, editingOccurrenceDate) : series) : null
                    const count = shown?.postponeHistory?.length ?? 0
                    return count > 0 ? <small className={`postpone-count${count > 3 ? ' postpone-count-high' : ''}`}>↪ 已延期 {count} 次</small> : null
                  })()}
                </div>
              </label>

              <div className="time-row task-timing-toggle">
                <label className="check-field">
                  <input type="checkbox" checked={draft.allDay} onChange={event => setDraft(current => ({ ...current, allDay: event.target.checked, endDate: event.target.checked ? current.endDate : '' }))} />
                  <span>全天</span>
                </label>
              </div>

              {draft.allDay ? (
                <div className="field-grid">
                  <label className="field"><span>开始日期</span><input type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value, endDate: current.endDate && current.endDate < event.target.value ? '' : current.endDate }))} /></label>
                  <label className="field"><span>结束日期 · 可选</span><input type="date" min={draft.date} value={draft.endDate} onChange={event => setDraft(current => ({ ...current, endDate: event.target.value }))} /></label>
                </div>
              ) : (
                <div className="field-grid">
                  <label className="field"><span>日期</span><input type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value, endDate: '' }))} /></label>
                  <label className="field"><span>时间</span><input type="time" value={draft.time} onChange={event => setDraft(current => ({ ...current, time: event.target.value }))} /></label>
                </div>
              )}
              {editingTaskId && (() => {
                const series = tasks.find(task => task.id === editingTaskId)
                const shown = series ? (editingOccurrenceDate ? materializeOccurrence(series, editingOccurrenceDate) : series) : null
                if (!shown) return null
                return <div className="task-history-strip">
                  {shown.completedAt && <span>✓ 完成于 {new Date(shown.completedAt).toLocaleString()}</span>}
                </div>
              })()}

              <div className="field-grid deadline-postpone-row">
                <label className="field">
                  <span>Deadline</span>
                  <input type="date" value={draft.deadline} onChange={event => setDraft(current => ({ ...current, deadline: event.target.value }))} />
                </label>
                {editingTaskId && (() => {
                  const series = tasks.find(task => task.id === editingTaskId)
                  const shown = series ? (editingOccurrenceDate ? materializeOccurrence(series, editingOccurrenceDate) : series) : null
                  return shown && shown.status === 'todo' && taskEndDate(shown) < toDateKey(new Date()) ? (
                    <label className="field postpone-field"><span>延期到</span><div className="postpone-inline"><input type="date" min={toDateKey(new Date())} defaultValue={toDateKey(new Date())} id="postpone-date" /><button type="button" onClick={() => { const input = document.getElementById('postpone-date') as HTMLInputElement | null; if (input?.value && input.value > taskEndDate(shown)) { postponeTask(shown, input.value); closeEditor() } }}>延期</button></div></label>
                  ) : null
                })()}
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


              <div className="field full-field"><span>标签</span><div className="tag-picker">{tagsFor('task').map(tag => <button key={tag.id} type="button" className={`tag-choice${draft.tagIds.includes(tag.id) ? ' active' : ''}`} style={{ '--tag-color': tag.color } as any} onClick={() => toggleDraftTag('task', tag.id)}><i />#{tag.name}</button>)}</div>
                {draft.tagIds.some(isImportSourceTagId) && <div className="task-source-readonly">{draft.tagIds.filter(isImportSourceTagId).map(id => { const tag=tags.find(item=>item.id===id); return tag ? <span key={id} className="task-source-tag">#{tag.name}</span> : null })}<small>来源标签由系统管理</small></div>}
              </div>

              <div className="field full-field attachment-field">
                <span>图片附件</span>
                <label className="attachment-add">＋ 添加图片<input type="file" accept="image/*" multiple onChange={event => { void addTaskImages(event.target.files); event.currentTarget.value = '' }} /></label>
                {draft.attachments.length > 0 && <div className="attachment-grid">{draft.attachments.map(attachment => <AttachmentThumb key={attachment.id} attachment={attachment} onRemove={() => void removeTaskImage(attachment)} onPreview={attachment => void openImagePreview(attachment)} />)}</div>}
                <small>自动压缩后保存 · 单张上限 1 MB</small>
              </div>

              <label className="field full-field">
                <span>备注</span>
                <textarea rows={4} value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder="可选" />
              </label>

              <div className="field-grid repeat-fields">
                <label className="field">
                  <span>重复</span>
                  <select value={draft.repeatPreset} onChange={event => setDraft(current => ({ ...current, repeatPreset: event.target.value as TaskDraft['repeatPreset'] }))}>
                    <option value="none">不重复</option><option value="daily">每天</option><option value="weekly">{repeatPresetLabels(draft.date).weekly}</option><option value="monthly">{repeatPresetLabels(draft.date).monthly}</option><option value="yearly">{repeatPresetLabels(draft.date).yearly}</option><option value="custom">自定义</option>
                  </select>
                </label>
                {draft.repeatPreset === 'custom' && <label className="field"><span>每隔</span><div className="repeat-interval"><input type="number" min="1" max="999" value={draft.repeatInterval} onChange={event => setDraft(current => ({ ...current, repeatInterval: Math.max(1, Number(event.target.value) || 1) }))} /><select value={draft.repeatUnit} onChange={event => setDraft(current => ({ ...current, repeatUnit: event.target.value as RecurrenceUnit }))}><option value="day">天</option><option value="week">周</option><option value="month">月</option></select></div></label>}
              </div>
              {draft.repeatPreset === 'custom' && draft.repeatUnit === 'week' && <div className="field full-field"><span>重复星期</span><div className="weekday-picker">{WEEKDAYS.map((day, index) => <button key={day} type="button" className={draft.repeatWeekdays.includes(index) ? 'active' : ''} onClick={() => setDraft(current => ({ ...current, repeatWeekdays: current.repeatWeekdays.includes(index) ? current.repeatWeekdays.filter(value => value !== index) : [...current.repeatWeekdays, index] }))}>{day}</button>)}</div></div>}
              {draft.repeatPreset !== 'none' && <div className="field-grid repeat-end-fields">
                <label className="field"><span>结束</span><select value={draft.repeatEndMode} onChange={event => setDraft(current => ({ ...current, repeatEndMode: event.target.value as TaskDraft['repeatEndMode'] }))}><option value="never">永不</option><option value="date">按日期</option><option value="count">按次数</option></select></label>
                {draft.repeatEndMode === 'date' && <label className="field"><span>结束日期</span><input type="date" min={draft.date} value={draft.repeatEndDate} onChange={event => setDraft(current => ({ ...current, repeatEndDate: event.target.value }))} /></label>}
                {draft.repeatEndMode === 'count' && <label className="field"><span>重复次数</span><div className="repeat-count"><input type="number" min="1" max="9999" value={draft.repeatEndCount} onChange={event => setDraft(current => ({ ...current, repeatEndCount: Math.max(1, Number(event.target.value) || 1) }))} /><span>次</span></div></label>}
              </div>}
            </div>

            <div className="editor-footer">
              {editingTaskId && (
                <div className="editor-secondary-actions">
                  {editingOccurrenceDate && tasks.find(task => task.id === editingTaskId)?.recurrence && (
                    <button type="button" className="abandon-button" onClick={() => {
                      const series = tasks.find(task => task.id === editingTaskId)
                      if (series) stopRepeating(series, editingOccurrenceDate)
                    }}>停止重复</button>
                  )}
                  <button type="button" className="abandon-button" onClick={() => { const series = tasks.find(task => task.id === editingTaskId); if (series) { const shown = editingOccurrenceDate ? materializeOccurrence(series, editingOccurrenceDate) : series; if (shown) setTaskStatus(shown, 'abandoned') }; closeEditor() }}>放弃任务</button>
                  <button type="button" className="delete-button" onClick={() => {
                    const series = tasks.find(task => task.id === editingTaskId)
                    if (!series) return
                    if (editingOccurrenceDate && series.recurrence) setSeriesAction('delete')
                    else { void Promise.all((series.attachments ?? []).map(a => deleteAttachmentBlob(a.storageKey))); deleteTask(series, 'series'); closeEditor() }
                  }}>删除</button>
                </div>
              )}
              <div className="editor-primary-actions">
                <button className="cancel-button" type="button" onClick={closeEditor}>取消</button>
                <button className="save-button" type="button" onClick={() => {
                  const series = editingTaskId ? tasks.find(task => task.id === editingTaskId) : null
                  if (editingOccurrenceDate && series?.recurrence && draft.repeatPreset === 'none') setConfirmSingleTask(true)
                  else if (editingOccurrenceDate && series?.recurrence) setSeriesAction('save')
                  else saveTask('series')
                }} disabled={!draft.title.trim()}>{editingTaskId ? '保存修改' : '保存任务'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
      {confirmSingleTask && editingTaskId && editingOccurrenceDate && (
        <div className="scope-layer" role="presentation">
          <button className="scope-backdrop" type="button" aria-label="关闭" onClick={() => setConfirmSingleTask(false)} />
          <section className="scope-dialog" role="dialog" aria-modal="true">
            <h3>改为单次任务？</h3>
            <p>当前重复系列将在这次任务之前结束；当前这次会保留为单次任务，此前的任务记录保留，之后的重复任务不再生成。</p>
            <div className="scope-actions">
              <button type="button" onClick={() => setConfirmSingleTask(false)}>取消</button>
              <button type="button" className="save-button" onClick={convertOccurrenceToSingleTask}>改为单次任务</button>
            </div>
          </section>
        </div>
      )}

      {seriesAction && editingTaskId && editingOccurrenceDate && (
        <div className="scope-layer" role="presentation">
          <button className="scope-backdrop" type="button" aria-label="关闭" onClick={() => setSeriesAction(null)} />
          <section className="scope-dialog" role="dialog" aria-modal="true">
            <h3>{seriesAction === 'save' ? '修改重复任务' : '删除重复任务'}</h3>
            <p>{seriesAction === 'save' ? '这次修改应用到哪里？' : '要删除哪些重复任务？'}</p>
            <div className="scope-actions scope-actions-three">
              <button type="button" onClick={() => {
                if (seriesAction === 'save') saveTask('occurrence')
                else {
                  const series = tasks.find(t => t.id === editingTaskId)
                  const shown = series ? materializeOccurrence(series, editingOccurrenceDate) : null
                  if (shown) deleteTask(shown, 'occurrence')
                  closeEditor()
                }
                setSeriesAction(null)
              }}>仅本次</button>
              <button type="button" onClick={() => {
                if (seriesAction === 'save') saveTask('future')
                else {
                  const series = tasks.find(t => t.id === editingTaskId)
                  const shown = series ? materializeOccurrence(series, editingOccurrenceDate) : null
                  if (shown) deleteTask(shown, 'future')
                  closeEditor()
                }
                setSeriesAction(null)
              }}>本次及以后</button>
              <button type="button" className={seriesAction === 'delete' ? 'delete-button' : 'save-button'} onClick={() => {
                const series = tasks.find(t => t.id === editingTaskId)
                if (seriesAction === 'save') saveTask('series')
                else if (series) {
                  void Promise.all((series.attachments ?? []).map(a => deleteAttachmentBlob(a.storageKey)))
                  deleteTask(series, 'series')
                  closeEditor()
                }
                setSeriesAction(null)
              }}>整个系列</button>
            </div>
          </section>
        </div>
      )}

      {imagePreview && (
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={imagePreview.name}>
          <button className="image-lightbox-backdrop" type="button" aria-label="关闭图片" onClick={closeImagePreview} />
          <img src={imagePreview.url} alt={imagePreview.name} />
          <button className="image-lightbox-close" type="button" onClick={closeImagePreview} aria-label="关闭">×</button>
        </div>
      )}
    </main>
  )
}

export default App
