import { writeLocalCache } from './features/application/settingsCache'
import { useEntityPersistence } from './features/sync/useEntityPersistence'
import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { Field } from './components/ui/Field'
import type { SyncEntityType } from './db/calendar'
import { clearZingUserDataWithSync, getAttachmentBlob, getStorageStats, loadAnniversaries, loadDailyEnergy, loadDailyEnvironment, loadDailyMoods, loadFocusSessions, loadGitHubDeviceCredential, loadHabitCheckIns, loadHabits, loadJournalEntries, loadMenstrualPeriods, loadNotebooks, loadNotes, loadTags, loadTasks, loadUserSettings, previewGitHubSync, putAttachmentBlob, replaceZingData, saveEntityWithSync, saveGitHubDeviceCredential, saveTasks, saveUserSettings, syncWithGitHub } from './db/calendar'
import { b2CleanupResult } from './features/attachments/b2CleanupResult'
import type { DaySectionKey, SettingsGroupKey } from './domain/layoutPreferences'
import { DEFAULT_DAY_SECTION_ORDER, DEFAULT_SETTINGS_GROUP_ORDER, normalizeDaySectionOrder, normalizeSettingsGroupOrder } from './domain/layoutPreferences'
import type { ModuleKey } from './domain/modulePriority'
import { DEFAULT_MODULE_ORDER, normalizeModuleOrder } from './domain/modulePriority'
import { AnniversariesPage } from './features/anniversaries/AnniversariesPage'
import { AnniversaryEditor } from './features/anniversaries/AnniversaryEditor'
import { ApplicationHeader } from './features/application/ApplicationHeader'
import { APP_VERSION } from './features/application/version'
import { compressImage } from './features/attachments/AttachmentMedia'
import { MediaDialogs } from './features/attachments/MediaDialogs'
import { StorageDialogs } from './features/attachments/StorageDialogs'
import { BackupDialogs } from './features/backup/BackupDialogs'
import { createCsvExports } from './features/backup/createCsvExports'
import { CalendarPage } from './features/calendar/CalendarPage'
import { DayDetail } from './features/calendar/DayDetail'
import { MonthPicker } from './features/calendar/MonthPicker'
import { MONTHS, WEEKDAYS } from './features/calendar/calendarLabels'
import { createCalendarRenderers } from './features/calendar/createCalendarRenderers'
import { EnvironmentManager } from './features/environment/EnvironmentManager'
import { loadEnvironmentOptions } from './features/environment/environmentPreferences'
import { FocusDialogs } from './features/focus/FocusDialogs'
import { useFocusHistoryEditor } from './features/focus/useFocusHistoryEditor'
import { useFocusRuntime } from './features/focus/useFocusRuntime'
import { HabitWorkspace } from './features/habits/HabitWorkspace'
import { InboxDialogs } from './features/inbox/InboxDialogs'
import { EmotionDialogs } from './features/journal/EmotionDialogs'
import { JournalDialogs } from './features/journal/JournalDialogs'
import { MobileNavigation } from './features/navigation/MobileNavigation'
import { NavigationSettingsDialogs } from './features/navigation/NavigationSettingsDialogs'
import './features/navigation/navigation.css'
import { normalizeMobileNav } from './features/navigation/navigationConfig'
import { saveLocalNavigation } from './features/navigation/navigationStorage'
import type { MainView } from './features/navigation/navigationTypes'
import { useMobileNavigationPreferences } from './features/navigation/useMobileNavigationPreferences'
import { NotesWorkspace } from './features/notes/NotesWorkspace'
import { RandomWorkspace } from './features/random-wheel/RandomWorkspace'
import { useGlobalSearch } from './features/search/useGlobalSearch'
import { EncouragementManager } from './features/settings/EncouragementManager'
import { SettingsPage } from './features/settings/SettingsPage'
import { StatisticsPage } from './features/statistics/StatisticsPage'
import { WordIgnoreManager } from './features/statistics/WordIgnoreManager'
import { SyncDialogs } from './features/sync/SyncDialogs'
import { TagDialogs } from './features/tags/TagDialogs'
import { useTagManagement } from './features/tags/useTagManagement'
import { TaskDetails } from './features/tasks/TaskDetails'
import { TaskEditor } from './features/tasks/TaskEditor'
import { useTaskNotesEditor } from './features/tasks/useTaskNotesEditor'
import { TrashDialog } from './features/trash/TrashDialog'
import type { TrashItem } from './features/trash/trashTypes'

import { buildAttachmentLifecycle, referencedAttachmentKeys, renameAttachment, sortAttachmentsNewestFirst } from './domain/attachments'
import type { ZipEntry } from './domain/backup'
import { attachmentExtension, makeZip, parseBackupEntries, readZingZip, safeBackupFilename } from './domain/backup'
import {
  anniversaryIcon,
  anniversaryOccurrence, buildAnniversaryPageRows,
  emptyAnniversaryDraft
} from './domain/calendar'
import { EMOTION_GROUP_LABEL, createEmotionOption, deleteEmotionOption, emotionNameTaken, normalizeEmotionOptions, sanitizeEmotionIds, updateEmotionOption } from './domain/emotions'
import { environmentByDate as buildEnvironmentByDate, createEnvironmentOption, environmentOptionNameTaken, environmentOptionUsed as isEnvironmentOptionUsed, deleteEnvironmentOption as markEnvironmentOptionDeleted, setEnvironmentChoice as patchEnvironmentChoice, setEnvironmentLocation as patchEnvironmentLocation, updateEnvironmentOption as patchEnvironmentOption, moveEnvironmentOption as reorderEnvironmentOption } from './domain/environment'
import { focusHistoryForDate, permanentlyDeleteFocusSession, restoreFocusSession } from './domain/focus'
import { focusHistoryForNote, focusHistoryForTask } from './domain/focusHistorySelectors'
import { cascadeRestoreHabitFocus, permanentlyDeleteHabitFocus, purgeTrashWithHabitFocus } from './domain/habitFocusLifecycle'
import type { InboxSortKey } from './domain/inbox'
import { DEFAULT_INBOX_SORT_ORDER, groupInboxTodoTasks, inboxActivityAt, inboxActivityKind, inboxOrdinaryTaskTagId, normalizeInboxSortOrder, sortCompletedInboxTasks } from './domain/inbox'
import {
  appendJournalMessage,
  emptyJournalDraft,
  energyMap,
  activeJournalEntries as filterActiveJournalEntries,
  journalEntriesForDate, moodMap, normalizeJournalMessages, toggleDailyEnergy, toggleDailyMood
} from './domain/journal'
import { calculateMenstrualPrediction, periodForDate as findPeriodForDate, menstrualVisualForDate as getMenstrualVisualForDate, patchPeriodDayLog } from './domain/menstrual'
import { cascadeRestoreNoteFocus, permanentlyDeleteNoteFocus, purgeTrashWithNoteFocus } from './domain/noteFocusLifecycle'
import { ensureDefaultNotebook, linkImageAttachmentToNote, normalizeNotes, permanentlyDeleteNote, purgeTrashedNotes, restoreNote } from './domain/notes'
import {
  DEFAULT_TAG, DEFAULT_TAG_ID, DEFAULT_THERMAL_OPTIONS, DEFAULT_WEATHER_OPTIONS,
  REQUIRED_SYSTEM_TAGS,
  ensureRequiredSystemTags,
  normalizeEnvironmentOptions, normalizeTags
} from './domain/preferences'
import type { SearchResult } from './domain/search'
import { advanceWordClock, buildSyncedSettings, hydrateWordClock, normalizedIncomingSettings, settingsEqualIgnoringUpdatedAt } from './domain/settings'
import {
  singleOrdinaryTagIds,
  toggleJournalTagIds, toggleTaskTagIds
} from './domain/tags'
import {
  addDaysKey, applyRecurringDisplayMode, buildMonth,
  combinedFocusSecondsByDate,
  dayDiff,
  draftRepeat, emptyDraft, expandTasks, formatDate,
  fromDateKey,
  isTaskOverdue,
  materializeOccurrence, normalizeSingleOccurrenceSeries, normalizeTaskScheduling,
  recurrenceFromDraft,
  taskCoversDate, taskEndDate,
  taskSort, toDateKey
} from './domain/task'
import { cascadeRestoreTaskFocus, cascadeTrashTaskFocus, permanentlyDeleteTaskFocus, purgeTrashWithTaskFocus } from './domain/taskFocusLifecycle'
import { ExternalImportModal } from './features/external-import/ExternalImportModal'
import { useExternalImport } from './features/external-import/useExternalImport'
import type { Habit, HabitCheckIn } from './features/habits/habitDomain'
import { useAppPreferences } from './hooks/useAppPreferences'
import type {
  Anniversary, AnniversaryDraft,
  Attachment, BackupPreview,
  CalendarDay, DailyEnergy, DailyEnvironment, DailyMood, EmotionGroup, EmotionOption,
  EncouragementMessage, EncouragementStyle,
  EnergyLevel, EnvironmentOption, FocusSession,
  JournalDraft, JournalEntry,
  JournalMessage,
  MenstrualDayLog, MenstrualPeriod, MoodLevel,
  Note, Notebook,
  PostponeEvent,
  RandomPoolGroup, RandomPoolItem,
  RecurrenceException, SyncedUserSettings, Tag,
  Task, TaskDraft,
  TaskPriority, TaskStatus
} from './types'

function App() {
  const { mobileNav, mobileNavConfigured, mobileNavSettingsOpen, mobileNavToast, receiveDefaultMobileNav, setMobileNavSettingsOpen, setMobileNavToast, setSyncedDefaultMobileNav, syncedDefaultMobileNav, updateMobileNav } = useMobileNavigationPreferences()

  // v1.1.6: keep the current-day object stable across ordinary UI renders.
  // A fresh Date here invalidated the entire continuous-calendar memo on every
  // button click (search, Today, Day Detail, etc.), rebuilding all month cells.
  const [today] = useState(() => new Date())
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [isMobileCalendar, setIsMobileCalendar] = useState(() => window.matchMedia('(max-width: 620px)').matches)
  const [mobileActiveMonth, setMobileActiveMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [mobileMonths, setMobileMonths] = useState(() => Array.from({length:7}, (_,index) => new Date(today.getFullYear(), today.getMonth() + index - 3, 1)))
  const continuousCalendarRef = useRef<HTMLDivElement | null>(null)
  const pendingCalendarScrollRef = useRef<string | null>(isMobileCalendar ? `date:${toDateKey(today)}` : null)
  const [mobileCalendarPositionReady, setMobileCalendarPositionReady] = useState(() => !isMobileCalendar)
  const pendingPrependAnchorRef = useRef<{key:string; top:number} | null>(null)
  const dayDetailOriginScrollRef = useRef<number | null>(null)
  const dayDetailCloseTimerRef = useRef<number | null>(null)
  const openDayRef = useRef<(date: Date) => void>(() => {})
  const [dayDetailClosing, setDayDetailClosing] = useState(false)
  const [moodMonth, setMoodMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [monthPickerTarget, setMonthPickerTarget] = useState<'calendar'|'mood'|null>(null)
  const [overdueInboxOpen, setOverdueInboxOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxSortOrder, setInboxSortOrder] = useState<InboxSortKey[]>(() => {
    try { return normalizeInboxSortOrder(JSON.parse(localStorage.getItem('zing:inboxSortOrder') || 'null')) } catch { return [...DEFAULT_INBOX_SORT_ORDER] }
  })
  const inboxSortDragRef = useRef<InboxSortKey | null>(null)
  const [inboxSortDropTarget, setInboxSortDropTarget] = useState<InboxSortKey | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [layoutEditor, setLayoutEditor] = useState<'day'|'settings'|null>(null)
  const [daySectionOrder, setDaySectionOrder] = useState<DaySectionKey[]>(() => {try{return normalizeDaySectionOrder(JSON.parse(localStorage.getItem('zing:daySectionOrder')||'null'))}catch{return [...DEFAULT_DAY_SECTION_ORDER]}})
  const [settingsGroupOrder, setSettingsGroupOrder] = useState<SettingsGroupKey[]>(() => {try{return normalizeSettingsGroupOrder(JSON.parse(localStorage.getItem('zing:settingsGroupOrder')||'null'))}catch{return [...DEFAULT_SETTINGS_GROUP_ORDER]}})
  const daySectionStyle=(key:DaySectionKey):CSSProperties=>({order:daySectionOrder.indexOf(key)+10})
  const settingsGroupStyle=(key:SettingsGroupKey):CSSProperties=>({order:settingsGroupOrder.indexOf(key)+10})
  const [modulePriorityOpen, setModulePriorityOpen] = useState(false)
  const [moduleOrder, setModuleOrder] = useState<ModuleKey[]>(() => { try { return normalizeModuleOrder(JSON.parse(localStorage.getItem('zing:modulePriority') || 'null')) } catch { return [...DEFAULT_MODULE_ORDER] } })
  const moduleDragRef = useRef<ModuleKey | null>(null)
  const [requestedHabitId, setRequestedHabitId] = useState<{ id: string; request: number } | null>(null)
  const [trashFilter, setTrashFilter] = useState<'all'|'task'|'journal'|'note'|'anniversary'|'focus'|'habit'>('all')
  const [monthPickerYear, setMonthPickerYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayDetailOpen, setDayDetailOpen] = useState(false)
  const [mainView, setMainView] = useState<MainView>('calendar')
  const [weatherOptions, setWeatherOptions] = useState<EnvironmentOption[]>(() => loadEnvironmentOptions('zing:weatherOptions', DEFAULT_WEATHER_OPTIONS))
  const [thermalOptions, setThermalOptions] = useState<EnvironmentOption[]>(() => loadEnvironmentOptions('zing:thermalOptions', DEFAULT_THERMAL_OPTIONS))
  const [environmentManagerKind, setEnvironmentManagerKind] = useState<'weather'|'thermal'|null>(null)
  const [emotionOptions, setEmotionOptions] = useState<EmotionOption[]>(() => { try { return normalizeEmotionOptions(JSON.parse(localStorage.getItem('zing:emotionOptions')||'[]')) } catch { return normalizeEmotionOptions(undefined) } })
  const [emotionManagerOpen, setEmotionManagerOpen] = useState(false)
  const [emotionPickerOpen, setEmotionPickerOpen] = useState(false)
  const [emotionManagerExpanded, setEmotionManagerExpanded] = useState<EmotionGroup | null>(null)
  const [wordCloudIgnored, setWordCloudIgnored] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('zing:wordCloudIgnored') || '[]') } catch { return [] }
  })
  const [encouragementMessages, setEncouragementMessages] = useState<EncouragementMessage[]>(() => {
    try { const rows=JSON.parse(localStorage.getItem('zing:encouragementMessages') || '[]'); return Array.isArray(rows)?rows:[] } catch { return [] }
  })
  const [encouragementStyle, setEncouragementStyle] = useState<EncouragementStyle>(() => { const value=localStorage.getItem('zing:encouragementStyle'); return value==='dark'||value==='light'?value:'random' })
  const [keepScreenAwakeDuringFocus, setKeepScreenAwakeDuringFocus] = useState(() => localStorage.getItem('zing:keepScreenAwakeDuringFocus') === 'true')
  const [randomWheelOpen,setRandomWheelOpen]=useState(false)
  const [randomPoolOpen,setRandomPoolOpen]=useState(false)
  const [randomPoolGroups,setRandomPoolGroups]=useState<RandomPoolGroup[]>(()=>{try{const v=JSON.parse(localStorage.getItem('zing:randomPoolGroups')||'[]');return Array.isArray(v)?v:[]}catch{return []}})
  const [randomPoolItems,setRandomPoolItems]=useState<RandomPoolItem[]>(()=>{try{const v=JSON.parse(localStorage.getItem('zing:randomPoolItems')||'[]');return Array.isArray(v)?v:[]}catch{return []}})
  const [mixedPoolItemIds,setMixedPoolItemIds]=useState<string[]>(()=>{try{const v=JSON.parse(localStorage.getItem('zing:mixedPoolItemIds')||'[]');return Array.isArray(v)?v.filter(id=>typeof id==='string'):[]}catch{return []}})
  const [encouragementManagerOpen, setEncouragementManagerOpen] = useState(false)
  const [encouragementDraft, setEncouragementDraft] = useState('')
  const [encouragementEditingId, setEncouragementEditingId] = useState<string|null>(null)
  const [encouragementReward, setEncouragementReward] = useState('')
  const [encouragementRewardStyle, setEncouragementRewardStyle] = useState<'dark'|'light'>('dark')
  const lastEncouragementIdRef = useRef<string|null>(null)
  const [wordIgnoreDraft, setWordIgnoreDraft] = useState('')
  const [wordIgnoreManagerOpen, setWordIgnoreManagerOpen] = useState(false)
  const [storageStats, setStorageStats] = useState({ total:0, images:0, audio:0, data:0, attachmentCount:0 })
  const [storageBrowser, setStorageBrowser] = useState<'image'|'audio'|null>(null)
  const [orphanCleanupBusy, setOrphanCleanupBusy] = useState(false)
  const [orphanCleanupOpen, setOrphanCleanupOpen] = useState(false)
  const [orphanAttachments, setOrphanAttachments] = useState<{key:string;url:string;contentType:string;size:number}[]>([])
  const [imageLibraryTarget, setImageLibraryTarget] = useState<'task'|'journal'|'note'|null>(null)
  const [imageLibraryNoteId, setImageLibraryNoteId] = useState<string|null>(null)
  const [backupExporting, setBackupExporting] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [githubSyncOpen, setGithubSyncOpen] = useState(false)
  const [githubSyncOwner, setGithubSyncOwner] = useState(() => localStorage.getItem('zing:githubSyncOwner') || 'zzZing0-0')
  const [githubSyncRepo, setGithubSyncRepo] = useState(() => localStorage.getItem('zing:githubSyncRepo') || 'zing-calendar-data')
  const [githubSyncBranch, setGithubSyncBranch] = useState(() => localStorage.getItem('zing:githubSyncBranch') || 'main')
  const [githubSyncToken, setGithubSyncToken] = useState('')
  const [githubTokenSaved, setGithubTokenSaved] = useState(false)
  const [githubSyncPreview, setGithubSyncPreview] = useState<{initializedRemote:boolean; rows:{entityType:string;localCount:number;remoteCount:number;mergedCount:number;added:number;updated:number;deleted:number}[]}|null>(null)
  const [githubSyncBusy, setGithubSyncBusy] = useState(false)
  const [githubSyncMessage, setGithubSyncMessage] = useState('')
  const [githubSyncMessageKind, setGithubSyncMessageKind] = useState<'idle'|'working'|'success'|'error'>('idle')
  const [autoSyncToast, setAutoSyncToast] = useState('')
  const [programRefreshBusy, setProgramRefreshBusy] = useState(false)
  const [lastGithubSyncAt, setLastGithubSyncAt] = useState(() => localStorage.getItem('zing:lastGithubSyncAt') || '')
  const [localWriteRevision, setLocalWriteRevision] = useState(0)
  const [backupPreview, setBackupPreview] = useState<BackupPreview|null>(null)
  const [backupRestoring, setBackupRestoring] = useState(false)
  const [resetDataConfirm, setResetDataConfirm] = useState(false)
  const [resettingData, setResettingData] = useState(false)
  const backupInputRef = useRef<HTMLInputElement|null>(null)
  const [plainExportOpen, setPlainExportOpen] = useState(false)
  const selectedIsFuture = Boolean(selectedDate && toDateKey(selectedDate) > toDateKey(today))

  const {
    greeting, setGreeting, weekStartsMonday, setWeekStartsMonday, dateFormat, setDateFormat,
    showEndedTasks, setShowEndedTasks, showAllRecurringTasks, setShowAllRecurringTasks,
    excludeDefaultFocusStats, setExcludeDefaultFocusStats, maxFocusHours, setMaxFocusHours,
    defaultPriority, setDefaultPriority,
  } = useAppPreferences()

  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksHydrated, setTasksHydrated] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<string | null>(null)
  const [draft, setDraft] = useState<TaskDraft>(() => emptyDraft(today, defaultPriority))
  const { handleTaskNotesKeyDown, insertTaskNoteChecklist, taskNotesRef, toggleTaskNoteChecklistLine } = useTaskNotesEditor({ draft, setDraft })

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [dailyMoods, setDailyMoods] = useState<DailyMood[]>([])
  const [dailyEnergy, setDailyEnergy] = useState<DailyEnergy[]>([])
  const [dailyEnvironment, setDailyEnvironment] = useState<DailyEnvironment[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitCheckIns, setHabitCheckIns] = useState<HabitCheckIn[]>([])
  const [habitsHydrated, setHabitsHydrated] = useState(false)
  useEffect(() => { let active=true; Promise.all([loadHabits<Habit>(),loadHabitCheckIns<HabitCheckIn>()]).then(([h,c])=>{if(active){setHabits(h);setHabitCheckIns(c);setHabitsHydrated(true)}}).catch(error=>{console.error('Habit hydration failed',error)});return ()=>{active=false} },[])
  useEntityPersistence('habit', habits, habitsHydrated, setLocalWriteRevision)
  useEntityPersistence('habitCheckIn', habitCheckIns, habitsHydrated, setLocalWriteRevision)
  const quickHabitCheckIn=(habit:Habit,date:string)=>{if(habit.archivedAt)return;const now=new Date().toISOString();setHabitCheckIns(current=>[...current,{id:crypto.randomUUID(),habitId:habit.id,occurredDate:date,quantity:habit.quantityTarget,createdAt:now,updatedAt:now}])}
  const undoHabitCheckIn=(habit:Habit,date:string)=>{if(habit.archivedAt)return;setHabitCheckIns(current=>{const entry=[...current].reverse().find(row=>row.habitId===habit.id&&row.occurredDate===date&&!row.deletedAt);if(!entry)return current;const now=new Date().toISOString();return current.map(row=>row.id===entry.id?{...row,deletedAt:now,updatedAt:now}:row)})}
  const [menstrualPeriods, setMenstrualPeriods] = useState<MenstrualPeriod[]>([])
  const [energyHydrated, setEnergyHydrated] = useState(false)
  const [environmentHydrated, setEnvironmentHydrated] = useState(false)
  const [periodsHydrated, setPeriodsHydrated] = useState(false)
  const [statusCalendarMode, setStatusCalendarMode] = useState<'mood'|'energy'>('mood')
  const energyByDate = useMemo(() => energyMap(dailyEnergy), [dailyEnergy])
  const selectedEnergy = selectedDate ? energyByDate.get(toDateKey(selectedDate)) : undefined
  const environmentByDate = useMemo(() => buildEnvironmentByDate(dailyEnvironment), [dailyEnvironment])
  const selectedEnvironment = selectedDate ? environmentByDate.get(toDateKey(selectedDate)) : undefined
  const menstrualPrediction = useMemo(() => calculateMenstrualPrediction(menstrualPeriods), [menstrualPeriods])
  const menstrualVisualForDate = (key:string) => getMenstrualVisualForDate(key, menstrualPeriods, menstrualPrediction)

  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [anniversariesHydrated, setAnniversariesHydrated] = useState(false)
  const [anniversaryEditorOpen, setAnniversaryEditorOpen] = useState(false)
  const [editingAnniversaryId, setEditingAnniversaryId] = useState<string | null>(null)
  const [anniversaryDraft, setAnniversaryDraft] = useState<AnniversaryDraft>(() => emptyAnniversaryDraft(today))
  const [notes, setNotes] = useState<Note[]>([])
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [notesHydrated, setNotesHydrated] = useState(false)
  const [notebooksHydrated, setNotebooksHydrated] = useState(false)
  const [requestedNoteId, setRequestedNoteId] = useState<string | null>(null)
  const [journalHydrated, setJournalHydrated] = useState(false)
  const [moodsHydrated, setMoodsHydrated] = useState(false)
  const [journalEditorOpen, setJournalEditorOpen] = useState(false)
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null)
  const [viewingJournalId, setViewingJournalId] = useState<string | null>(null)
  const [journalMessageDraft, setJournalMessageDraft] = useState('')
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [taskFocusHistoryOpen, setTaskFocusHistoryOpen] = useState(false)
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([])
  const [focusHydrated, setFocusHydrated] = useState(false)
  const [focusHistoryDate, setFocusHistoryDate] = useState<string | null>(null)
  const [noteFocusHistoryId, setNoteFocusHistoryId] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [journalDraft, setJournalDraft] = useState<JournalDraft>(() => emptyJournalDraft(today))
  const [tags, setTags] = useState<Tag[]>([DEFAULT_TAG])
  const [tagsHydrated, setTagsHydrated] = useState(false)
  const externalImport = useExternalImport({tasks,tags,focusSessions,defaultPriority,setTasks,setTags,setFocusSessions})
  const { externalImportOpen, openExternalImport } = externalImport
  const syncSnapshotsRef = useRef<Record<SyncEntityType, any[]>>({ task: [], journal: [], note: [], notebook: [], mood: [], energy: [], environment: [], period: [], tag: [], anniversary: [], focus: [], habit: [], habitCheckIn: [], settings: [] })
  const syncSnapshotReadyRef = useRef<Record<SyncEntityType, boolean>>({ task: false, journal: false, note: false, notebook: false, mood: false, energy: false, environment: false, period: false, tag: false, anniversary: false, focus: false, habit: false, habitCheckIn: false, settings: false })
  const settingsSyncReadyRef = useRef(false)
  const suppressNextSettingsSyncRef = useRef(false)
  const settingsWordClockRef = useRef<{added:Record<string,string>;removed:Record<string,string>}>({added:{},removed:{}})
  const [seriesAction, setSeriesAction] = useState<'save' | 'delete' | null>(null)
  const [confirmSingleTask, setConfirmSingleTask] = useState(false)
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string; storageKey: string; galleryKeys?: string[] } | null>(null)

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setRecordingSeconds(value => {
      if (value >= 1799) { window.setTimeout(stopJournalRecording, 0); return 1800 }
      return value + 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [recording, mediaRecorder])

  const openImagePreview = async (attachment: Attachment, gallery: Attachment[] = []) => {
    const blob = await getAttachmentBlob(attachment.storageKey)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setImagePreview(current => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return { url, name: attachment.filename, storageKey: attachment.storageKey, galleryKeys: gallery.map(item=>item.storageKey) }
    })
  }
  const stepImagePreview = (delta:number) => {
    if(!imagePreview?.galleryKeys?.length)return
    const index=imagePreview.galleryKeys.indexOf(imagePreview.storageKey), nextKey=imagePreview.galleryKeys[index+delta]
    const next=allStoredAttachments.find(item=>item.storageKey===nextKey)
    if(next) void openImagePreview(next, imagePreview.galleryKeys.map(key=>allStoredAttachments.find(item=>item.storageKey===key)).filter((item):item is Attachment=>Boolean(item)))
  }
  const renamePreviewImage = () => {
    if(!imagePreview)return
    const value=window.prompt('图片名称',imagePreview.name)?.trim()
    if(!value||value===imagePreview.name)return
    const key=imagePreview.storageKey, now=new Date().toISOString()
    setTasks(rows=>rows.map(task=>({...task,attachments:renameAttachment(task.attachments,key,value),recurrenceExceptions:Object.fromEntries(Object.entries(task.recurrenceExceptions??{}).map(([date,exception])=>[date,{...exception,attachments:renameAttachment(exception.attachments,key,value)}])),updatedAt:task.attachments?.some(a=>a.storageKey===key)?now:task.updatedAt})))
    setJournalEntries(rows=>rows.map(row=>({...row,attachments:renameAttachment(row.attachments,key,value),updatedAt:row.attachments?.some(a=>a.storageKey===key)?now:row.updatedAt})))
    setNotes(rows=>rows.map(row=>({...row,attachments:renameAttachment(row.attachments,key,value),updatedAt:row.attachments?.some(a=>a.storageKey===key)?now:row.updatedAt})))
    setImagePreview(current=>current?{...current,name:value}:current)
  }

  const closeImagePreview = () => {
    setImagePreview(current => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
  }

  useEffect(()=>{
    if(!imagePreview?.galleryKeys?.length)return
    const onKeyDown=(event:globalThis.KeyboardEvent)=>{
      if(event.key==='ArrowLeft'){event.preventDefault();stepImagePreview(-1)}
      if(event.key==='ArrowRight'){event.preventDefault();stepImagePreview(1)}
    }
    window.addEventListener('keydown',onKeyDown)
    return()=>window.removeEventListener('keydown',onKeyDown)
  },[imagePreview])

  const openMonthPicker = (target:'calendar'|'mood') => {
    const source=target==='calendar'?(isMobileCalendar?mobileActiveMonth:visibleMonth):moodMonth
    setMonthPickerYear(source.getFullYear())
    setMonthPickerTarget(target)
  }
  const chooseMonth = (monthIndex:number) => {
    const next=new Date(monthPickerYear,monthIndex,1)
    if(monthPickerTarget==='calendar') {
      pendingCalendarScrollRef.current=`${next.getFullYear()}-${next.getMonth()}`
      setVisibleMonth(next); setMobileActiveMonth(next)
    } else if(monthPickerTarget==='mood') setMoodMonth(next)
    setMonthPickerTarget(null)
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 620px)')
    const update = () => setIsMobileCalendar(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  const continuousMonths = useMemo(() => isMobileCalendar ? mobileMonths : [visibleMonth], [mobileMonths, visibleMonth, isMobileCalendar])

  useEffect(() => {
    if (!isMobileCalendar) return
    const found = mobileMonths.some(month => month.getFullYear()===visibleMonth.getFullYear() && month.getMonth()===visibleMonth.getMonth())
    if (found) return
    setMobileMonths(Array.from({length:7}, (_,index) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + index - 3, 1)))
  }, [visibleMonth, isMobileCalendar, mobileMonths])

  useLayoutEffect(() => {
    const pending = pendingPrependAnchorRef.current
    if (!pending) return
    const anchor = continuousCalendarRef.current?.querySelector<HTMLElement>(`[data-week-key="${pending.key}"]`)
    if (!anchor) return
    const delta = anchor.getBoundingClientRect().top - pending.top
    if (Math.abs(delta) > 0.5) window.scrollBy({top:delta,behavior:'auto'})
    pendingPrependAnchorRef.current = null
  }, [mobileMonths])

  useLayoutEffect(() => {
    if (!isMobileCalendar || mainView !== 'calendar') return

    // The first mobile-calendar layout can run before the day cells / sticky
    // chrome are measurable. Keep the pending target alive and retry on the
    // next animation frames; only consume it after a real scroll succeeds.
    // This also makes initial entry use the exact same positioning path as the
    // Today button without introducing scroll-driven React state.
    let frame = 0
    let attempts = 0
    const maxAttempts = 24

    const positionPendingTarget = () => {
      const pending = pendingCalendarScrollRef.current
      if (!pending) return

      if (pending.startsWith('date:')) {
        const dateKey = pending.slice(5)
        const target = continuousCalendarRef.current?.querySelector<HTMLElement>(`.day-cell[data-date-key="${dateKey}"]`)
        const sticky = document.querySelector<HTMLElement>('.calendar-sticky-header')
        const bottomNav = document.querySelector<HTMLElement>('.bottom-nav')
        const dayDrawer = document.querySelector<HTMLElement>('.day-drawer')
        if (target && sticky) {
          const rect = target.getBoundingClientRect()
          const stickyBottom = sticky.getBoundingClientRect().bottom
          const lowerBoundary = dayDrawer?.getBoundingClientRect().top ?? bottomNav?.getBoundingClientRect().top ?? window.innerHeight
          const usableCenter = stickyBottom + Math.max(0, lowerBoundary - stickyBottom) / 2
          const delta = rect.top + rect.height / 2 - usableCenter
          if (Math.abs(delta) > 1) window.scrollBy({top:delta, behavior:'auto'})
          pendingCalendarScrollRef.current = null
          setMobileCalendarPositionReady(true)
          return
        }
      } else {
        const target = continuousCalendarRef.current?.querySelector<HTMLElement>(`[data-month-key="${pending}"]`)
        if (target) {
          target.scrollIntoView({block:'start', behavior:'auto'})
          pendingCalendarScrollRef.current = null
          setMobileCalendarPositionReady(true)
          return
        }
      }

      attempts += 1
      if (attempts < maxAttempts) frame = window.requestAnimationFrame(positionPendingTarget)
    }

    // Start after one painted frame so the mobile calendar and sticky controls
    // have completed their initial geometry.
    frame = window.requestAnimationFrame(positionPendingTarget)
    return () => window.cancelAnimationFrame(frame)
  }, [visibleMonth, isMobileCalendar, mainView, continuousMonths])

  useEffect(() => {
    if (!isMobileCalendar || mainView !== 'calendar' || dayDetailOpen || !mobileCalendarPositionReady) return
    const nodes = Array.from(continuousCalendarRef.current?.querySelectorAll<HTMLElement>('.continuous-week-section') ?? [])
    if (!nodes.length) return
    const observer = new IntersectionObserver(entries => {
      const candidates = entries.filter(entry => entry.isIntersecting)
        .sort((a,b) => Math.abs(a.boundingClientRect.top - 170) - Math.abs(b.boundingClientRect.top - 170))
      const node = candidates[0]?.target as HTMLElement | undefined
      if (!node) return
      const year=Number(node.dataset.year), month=Number(node.dataset.month)
      if (!Number.isFinite(year) || !Number.isFinite(month)) return
      setMobileActiveMonth(current =>
        current.getFullYear()===year && current.getMonth()===month ? current : new Date(year,month,1)
      )

      const index = nodes.indexOf(node)
      if (index >= nodes.length - 2) {
        setMobileMonths(current => {
          const last=current[current.length-1]
          const additions=Array.from({length:4},(_,offset)=>new Date(last.getFullYear(),last.getMonth()+offset+1,1))
          return [...current,...additions]
        })
      } else if (index <= 1) {
        const firstNode=nodes[0]
        if (firstNode && !pendingPrependAnchorRef.current) {
          pendingPrependAnchorRef.current={key:firstNode.dataset.weekKey ?? '',top:firstNode.getBoundingClientRect().top}
          setMobileMonths(current => {
            const first=current[0]
            const additions=Array.from({length:4},(_,offset)=>new Date(first.getFullYear(),first.getMonth()-(4-offset),1))
            return [...additions,...current]
          })
        }
      }
    }, {root:null, rootMargin:'-150px 0px -55% 0px', threshold:[0,.01,.2]})
    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [continuousMonths, isMobileCalendar, mainView, dayDetailOpen, mobileCalendarPositionReady])

  // Keep the mini mood calendar anchored to the day currently opened in Day Detail.
  // It can still be browsed independently afterwards with its own month arrows.
  useEffect(() => {
    if (!selectedDate) return
    setMoodMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [selectedDate])

  useEffect(() => () => {
    if (dayDetailCloseTimerRef.current !== null) window.clearTimeout(dayDetailCloseTimerRef.current)
  }, [])

  useEffect(() => {
    let active = true
    loadTasks<Task>().then(storedTasks => {
      if (!active) return
      setTasks(storedTasks.map(task => normalizeTaskScheduling({ ...task, date: task.date || null, endDate: task.endDate || undefined })))
      setTasksHydrated(true)
    }).catch(error => {
      console.error('Failed to load tasks from IndexedDB', error)
    })
    return () => { active = false }
  }, [])

  const setMood = (level: MoodLevel) => {
    if (!selectedDate) return
    const date = toDateKey(selectedDate)
    const updatedAt = new Date().toISOString()
    setDailyMoods(current => toggleDailyMood(current, date, level, updatedAt))
  }

  const setEnergy = (level: EnergyLevel) => {
    if (!selectedDate) return
    const date = toDateKey(selectedDate)
    const updatedAt = new Date().toISOString()
    setDailyEnergy(current => toggleDailyEnergy(current, date, level, updatedAt))
  }

  const setEnvironmentChoice = (kind:'weather'|'thermal', optionId:string) => {
    if (!selectedDate) return
    const date=toDateKey(selectedDate), now=new Date().toISOString()
    setDailyEnvironment(current=>patchEnvironmentChoice(current,date,kind,optionId,now))
  }

  const saveEnvironmentLocation = (city:string, country?:string) => {
    if(!selectedDate) return
    const date=toDateKey(selectedDate), now=new Date().toISOString()
    setDailyEnvironment(current=>patchEnvironmentLocation(current,date,city,country,now))
  }

  const editPastEnvironmentLocation = () => {
    const city=window.prompt('补录当天所在城市',selectedEnvironment?.locationCity||'')
    if(city===null) return
    const trimmed=city.trim()
    if(!trimmed){saveEnvironmentLocation('');return}
    const country=window.prompt('国家 / 地区（可留空）',selectedEnvironment?.locationCountry||'')
    if(country===null) return
    saveEnvironmentLocation(trimmed,country)
  }

  const locateTodayEnvironment = () => {
    if(!selectedDate || toDateKey(selectedDate)!==toDateKey(new Date())) return
    if(!navigator.geolocation){window.alert('当前浏览器不支持定位');return}
    navigator.geolocation.getCurrentPosition(async position=>{
      try{
        const {latitude,longitude}=position.coords
        const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1`,{headers:{'Accept':'application/json'}})
        if(!response.ok) throw new Error(`HTTP ${response.status}`)
        const data=await response.json() as {address?:Record<string,string>}
        const address=data.address||{}
        const country=address.country
        const municipalityNames=['北京','上海','天津','重庆']
        const normalizePlace=(value?:string)=>value?.replace(/(特别行政区|市)$/,'').trim()
        const candidates=[address.city,address.municipality,address.state,address.region,address.province].map(normalizePlace).filter((value):value is string=>Boolean(value))
        const municipality=candidates.find(value=>municipalityNames.includes(value))
        const district=normalizePlace(address.city_district||address.district||address.county)
        const primary=municipality||candidates[0]||normalizePlace(address.town)||normalizePlace(address.village)||district
        if(!primary) throw new Error('未识别到城市')
        const locationName=municipality&&district&&district!==municipality ? `${municipality} · ${district}` : primary
        saveEnvironmentLocation(locationName,country)
      }catch(error){
        console.error('Failed to resolve location',error)
        window.alert('已获取位置，但没有识别到城市。')
      }
    },error=>{
      console.error('Failed to get location',error)
      window.alert(error.code===1?'没有获得定位权限。':'暂时无法获取当前位置。')
    },{enableHighAccuracy:false,timeout:10000,maximumAge:300000})
  }

  const handleEnvironmentLocation = () => {
    if(!selectedDate) return
    const date=toDateKey(selectedDate)
    if(date===toDateKey(new Date())){
      if(selectedEnvironment?.locationCity){
        const action=window.confirm(`当前记录：${selectedEnvironment.locationCity}${selectedEnvironment.locationCountry?` · ${selectedEnvironment.locationCountry}`:''}\n\n确定要用当前位置重新定位吗？`)
        if(!action) return
      }
      locateTodayEnvironment()
      return
    }
    editPastEnvironmentLocation()
  }

  const environmentOptionUsed = (kind:'weather'|'thermal', id:string) => isEnvironmentOptionUsed(dailyEnvironment,kind,id)
  const updateEnvironmentOptions = (kind:'weather'|'thermal', updater:(rows:EnvironmentOption[])=>EnvironmentOption[]) => {
    if(kind==='weather') setWeatherOptions(updater)
    else setThermalOptions(updater)
  }
  const addEnvironmentOption = (kind:'weather'|'thermal') => {
    const label=kind==='weather'?'天气':'体感'
    const name=window.prompt(`添加${label}选项`)?.trim()
    if(!name) return
    const emoji=window.prompt(`给「${name}」设置 Emoji（可留空）`,'')?.trim()||undefined
    const rows=kind==='weather'?weatherOptions:thermalOptions
    if(environmentOptionNameTaken(rows,name)){window.alert('已经有同名选项了');return}
    const now=new Date().toISOString()
    updateEnvironmentOptions(kind,current=>createEnvironmentOption(current,kind,crypto.randomUUID(),name,emoji,now))
  }
  const editEnvironmentEmoji = (kind:'weather'|'thermal', item:EnvironmentOption) => {
    const emoji=window.prompt(`修改「${item.name}」的 Emoji（留空则不显示）`,item.emoji||'')
    if(emoji===null) return
    updateEnvironmentOptions(kind,current=>patchEnvironmentOption(current,item.id,{emoji:emoji.trim()||undefined},new Date().toISOString()))
  }
  const renameEnvironmentOption = (kind:'weather'|'thermal', item:EnvironmentOption) => {
    const name=window.prompt('修改名称',item.name)?.trim()
    if(!name||name===item.name) return
    const rows=kind==='weather'?weatherOptions:thermalOptions
    if(environmentOptionNameTaken(rows,name,item.id)){window.alert('已经有同名选项了');return}
    updateEnvironmentOptions(kind,current=>patchEnvironmentOption(current,item.id,{name},new Date().toISOString()))
  }
  const toggleArchiveEnvironmentOption = (kind:'weather'|'thermal', item:EnvironmentOption) => updateEnvironmentOptions(kind,current=>patchEnvironmentOption(current,item.id,{archived:!item.archived},new Date().toISOString()))
  const deleteEnvironmentOption = (kind:'weather'|'thermal', item:EnvironmentOption) => {
    if(item.builtin||environmentOptionUsed(kind,item.id)) return
    if(!window.confirm(`彻底删除“${item.name}”？`)) return
    const now=new Date().toISOString()
    updateEnvironmentOptions(kind,current=>markEnvironmentOptionDeleted(current,item.id,now))
  }
  const moveEnvironmentOption = (kind:'weather'|'thermal', item:EnvironmentOption, direction:-1|1) => {
    updateEnvironmentOptions(kind,current=>reorderEnvironmentOption(current,item.id,direction,new Date().toISOString()))
  }

  const addEmotionOption = (group: EmotionGroup) => {
    const name=window.prompt(`添加${EMOTION_GROUP_LABEL[group]}感受`)?.trim(); if(!name) return
    if(emotionNameTaken(emotionOptions,name)){window.alert('已经有同名感受了');return}
    setEmotionOptions(current=>createEmotionOption(current,crypto.randomUUID(),name,group,new Date().toISOString()))
    setEmotionManagerExpanded(group)
  }
  const renameEmotionOption = (item:EmotionOption) => {
    if(item.builtin) return
    const name=window.prompt('修改名称',item.name)?.trim(); if(!name||name===item.name) return
    if(emotionNameTaken(emotionOptions,name,item.id)){window.alert('已经有同名感受了');return}
    setEmotionOptions(current=>updateEmotionOption(current,item.id,{name},new Date().toISOString()))
  }
  const changeEmotionGroup = (item:EmotionOption, group:EmotionGroup) => {
    if(item.builtin || group===item.group) return
    setEmotionOptions(current=>updateEmotionOption(current,item.id,{group},new Date().toISOString()))
  }
  const toggleArchiveEmotionOption = (item:EmotionOption) => setEmotionOptions(current=>updateEmotionOption(current,item.id,{archived:!item.archived},new Date().toISOString()))
  const removeEmotionOption = (item:EmotionOption) => {
    if(item.builtin||journalEntries.some(entry=>(entry.emotionIds??[]).includes(item.id))) return
    if(!window.confirm(`彻底删除“${item.name}”？`)) return
    setEmotionOptions(current=>deleteEmotionOption(current,item.id,new Date().toISOString()))
  }

  const periodForDate = (key:string) => findPeriodForDate(menstrualPeriods, key, toDateKey(today))
  const startPeriod = () => {
    if (!selectedDate) return
    const key=toDateKey(selectedDate)
    const activePeriod=menstrualPeriods
      .filter(period=>!period.endDate)
      .sort((a,b)=>b.startDate.localeCompare(a.startDate))[0]
    if(activePeriod){
      const goToPrevious=window.confirm(`上一次月经（${activePeriod.startDate} 开始）还没有结束。\n\n请先回到上一次月经记录并标记结束，再开始新的月经。\n\n点击“确定”查看上一次月经。`)
      if(goToPrevious){ cancelDayDetailCloseTimer(); setDayDetailClosing(false); setSelectedDate(fromDateKey(activePeriod.startDate)); setDayDetailOpen(true) }
      return
    }
    const now=new Date().toISOString()
    setMenstrualPeriods(current => [...current, { id:crypto.randomUUID(), startDate:key, dayLogs:[], createdAt:now, updatedAt:now }])
  }
  const updatePeriod = (periodId:string, updater:(period:MenstrualPeriod)=>MenstrualPeriod) => {
    setMenstrualPeriods(current => current.map(period => period.id===periodId ? {...updater(period),updatedAt:new Date().toISOString()} : period))
  }
  const endPeriod = (periodId:string, date:string) => updatePeriod(periodId, period => ({...period,endDate:date}))
  const deletePeriod = (periodId:string) => {
    if (!window.confirm('删除这次月经记录？此操作不会影响其他日期。')) return
    setMenstrualPeriods(current => current.filter(period => period.id !== periodId))
  }
  const updatePeriodDayLog = (periodId:string, date:string, patch:Partial<MenstrualDayLog>) => updatePeriod(periodId, period => patchPeriodDayLog(period, date, patch))

  const openJournalEditor = () => {
  const date = selectedDate ?? today
  setEditingJournalId(null)
  setJournalDraft(emptyJournalDraft(date))
  setJournalEditorOpen(true)
  }

  const editJournal = (entry: JournalEntry) => {
  setEditingJournalId(entry.id)
  setJournalDraft({ date: entry.date, title: entry.title || entry.content.slice(0, 60) || '记录', content: entry.title ? entry.content : '', impact: entry.impact, emotionIds: sanitizeEmotionIds(entry.emotionIds, emotionOptions), tagIds: entry.tagIds?.length ? entry.tagIds : [DEFAULT_TAG_ID], attachments: entry.attachments ?? [] })
  setJournalEditorOpen(true)
  }

  const closeJournalEditor = () => {
  setJournalEditorOpen(false)
  setEditingJournalId(null)
  }

  const sendJournalMessage = (journalId:string) => {
    const content=journalMessageDraft.trim()
    if(!content) return
    const now=new Date().toISOString()
    const message:JournalMessage={id:crypto.randomUUID(),content,createdAt:now}
    setJournalEntries(current=>current.map(entry=>entry.id===journalId?{...entry,messages:appendJournalMessage(entry.messages,message),updatedAt:now}:entry))
    setJournalMessageDraft('')
  }

  const saveJournal = () => {
  const title = journalDraft.title.trim()
  if (!title) return
  const content = journalDraft.content.trim()
  const now = new Date().toISOString()
  const fields = {
    date: journalDraft.date,
    title, content, impact: journalDraft.impact, emotionIds: sanitizeEmotionIds(journalDraft.emotionIds, emotionOptions),
    tagIds: journalDraft.tagIds.length ? journalDraft.tagIds : [DEFAULT_TAG_ID],
    attachments: journalDraft.attachments,
  }
  if (editingJournalId) {
    setJournalEntries(current => current.map(entry => {
      if (entry.id !== editingJournalId) return entry
      const nextKeys = new Set(journalDraft.attachments.map(a => a.storageKey))
      const tombstones = { ...(entry.attachmentLinkTombstones ?? {}) }
      ;(entry.attachments ?? []).forEach(a => { if (!nextKeys.has(a.storageKey)) tombstones[a.storageKey] = now })
      journalDraft.attachments.forEach(a => { delete tombstones[a.storageKey] })
      return { ...entry, ...fields, attachmentLinkTombstones: tombstones, updatedAt: now }
    }))
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
      const id = crypto.randomUUID(), storageKey = `attachment:${id}`
      await putAttachmentBlob(storageKey, blob)
      added.push({ id, type: 'image', filename: file.name, mimeType: blob.type || 'image/webp', size: blob.size, storageKey, createdAt: new Date().toISOString() })
    }
    if (added.length) setJournalDraft(current => ({ ...current, attachments: [...current.attachments, ...added] }))
  }

  const addNoteImages = async (noteId: string, files: FileList | null) => {
    if (!files?.length) return
    const note = notes.find(row => row.id === noteId && !row.trashedAt)
    if (!note) return
    const room = Math.max(0, 9 - (note.attachments ?? []).filter(a => a.type === 'image').length)
    const added: Attachment[] = []
    for (const file of Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, room)) {
      const blob = await compressImage(file)
      const id = crypto.randomUUID(), storageKey = `attachment:${id}`, createdAt = new Date().toISOString()
      await putAttachmentBlob(storageKey, blob)
      added.push({ id, type: 'image', filename: file.name, mimeType: blob.type || 'image/webp', size: blob.size, storageKey, createdAt })
    }
    if (!added.length) return
    const now = new Date().toISOString()
    setNotes(rows => rows.map(row => {
      if (row.id !== noteId) return row
      const tombstones = { ...(row.attachmentLinkTombstones ?? {}) }
      added.forEach(item => { delete tombstones[item.storageKey] })
      return { ...row, attachments: [...(row.attachments ?? []), ...added], attachmentLinkTombstones: tombstones, updatedAt: now }
    }))
  }

  const removeJournalAttachment = async (attachment: Attachment) => {
    // Unlink only. The same binary may be referenced by another task/journal.
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
        const id = crypto.randomUUID(), storageKey = `attachment:${id}`
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
    const now = new Date().toISOString()
    setJournalEntries(current => current.map(entry => entry.id === id ? { ...entry, trashedAt: now, updatedAt: now } : entry))
    setViewingJournalId(current => current === id ? null : current)
  }

  useEntityPersistence('task', tasks, tasksHydrated, setLocalWriteRevision)

  useEffect(() => {
    let active = true
    Promise.all([loadNotebooks<Notebook>(), loadNotes<Note>()]).then(([bookRows,noteRows])=>{
      if(!active) return
      const books=ensureDefaultNotebook(bookRows)
      setNotebooks(books); setNotes(normalizeNotes(noteRows,new Set(books.map(book=>book.id))))
      setNotebooksHydrated(true); setNotesHydrated(true)
    }).catch(error=>{console.error('Failed to load notes',error);})
    loadJournalEntries<JournalEntry>().then(rows => {
      if (!active) return
      setJournalEntries(rows.map(entry => entry.title ? entry : ({ ...entry, title: entry.content?.slice(0, 60) || '记录', content: '' })))
      setJournalHydrated(true)
    }).catch(error => {
      console.error('Failed to load journal entries from IndexedDB', error)
    })
    loadTags<Tag>().then(rows => {
      if (!active) return
      const normalizedRows = normalizeTags(rows)
      const healedRows = ensureRequiredSystemTags(normalizedRows)
      // System provenance tags are schema-level records. Recreate them if an older
      // sync/clear path dropped their definitions, while preserving task tagIds.
      setTags(healedRows)
      setTagsHydrated(true)
    }).catch(error => {
      console.error('Failed to load tags', error)
    })
    loadAnniversaries<Anniversary>().then(rows => {
      if (!active) return
      setAnniversaries(rows)
      setAnniversariesHydrated(true)
    }).catch(error => {
      console.error('Failed to load anniversaries', error)
    })
    loadDailyMoods<DailyMood>().then(rows => {
      if (!active) return
      setDailyMoods(rows)
      setMoodsHydrated(true)
    }).catch(error => {
      console.error('Failed to load daily moods from IndexedDB', error)
    })
    loadDailyEnergy<DailyEnergy>().then(rows => {
      if (!active) return
      setDailyEnergy(rows); setEnergyHydrated(true)
    }).catch(error => { console.error('Failed to load daily energy',error); })
    loadDailyEnvironment<DailyEnvironment>().then(rows => {
      if (!active) return
      setDailyEnvironment(rows); setEnvironmentHydrated(true)
    }).catch(error => { console.error('Failed to load daily environment',error); })
    loadMenstrualPeriods<MenstrualPeriod>().then(rows => {
      if (!active) return
      setMenstrualPeriods(rows); setPeriodsHydrated(true)
    }).catch(error => { console.error('Failed to load menstrual periods',error); })
    loadFocusSessions<FocusSession>().then(rows => {
      if (!active) return
      setFocusSessions(rows); setFocusHydrated(true)
    }).catch(error => { console.error('Failed to load focus sessions',error); })
    return () => { active = false }
  }, [])

  useEntityPersistence('focus', focusSessions, focusHydrated, setLocalWriteRevision)

  useEntityPersistence('anniversary', anniversaries, anniversariesHydrated, setLocalWriteRevision)

  useEntityPersistence('notebook', notebooks, notebooksHydrated, setLocalWriteRevision)
  useEntityPersistence('note', notes, notesHydrated, setLocalWriteRevision)

  useEntityPersistence('journal', journalEntries, journalHydrated, setLocalWriteRevision)

  useEntityPersistence('tag', tags, tagsHydrated, setLocalWriteRevision)

  useEntityPersistence('mood', dailyMoods, moodsHydrated, setLocalWriteRevision)

  useEntityPersistence('energy', dailyEnergy, energyHydrated, setLocalWriteRevision)

  useEntityPersistence('environment', dailyEnvironment, environmentHydrated, setLocalWriteRevision)

  useEntityPersistence('period', menstrualPeriods, periodsHydrated, setLocalWriteRevision)

  useEffect(() => {
    loadGitHubDeviceCredential().then(saved => {
      if (saved?.token) { setGithubSyncToken(saved.token); setGithubTokenSaved(true) }
    }).catch(error => console.error('Failed to load GitHub device credential', error))
  }, [])

  useEffect(() => { writeLocalCache('zing:weatherOptions', JSON.stringify(weatherOptions)) }, [weatherOptions])
  useEffect(() => { writeLocalCache('zing:thermalOptions', JSON.stringify(thermalOptions)) }, [thermalOptions])
  useEffect(() => { writeLocalCache('zing:emotionOptions', JSON.stringify(emotionOptions)) }, [emotionOptions])
  useEffect(() => { writeLocalCache('zing:wordCloudIgnored', JSON.stringify(wordCloudIgnored)) }, [wordCloudIgnored])
  useEffect(() => { writeLocalCache('zing:encouragementMessages', JSON.stringify(encouragementMessages)) }, [encouragementMessages])
  useEffect(() => { writeLocalCache('zing:encouragementStyle', encouragementStyle) }, [encouragementStyle])
  useEffect(() => { writeLocalCache('zing:keepScreenAwakeDuringFocus', String(keepScreenAwakeDuringFocus)) }, [keepScreenAwakeDuringFocus])
  useEffect(()=>{writeLocalCache('zing:randomPoolGroups',JSON.stringify(randomPoolGroups))},[randomPoolGroups])
  useEffect(()=>{writeLocalCache('zing:randomPoolItems',JSON.stringify(randomPoolItems))},[randomPoolItems])
  useEffect(()=>{const live=new Set(randomPoolItems.map(item=>item.id));const clean=mixedPoolItemIds.filter(id=>live.has(id));if(clean.length!==mixedPoolItemIds.length){setMixedPoolItemIds(clean);return}writeLocalCache('zing:mixedPoolItemIds',JSON.stringify(clean))},[randomPoolItems,mixedPoolItemIds])
  useEffect(() => { writeLocalCache('zing:modulePriority', JSON.stringify(moduleOrder)) }, [moduleOrder])
  useEffect(() => {writeLocalCache('zing:daySectionOrder',JSON.stringify(daySectionOrder))},[daySectionOrder])
  useEffect(() => {writeLocalCache('zing:settingsGroupOrder',JSON.stringify(settingsGroupOrder))},[settingsGroupOrder])
  useEffect(() => { writeLocalCache('zing:inboxSortOrder', JSON.stringify(inboxSortOrder)) }, [inboxSortOrder])
  useEffect(() => { if (mobileNavConfigured) saveLocalNavigation(mobileNav) }, [mobileNav, mobileNavConfigured])
  useEffect(() => {
    const now = new Date().toISOString()
    const clocks = advanceWordClock(wordCloudIgnored, settingsWordClockRef.current, now)
    settingsWordClockRef.current = clocks
    const next = buildSyncedSettings({
      greeting, weekStartsMonday, dateFormat, defaultPriority, showEndedTasks, showAllRecurringTasks,
      excludeDefaultFocusStats, wordCloudIgnored, encouragementMessages, encouragementStyle, maxFocusHours, keepScreenAwakeDuringFocus, weatherOptions, thermalOptions, emotionOptions, randomPoolGroups, randomPoolItems, mixedPoolItemIds, defaultMobileNavigation: syncedDefaultMobileNav, modulePriority: moduleOrder, daySectionOrder, settingsGroupOrder,
    }, clocks, now)
    if (!settingsSyncReadyRef.current) {
      settingsSyncReadyRef.current = true
      void loadUserSettings<SyncedUserSettings>().then(async rows => {
        if (rows.length) {
          const existing=rows[0]
          settingsWordClockRef.current=hydrateWordClock(existing, now)
          if (existing.defaultMobileNavigation) receiveDefaultMobileNav(existing.defaultMobileNavigation)
          if (existing.modulePriority) setModuleOrder(normalizeModuleOrder(existing.modulePriority))
          if (existing.daySectionOrder) setDaySectionOrder(normalizeDaySectionOrder(existing.daySectionOrder))
          if (existing.settingsGroupOrder) setSettingsGroupOrder(normalizeSettingsGroupOrder(existing.settingsGroupOrder))
          syncSnapshotsRef.current.settings = rows; syncSnapshotReadyRef.current.settings = true; return
        }
        await saveUserSettings([next])
        syncSnapshotsRef.current.settings = [next]
        syncSnapshotReadyRef.current.settings = true
        setLocalWriteRevision(value => value + 1)
      }).catch(error => console.error('Failed to initialize settings sync', error))
      return
    }
    if (suppressNextSettingsSyncRef.current) { suppressNextSettingsSyncRef.current = false; return }
    if (!syncSnapshotReadyRef.current.settings) return
    const previous = syncSnapshotsRef.current.settings
    if (settingsEqualIgnoringUpdatedAt(previous[0], next)) return
    syncSnapshotsRef.current.settings = [next]
    void saveEntityWithSync('settings',[next]).then(changed=>{if(changed)setLocalWriteRevision(value=>value+1)}).catch(error=>console.error('Failed to save settings sync',error))
  }, [greeting,weekStartsMonday,dateFormat,defaultPriority,showEndedTasks,showAllRecurringTasks,excludeDefaultFocusStats,wordCloudIgnored,encouragementMessages,encouragementStyle,maxFocusHours,keepScreenAwakeDuringFocus,weatherOptions,thermalOptions,emotionOptions,randomPoolGroups,randomPoolItems,mixedPoolItemIds,syncedDefaultMobileNav,moduleOrder,daySectionOrder,settingsGroupOrder])
  useEffect(() => { writeLocalCache('zing:githubSyncOwner', githubSyncOwner) }, [githubSyncOwner])
  useEffect(() => { writeLocalCache('zing:githubSyncRepo', githubSyncRepo) }, [githubSyncRepo])
  useEffect(() => { writeLocalCache('zing:githubSyncBranch', githubSyncBranch) }, [githubSyncBranch])
  useEffect(() => {
    if (mainView !== 'settings' || !tasksHydrated || !journalHydrated || !notesHydrated) return
    // Opening Settings is read-only; unlinked in-flight blobs must not be garbage-collected.
    getStorageStats()
      .then(setStorageStats)
      .catch(error => console.error('Failed to clean or calculate storage', error))
  }, [mainView, tasks, journalEntries, notes, dailyMoods, tags, anniversaries, tasksHydrated, journalHydrated, notesHydrated])

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

  const activeTasks = useMemo(() => tasks.filter(task => !task.trashedAt), [tasks])
  const inboxTasks = useMemo(() => activeTasks.filter(task => task.date === null && (showEndedTasks || task.status === 'todo')), [activeTasks, showEndedTasks])
  const inboxTodoGroups = useMemo(() => groupInboxTodoTasks(inboxTasks.filter(task => task.status === 'todo'), inboxSortOrder, tags), [inboxTasks, inboxSortOrder, tags])
  const inboxCompletedTasks = useMemo(() => sortCompletedInboxTasks(inboxTasks.filter(task => task.status !== 'todo')), [inboxTasks])
  const activeJournalEntries = useMemo(() => filterActiveJournalEntries(journalEntries), [journalEntries])
  const activeAnniversaries = useMemo(() => anniversaries.filter(anniversary => !anniversary.trashedAt), [anniversaries])

  const trashItems = useMemo<TrashItem[]>(() => {
    const items:TrashItem[]=[]
    tasks.forEach(task => {
      if (task.trashedAt) { items.push({key:`task:series:${task.id}`,entity:'task',kind:'series',task,trashedAt:task.trashedAt}); return }
      if (task.trashFuture) items.push({key:`task:future:${task.id}:${task.trashFuture.from}`,entity:'task',kind:'future',task,occurrenceDate:task.trashFuture.from,trashedAt:task.trashFuture.trashedAt});
      ;(Object.entries(task.recurrenceExceptions ?? {}) as [string, RecurrenceException][]).forEach(([date, exception]) => {
        if (exception.trashedAt) items.push({key:`task:occurrence:${task.id}:${date}`,entity:'task',kind:'occurrence',task,occurrenceDate:date,trashedAt:exception.trashedAt})
      })
    })
    journalEntries.forEach(journal => { if (journal.trashedAt) items.push({key:`journal:${journal.id}`,entity:'journal',journal,trashedAt:journal.trashedAt}) })
    anniversaries.forEach(anniversary => { if (anniversary.trashedAt) items.push({key:`anniversary:${anniversary.id}`,entity:'anniversary',anniversary,trashedAt:anniversary.trashedAt}) })
    notes.forEach(note => { if (note.trashedAt) items.push({key:`note:${note.id}`,entity:'note',note,trashedAt:note.trashedAt}) })
    focusSessions.forEach(session => { if (session.trashedAt && !session.trashedByTaskId && !session.trashedByNoteId && !session.trashedByHabitId) items.push({key:`focus:${session.id}`,entity:'focus',session,trashedAt:session.trashedAt}) })
    habits.forEach(habit => { if(habit.deletedAt) items.push({key:`habit:${habit.id}`,entity:'habit',habit,trashedAt:habit.deletedAt}) })
    return items.sort((a,b)=>b.trashedAt.localeCompare(a.trashedAt))
  },[tasks,journalEntries,anniversaries,notes,focusSessions,habits])
  const trashTaskStatus = (item: Extract<TrashItem,{entity:'task'}>): TaskStatus => item.kind === 'occurrence' && item.occurrenceDate
    ? (item.task.recurrenceExceptions?.[item.occurrenceDate]?.status ?? item.task.status)
    : item.task.status
  const visibleTrashItems = useMemo(() => {
    const filtered = trashFilter === 'all' ? trashItems : trashItems.filter(item => item.entity === trashFilter)
    return showEndedTasks ? filtered : filtered.filter(item => item.entity !== 'task' || trashTaskStatus(item) === 'todo')
  }, [trashItems, trashFilter, showEndedTasks])
  const trashTaskGroups = useMemo(() => {
    if (trashFilter !== 'task') return null
    const taskItems = visibleTrashItems.filter((item): item is Extract<TrashItem,{entity:'task'}> => item.entity === 'task')
    return { active: taskItems.filter(item => trashTaskStatus(item) === 'todo'), ended: taskItems.filter(item => trashTaskStatus(item) !== 'todo') }
  }, [visibleTrashItems, trashFilter])

  const displayTasks = useMemo(() => {
    const start = toDateKey(days[0].date)
    const end = toDateKey(days[days.length - 1].date)
    const expanded = applyRecurringDisplayMode(expandTasks(activeTasks, start, end), activeTasks, showAllRecurringTasks)
    return showEndedTasks ? expanded : expanded.filter(task => task.status === 'todo')
  }, [activeTasks, days, showEndedTasks, showAllRecurringTasks])

  const overdueTasks = useMemo(() => {
    const todayKey=toDateKey(today)
    const yesterday=addDaysKey(todayKey,-1)
    const scheduled=activeTasks.filter((task): task is Task & { date:string } => Boolean(task.date))
    if(!scheduled.length) return [] as Task[]
    const earliest=scheduled.reduce((min,task)=>task.date<min?task.date:min,scheduled[0].date)
    return applyRecurringDisplayMode(expandTasks(scheduled,earliest,yesterday),scheduled,showAllRecurringTasks)
      .filter(task=>isTaskOverdue(task,todayKey))
      .sort((a,b)=>taskEndDate(a).localeCompare(taskEndDate(b)) || b.priority-a.priority || a.title.localeCompare(b.title,'zh-CN'))
  },[activeTasks,today,showAllRecurringTasks])

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return []
    const key = toDateKey(selectedDate)
    const pool = key >= toDateKey(days[0].date) && key <= toDateKey(days[days.length - 1].date)
      ? displayTasks
      : applyRecurringDisplayMode(expandTasks(activeTasks, key, key), activeTasks, showAllRecurringTasks)
    return pool.filter(task => taskCoversDate(task, key) && (showEndedTasks || task.status === 'todo')).sort(taskSort)
  }, [selectedDate, tasks, displayTasks, days, showEndedTasks, showAllRecurringTasks])

  const selectedFocusSeconds = useMemo(() => {
    if (!selectedDate) return 0
    return combinedFocusSecondsByDate(activeTasks, focusSessions, timerNow, undefined, notes).get(toDateKey(selectedDate)) ?? 0
  }, [selectedDate, activeTasks, notes, focusSessions, timerNow])

  const focusHistoryRecords = useMemo(() => {
    if (!focusHistoryDate) return []
    return focusHistoryForDate(activeTasks, notes, focusSessions, focusHistoryDate, timerNow)
  },[focusHistoryDate,activeTasks,notes,focusSessions,timerNow])

  const noteFocusHistory = useMemo(() => focusHistoryForNote(noteFocusHistoryId, notes, focusSessions, timerNow), [noteFocusHistoryId, notes, focusSessions, timerNow])
  const noteFocusHistoryNote = noteFocusHistory.note
  const noteFocusHistorySessions = noteFocusHistory.sessions
  const noteFocusHistorySeconds = noteFocusHistory.seconds
  const taskFocusHistory = useMemo(() => focusHistoryForTask(viewingTask, focusSessions, timerNow), [viewingTask, focusSessions, timerNow])
  const taskFocusHistorySessions = taskFocusHistory.sessions
  const taskFocusHistorySeconds = taskFocusHistory.seconds

  const { beginEditFocusSession, focusEditId, focusEditTagIds, focusHistoryEditFields, saveFocusSessionEdit, setFocusEditError, setFocusEditId, setFocusEditTagIds } = useFocusHistoryEditor({ focusSessions, maxFocusHours, setFocusSessions })

  const anniversaryOccurrencesByDate = useMemo(() => {
    const map = new Map<string, { anniversary: Anniversary; occurrence: Date }[]>()
    const years = Array.from(new Set(days.map(day => day.date.getFullYear())))
    activeAnniversaries.forEach(anniversary => years.forEach(year => {
      const occurrence = anniversaryOccurrence(anniversary, year)
      if (!occurrence) return
      const key = toDateKey(occurrence)
      const rows = map.get(key) ?? []
      rows.push({ anniversary, occurrence }); map.set(key, rows)
    }))
    return map
  }, [activeAnniversaries, days])

  const selectedAnniversaries = useMemo(() => {
    if (!selectedDate) return []
    const key=toDateKey(selectedDate)
    const cached=anniversaryOccurrencesByDate.get(key)
    if (cached) return cached
    return activeAnniversaries.map(anniversary => {
      const occurrence=anniversaryOccurrence(anniversary, selectedDate.getFullYear())
      return occurrence && toDateKey(occurrence)===key ? {anniversary, occurrence} : null
    }).filter(Boolean) as { anniversary: Anniversary; occurrence: Date }[]
  }, [selectedDate, activeAnniversaries, anniversaryOccurrencesByDate])

  const selectedJournalEntries = useMemo(() => {
    if (!selectedDate) return []
    return journalEntriesForDate(activeJournalEntries, toDateKey(selectedDate))
  }, [selectedDate, activeJournalEntries])

  const viewingJournal = viewingJournalId ? activeJournalEntries.find(entry => entry.id === viewingJournalId) ?? null : null
  useEffect(()=>{ setJournalMessageDraft('') },[viewingJournalId])
  const selectedMood = selectedDate ? dailyMoods.find(mood => mood.date === toDateKey(selectedDate)) : undefined
  const selectedImpactTotal = selectedJournalEntries.reduce((sum, entry) => sum + entry.impact, 0)
  const moodsByDate = useMemo(() => moodMap(dailyMoods), [dailyMoods])
  const journalDates = useMemo(() => new Set(activeJournalEntries.map(entry => entry.date)), [activeJournalEntries])
  const journalThreadDates = useMemo(() => new Set(activeJournalEntries.filter(entry => normalizeJournalMessages(entry.messages).length > 0).map(entry => entry.date)), [activeJournalEntries])
  const moodDays = useMemo(() => buildMonth(moodMonth.getFullYear(), moodMonth.getMonth(), weekStartsMonday), [moodMonth, weekStartsMonday])

  const { renderCalendarMonthGrid, renderCalendarWeek } = createCalendarRenderers({ activeAnniversaries, activeTasks, menstrualVisualForDate, openDay: date => openDay(date), openDayRef, selectedDate, showAllRecurringTasks, showEndedTasks, today, weekStartsMonday })

  const endedTasksViewToggle = (className='') => (
    <Field className={`ended-view-toggle ${className}`.trim()} title="显示或隐藏已完成和已放弃任务">
      <span>已结束</span>
      <input type="checkbox" checked={showEndedTasks} onChange={event=>setShowEndedTasks(event.target.checked)} />
      <i aria-hidden="true" />
    </Field>
  )

  const moveMonth = (offset: number) => {
    if (isMobileCalendar) {
      const next = new Date(mobileActiveMonth.getFullYear(), mobileActiveMonth.getMonth() + offset, 1)
      pendingCalendarScrollRef.current=`${next.getFullYear()}-${next.getMonth()}`
      setVisibleMonth(next); setMobileActiveMonth(next)
      return
    }
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const goToday = () => {
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth(), 1)
    if (isMobileCalendar) {
      pendingCalendarScrollRef.current=`date:${toDateKey(now)}`
      setVisibleMonth(month); setMobileActiveMonth(month)
      setSelectedDate(now)
      closeDayDetailImmediately()
      return
    }
    setVisibleMonth(month)
    setSelectedDate(now)
  }

  const cancelDayDetailCloseTimer = () => {
    if (dayDetailCloseTimerRef.current !== null) {
      window.clearTimeout(dayDetailCloseTimerRef.current)
      dayDetailCloseTimerRef.current = null
    }
  }

  const closeDayDetailImmediately = () => {
    cancelDayDetailCloseTimer()
    setDayDetailClosing(false)
    setDayDetailOpen(false)
    dayDetailOriginScrollRef.current=null
  }

  const closeDayDetail = () => {
    if (!dayDetailOpen || dayDetailClosing) return
    cancelDayDetailCloseTimer()
    setDayDetailClosing(true)
    dayDetailCloseTimerRef.current=window.setTimeout(() => {
      dayDetailCloseTimerRef.current=null
      setDayDetailOpen(false)
      setDayDetailClosing(false)
      dayDetailOriginScrollRef.current=null
    }, 260)
  }

  const openDay = (date: Date) => {
    const isMobile = window.matchMedia('(max-width: 760px)').matches

    // A date tap always means select/open. Closing is handled only by the
    // drawer backdrop/close button. This prevents a persistent selected date
    // from ever being interpreted as a "toggle closed" command.
    cancelDayDetailCloseTimer()
    if (dayDetailClosing) setDayDetailClosing(false)

    if (isMobile) {
      if (!dayDetailOpen) dayDetailOriginScrollRef.current=window.scrollY
      setSelectedDate(date)
      setDayDetailOpen(true)

      // Let React paint the sheet first so the tap gets immediate visual feedback.
      // Then move the real week row into position; CSS blocks user panning while the
      // detail is open, without any body-fixed coordinate changes or scroll polling.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const key=toDateKey(date)
          const cell=continuousCalendarRef.current?.querySelector<HTMLElement>(`.day-cell[data-date-key="${key}"]`)
          const sticky=document.querySelector<HTMLElement>('.calendar-sticky-header')
          if (!cell || !sticky) return
          const cellTop=cell.getBoundingClientRect().top
          const stickyBottom=sticky.getBoundingClientRect().bottom
          const target=Math.max(0,window.scrollY + cellTop - stickyBottom)
          if (Math.abs(window.scrollY-target) > 1) window.scrollTo({top:target,behavior:'auto'})
        })
      })
      return
    }

    setSelectedDate(date)
    setDayDetailOpen(true)
  }

  openDayRef.current = openDay

  // v1.2.0: derive one unique week stream from the loaded month window.
  const continuousCalendarContent = useMemo(() => {
    if (!continuousMonths.length) return null
    const firstMonth=continuousMonths[0], lastMonth=continuousMonths[continuousMonths.length-1]
    const firstGrid=buildMonth(firstMonth.getFullYear(),firstMonth.getMonth(),weekStartsMonday)
    const lastGrid=buildMonth(lastMonth.getFullYear(),lastMonth.getMonth(),weekStartsMonday)
    const start=new Date(firstGrid[0].date), end=new Date(lastGrid[lastGrid.length-1].date)
    const rangeStart=toDateKey(start), rangeEnd=toDateKey(end)
    // Expand recurrence once for the entire loaded mobile window instead of once
    // per visible week. This is the main hot path when the continuous calendar
    // grows in either direction.
    const expanded=applyRecurringDisplayMode(expandTasks(activeTasks,rangeStart,rangeEnd),activeTasks,showAllRecurringTasks)
    const preparedTasks=showEndedTasks?expanded:expanded.filter(task=>task.status==='todo')
    const preparedAnniversaries=new Map<string,{anniversary:Anniversary;occurrence:Date}[]>()
    const startYear=start.getFullYear(), endYear=end.getFullYear()
    activeAnniversaries.forEach(anniversary=>{
      for(let year=startYear;year<=endYear;year+=1){
        const occurrence=anniversaryOccurrence(anniversary,year); if(!occurrence) continue
        const key=toDateKey(occurrence); if(key<rangeStart||key>rangeEnd) continue
        const rows=preparedAnniversaries.get(key)??[]; rows.push({anniversary,occurrence}); preparedAnniversaries.set(key,rows)
      }
    })
    const weeks:{days:CalendarDay[];key:string;activeMonth:Date}[]=[]
    for(let cursor=new Date(start);cursor<=end;cursor.setDate(cursor.getDate()+7)){
      const days=Array.from({length:7},(_,index)=>{const date=new Date(cursor);date.setDate(cursor.getDate()+index);return {date,inCurrentMonth:true}})
      const middle=days[3].date
      const activeMonth=new Date(middle.getFullYear(),middle.getMonth(),1)
      weeks.push({days,key:toDateKey(days[0].date),activeMonth})
    }
    return weeks.map(week=>{
      const activeKey=`${week.activeMonth.getFullYear()}-${week.activeMonth.getMonth()}`
      return <section className="continuous-week-section" key={week.key} data-week-key={week.key} data-year={week.activeMonth.getFullYear()} data-month={week.activeMonth.getMonth()}>
        <div data-active-month-key={activeKey}>{renderCalendarWeek(week.days,preparedTasks,preparedAnniversaries)}</div>
      </section>
    })
  }, [continuousMonths,tasks,showEndedTasks,showAllRecurringTasks,activeAnniversaries,menstrualPeriods,menstrualPrediction,weekStartsMonday,today,isMobileCalendar,selectedDate])

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
    if (anniversaryDraft.type!=='birthday' && !anniversaryDraft.year) return
    const now=new Date().toISOString()
    const fields={ title, type:anniversaryDraft.type, calendar:anniversaryDraft.calendar, year:anniversaryDraft.year ? Number(anniversaryDraft.year) : undefined, month:anniversaryDraft.month, day:anniversaryDraft.day, isLeapMonth:anniversaryDraft.calendar==='lunar' ? anniversaryDraft.isLeapMonth : undefined, repeatYearly:anniversaryDraft.type==='birthday' ? true : anniversaryDraft.repeatYearly, notes:anniversaryDraft.notes.trim() || undefined, updatedAt:now }
    if (editingAnniversaryId) setAnniversaries(cur=>cur.map(a=>a.id===editingAnniversaryId ? {...a,...fields}:a))
    else setAnniversaries(cur=>[...cur,{id:crypto.randomUUID(),...fields,createdAt:now}])
    setAnniversaryEditorOpen(false); setEditingAnniversaryId(null)
  }
  const deleteAnniversary = () => {
    if (!editingAnniversaryId) return
    const now = new Date().toISOString()
    setAnniversaries(cur=>cur.map(a=>a.id===editingAnniversaryId ? {...a,trashedAt:now,updatedAt:now} : a))
    setAnniversaryEditorOpen(false); setEditingAnniversaryId(null)
  }

  const { focusOpen, setFocusOpen, focusMode, setFocusMode, focusMinutes, setFocusMinutes, focusTagIds, setFocusTagIds, focusTagSelectOpen, setFocusTagSelectOpen, pendingNoteFocusId, setPendingNoteFocusId, activeFocusElapsed, activeFocusHabit, activeFocusNote, activeFocusRemaining, activeFocusSession, activeTimerTask, formatClock, formatRunningTimer, noteFocusSecondsById, requestNoteFocus, startDirectFocus, startHabitFocus, startNoteFocus, startTaskTimer, stopDirectFocus, stopHabitFocus, stopNoteFocus, stopTaskTimer, openFocus } = useFocusRuntime({ setRequestedHabitId, activeTasks, focusHydrated, focusSessions, habits, keepScreenAwakeDuringFocus, maxFocusHours, notes, setFocusSessions, setMainView, setRequestedNoteId, setTags, setTaskStatus: (...args) => setTaskStatus(...args), setTimerNow, setViewingTask, tags, tasks, timerNow, viewingTask })

  const openTaskEditor = () => {
    const date = selectedDate ?? today
    setEditingTaskId(null)
    setEditingOccurrenceDate(null)
    setDraft(emptyDraft(date, defaultPriority))
    setEditorOpen(true)
  }

  const openInboxTaskEditor = () => {
    setEditingTaskId(null)
    setEditingOccurrenceDate(null)
    setDraft({ ...emptyDraft(today, defaultPriority), date: '', endDate: '', allDay: false, time: '', repeatPreset: 'none' })
    setEditorOpen(true)
  }

  const openTaskDetail = (task: Task) => {
    setViewingTask(task)
  }

  const editTask = (task: Task) => {
    if (activeTimerTask?.id===task.id) return
    setViewingTask(null)
    const series = task.seriesId ? tasks.find(item => item.id === task.seriesId) : task
    if (!series) return
    setEditingTaskId(series.id)
    setEditingOccurrenceDate(task.seriesId ? task.occurrenceDate ?? task.date : null)
    setDraft({
      title: task.title,
      date: task.date ?? '',
      endDate: task.endDate ?? '',
      priority: task.priority,
      allDay: task.allDay,
      time: task.time ?? '',
      deadline: task.deadline ?? '',
      notes: task.notes ?? '',
      tagIds: singleOrdinaryTagIds(task.tagIds),
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
    const buildFields = (date: string | null, endDate?: string) => ({
      title, date, endDate: date ? endDate : undefined,
      priority: draft.priority, allDay: date ? draft.allDay : false,
      time: date && !draft.allDay ? draft.time || undefined : undefined,
      deadline: draft.deadline || undefined, notes: draft.notes.trim() || undefined,
      tagIds: singleOrdinaryTagIds(draft.tagIds),
      attachments: draft.attachments,
    })

    if (editingTaskId) {
      setTasks(current => {
        const series = current.find(task => task.id === editingTaskId)
        if (!series) return current
        const occurrence = editingOccurrenceDate && series.recurrence ? materializeOccurrence(series, editingOccurrenceDate) : null

        if (occurrence && scope === 'occurrence') {
          const existingException = series.recurrenceExceptions?.[editingOccurrenceDate!] ?? { updatedAt: now }
          const exception: RecurrenceException = {
            ...existingException,
            ...buildFields(draft.date, draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined),
            date: draft.date || undefined,
            updatedAt: now,
          }
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
        const seriesDate = (occurrence && draft.date === occurrence.date ? series.date : draft.date) ?? ''
        const seriesEndDate = occurrence && (draft.endDate || '') === (occurrence.endDate || '')
          ? series.endDate
          : (draft.endDate && draft.endDate > seriesDate ? draft.endDate : undefined)
        const seriesDraft: TaskDraft = { ...draft, date: seriesDate, endDate: seriesEndDate ?? '' }
        const nextRecurrence = recurrenceFromDraft(seriesDraft)
        return current.map(task => {
          if (task.id !== series.id) return task
          const nextKeys = new Set(draft.attachments.map(a => a.storageKey))
          const tombstones = { ...(task.attachmentLinkTombstones ?? {}) }
          ;(task.attachments ?? []).forEach(a => { if (!nextKeys.has(a.storageKey)) tombstones[a.storageKey] = now })
          draft.attachments.forEach(a => { delete tombstones[a.storageKey] })
          return normalizeSingleOccurrenceSeries({
            ...task, ...buildFields(seriesDate || null, seriesEndDate), attachmentLinkTombstones: tombstones,
            recurrence: nextRecurrence,
            recurrenceExceptions: nextRecurrence ? task.recurrenceExceptions : undefined,
            updatedAt: now,
          })
        })
      })
    } else {
      const task: Task = {
        id: crypto.randomUUID(),
        ...buildFields(draft.date || null, draft.date && draft.endDate && draft.endDate > draft.date ? draft.endDate : undefined),
        status: 'todo', originalDate: draft.date || undefined, recurrence: recurrenceFromDraft(draft),
        createdAt: now, updatedAt: now,
      }
      setTasks(current => [...current, normalizeSingleOccurrenceSeries(task)])
    }

    if (draft.date) {
      const taskDate = fromDateKey(draft.date)
      setSelectedDate(taskDate)
      setVisibleMonth(new Date(taskDate.getFullYear(), taskDate.getMonth(), 1))
    }
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
        tagIds: singleOrdinaryTagIds(draft.tagIds),
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

  const showRandomEncouragement = () => {
    const active=encouragementMessages.filter(item=>!item.deletedAt&&item.text.trim())
    if (!active.length) return
    const candidates=active.length>1?active.filter(item=>item.id!==lastEncouragementIdRef.current):active
    const picked=candidates[Math.floor(Math.random()*candidates.length)] || active[0]
    lastEncouragementIdRef.current=picked.id
    setEncouragementRewardStyle(encouragementStyle==='random'?(Math.random()<0.5?'dark':'light'):encouragementStyle)
    setEncouragementReward(picked.text.trim())
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
    if (status === 'completed' && task.status !== 'completed') showRandomEncouragement()
  }

  const postponeTask = (task: Task, newDate: string) => {
    if (!task.date || !newDate || newDate <= task.date) return
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
      ...item, originalDate: item.originalDate ?? item.date ?? undefined, date: newDate,
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
    // Unlink only. Shared library images keep one binary and can be referenced many times.
    setDraft(current => ({ ...current, attachments: current.attachments.filter(item => item.id !== attachment.id) }))
  }

  const deleteTask = (task: Task, scope: 'occurrence' | 'future' | 'series' = 'series') => {
    const seriesId = task.seriesId ?? task.id
    const occurrenceDate = task.occurrenceDate
    const now = new Date().toISOString()
    if (occurrenceDate && scope === 'occurrence') {
      setTasks(current => current.map(series => series.id === seriesId ? {
        ...series,
        recurrenceExceptions: { ...series.recurrenceExceptions, [occurrenceDate]: { ...series.recurrenceExceptions?.[occurrenceDate], deleted: false, trashedAt: now, updatedAt: now } },
        updatedAt: now,
      } : series))
      return
    }
    if (occurrenceDate && scope === 'future') {
      setTasks(current => current.map(series => series.id === seriesId ? { ...series, trashFuture:{from:occurrenceDate,trashedAt:now}, updatedAt:now } : series))
      return
    }
    setTasks(current => current.map(series => series.id === seriesId ? { ...series, trashedAt:now, updatedAt:now } : series))
    setFocusSessions(current => cascadeTrashTaskFocus(current, seriesId, now))
  }

  const restoreTrashItem = (item: TrashItem) => {
    if(item.entity==='habit') { const now=new Date().toISOString();setHabits(current=>current.map(h=>h.id===item.habit.id?{...h,deletedAt:undefined,updatedAt:now}:h));setFocusSessions(current=>cascadeRestoreHabitFocus(current,item.habit.id,now));setAutoSyncToast('✓ 已恢复习惯');return }
    if(item.entity==='focus') { const now=new Date().toISOString(); setFocusSessions(current=>current.map(session=>session.id===item.session.id?restoreFocusSession(session,now):session)); setAutoSyncToast('✓ 已恢复专注'); return }
    if(item.entity==='journal') { const now=new Date().toISOString(); setJournalEntries(current=>current.map(entry=>entry.id===item.journal.id?{...entry,trashedAt:undefined,updatedAt:now}:entry)); setAutoSyncToast('✓ 已恢复记录'); return }
    if(item.entity==='note') { const now=new Date().toISOString(); setNotes(current=>current.map(note=>note.id===item.note.id?restoreNote(note,now):note)); setFocusSessions(current=>cascadeRestoreNoteFocus(current,item.note.id,now)); setAutoSyncToast('✓ 已恢复笔记'); return }
    if(item.entity==='anniversary') { const now=new Date().toISOString(); setAnniversaries(current=>current.map(a=>a.id===item.anniversary.id?{...a,trashedAt:undefined,updatedAt:now}:a)); setAutoSyncToast('✓ 已恢复纪念日'); return }
    const now=new Date().toISOString()
    setTasks(current=>current.map(task=>{
      if(task.id!==item.task.id) return task
      if(item.kind==='series') return {...task,trashedAt:undefined,updatedAt:now}
      if(item.kind==='future') return {...task,trashFuture:undefined,updatedAt:now}
      const date=item.occurrenceDate!
      return {...task,recurrenceExceptions:{...task.recurrenceExceptions,[date]:{...task.recurrenceExceptions?.[date],trashedAt:undefined,updatedAt:now}},updatedAt:now}
    }))
    if(item.kind==='series') setFocusSessions(current=>cascadeRestoreTaskFocus(current,item.task.id,now))
    setAutoSyncToast('✓ 已恢复任务')
  }

  const permanentlyDeleteTrashItem = (item: TrashItem) => {
    if(item.entity==='habit') { setHabits(current=>current.filter(h=>h.id!==item.habit.id));setHabitCheckIns(current=>current.filter(r=>r.habitId!==item.habit.id));setFocusSessions(current=>permanentlyDeleteHabitFocus(current,item.habit.id));return }
    if(item.entity==='focus') { setFocusSessions(current=>permanentlyDeleteFocusSession(current,item.session.id)); return }
    if(item.entity==='journal') { setJournalEntries(current=>current.filter(entry=>entry.id!==item.journal.id)); return }
    if(item.entity==='note') { setNotes(current=>permanentlyDeleteNote(current,item.note.id)); setFocusSessions(current=>permanentlyDeleteNoteFocus(current,item.note.id)); return }
    if(item.entity==='anniversary') { setAnniversaries(current=>current.filter(a=>a.id!==item.anniversary.id)); return }
    const now=new Date().toISOString()
    if(item.kind==='series') { setTasks(current=>current.filter(task=>task.id!==item.task.id)); setFocusSessions(current=>permanentlyDeleteTaskFocus(current,item.task.id)); return }
    if(item.kind==='occurrence') {
      const date=item.occurrenceDate!
      setTasks(current=>current.map(task=>task.id===item.task.id?{...task,recurrenceExceptions:{...task.recurrenceExceptions,[date]:{...task.recurrenceExceptions?.[date],trashedAt:undefined,deleted:true,updatedAt:now}},updatedAt:now}:task)); return
    }
    const date=item.occurrenceDate!, previousDate=addDaysKey(date,-1)
    setTasks(current=>current.map(task=>task.id===item.task.id?normalizeSingleOccurrenceSeries({...task,trashFuture:undefined,recurrence:task.recurrence?{...task.recurrence,end:{type:'date',date:previousDate}}:undefined,recurrenceExceptions:Object.fromEntries(Object.entries(task.recurrenceExceptions??{}).filter(([key])=>key<date)),updatedAt:now}):task))
  }

  const clearTrash = () => {
    if (!trashItems.length) return
    const now = new Date().toISOString()
    const trashedHabitIds=new Set(habits.filter(h=>h.deletedAt).map(h=>h.id))
    setHabits(current=>current.filter(h=>!h.deletedAt))
    setHabitCheckIns(current=>current.filter(r=>!trashedHabitIds.has(r.habitId)))
    setJournalEntries(current => current.filter(entry => !entry.trashedAt))
    setAnniversaries(current => current.filter(anniversary => !anniversary.trashedAt))
    setNotes(current => purgeTrashedNotes(current))
    setFocusSessions(current => purgeTrashWithHabitFocus(purgeTrashWithNoteFocus(purgeTrashWithTaskFocus(current,tasks),notes),habits))
    setTasks(current => current.flatMap(task => {
      if (task.trashedAt) return []
      let next = task
      const trashedDates = Object.entries(next.recurrenceExceptions ?? {}).filter(([,exception]) => exception.trashedAt).map(([date]) => date)
      if (trashedDates.length) {
        const exceptions = { ...next.recurrenceExceptions }
        trashedDates.forEach(date => { exceptions[date] = { ...exceptions[date], trashedAt: undefined, deleted: true, updatedAt: now } })
        next = { ...next, recurrenceExceptions: exceptions, updatedAt: now }
      }
      if (next.trashFuture) {
        const from = next.trashFuture.from, previousDate = addDaysKey(from,-1)
        next = normalizeSingleOccurrenceSeries({ ...next, trashFuture: undefined, recurrence: next.recurrence ? { ...next.recurrence, end:{type:'date',date:previousDate} } : undefined, recurrenceExceptions:Object.fromEntries(Object.entries(next.recurrenceExceptions??{}).filter(([key])=>key<from)), updatedAt:now })
      }
      return [next]
    }))
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
    if (kind === 'task') setDraft(current => ({ ...current, tagIds: toggleTaskTagIds(current.tagIds, id) }))
    else setJournalDraft(current => ({ ...current, tagIds: toggleJournalTagIds(current.tagIds, id) }))
  }

  const { activeManagedTags, addTag, archivedTags, archivedTagsOpen, canSetTagScope, closeTagEditor, deleteTag, managedTags, newTagColor, newTagName, newTagScope, saveTagEdit, selectedTagManageId, setArchivedTagsOpen, setNewTagColor, setNewTagName, setNewTagScope, setSelectedTagManageId, setTagArchived, setTagEditDraft, setTagManagerOpen, tagEditDraft, tagManagerOpen, tagScopeBlockedReason, tagUsage, tagUsageAreas } = useTagManagement({ activeJournalEntries, activeTasks, focusSessions, habits, journalEntries, notes, setAutoSyncToast, setFocusSessions, setHabits, setJournalEntries, setNotes, setTags, setTasks, tags, tasks })

  useEffect(() => {
    if (sessionStorage.getItem('zing-program-refresh-pending') !== '1') return
    sessionStorage.removeItem('zing-program-refresh-pending')
    setAutoSyncToast(`✓ 已更新至 v${APP_VERSION}`)
  }, [])

  const refreshProgram = async () => {
    if (programRefreshBusy) return
    setProgramRefreshBusy(true)
    try {
      if (!navigator.onLine) throw new Error('offline')
      // Do not parse a version from sw.js. The service-worker cache generation and
      // the application version are different concepts; parsing the former caused
      // the UI to keep reporting the old v1.7.10.
      await fetch(`/sw.js?check=${Date.now()}`, { cache: 'no-store' })
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) await registration.update()
      }
      // Report success only after the newly loaded application is actually running.
      sessionStorage.setItem('zing-program-refresh-pending', '1')
      window.location.reload()
    } catch {
      setAutoSyncToast('⚠ 无法刷新程序，继续使用本地版本')
      setProgramRefreshBusy(false)
    }
  }

  const { highlightSearch, mobileSearchVisible, normalizedSearch, searchDateLabel, searchFilter, searchOpen, searchQuery, searchResults, searchWrapRef, selectedSearchTag, setMobileSearchVisible, setSearchFilter, setSearchOpen, setSearchQuery, tagKeyword, tagSearchMode, tagSuggestions } = useGlobalSearch({ activeAnniversaries, activeJournalEntries, activeTasks, formatUiDate, habits, managedTags, notes, tagUsage, today })

  const inboxTaskMeta = (task: Task) => {
    const tagId = inboxOrdinaryTaskTagId(task)
    const tag = tags.find(item => item.id === tagId)
    const activity = new Date(inboxActivityAt(task))
    const activityText = Number.isNaN(activity.getTime()) ? '时间未知' : activity.toLocaleString([], { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })
    return { tag: tag?.name ?? '默认', tagColor: tag?.color ?? '#9aa29f', activity: `${inboxActivityKind(task) === 'updated' ? '更新' : '创建'} ${activityText}` }
  }

  const searchMarker = (result: SearchResult) => {
    if (result.kind === 'task') return <span className={`search-task-marker priority-${result.item.priority} status-${result.item.status}`}>{result.item.status === 'completed' ? '✓' : result.item.status === 'abandoned' ? '×' : ''}</span>
    if (result.kind === 'journal') return <span className={`search-journal-marker impact-${result.item.impact}`} />
    if (result.kind === 'habit') return <span className="search-anniversary-marker">◉</span>
    if (result.kind === 'note') return <span className="search-anniversary-marker">▤</span>
    return <span className="search-anniversary-marker">{anniversaryIcon(result.item.type)}</span>
  }

  const navigateToCalendarDate = (date:Date, openDetail=true) => {
    const targetMonth=new Date(date.getFullYear(),date.getMonth(),1)
    const dateKey=toDateKey(date)
    setMainView('calendar')
    setVisibleMonth(targetMonth)
    setSelectedDate(date)
    if(isMobileCalendar){
      pendingPrependAnchorRef.current=null
      pendingCalendarScrollRef.current=`date:${dateKey}`
      setMobileCalendarPositionReady(false)
      setMobileActiveMonth(targetMonth)
      setMobileMonths(Array.from({length:7},(_,index)=>new Date(date.getFullYear(),date.getMonth()+index-3,1)))
      dayDetailOriginScrollRef.current=null
    }
    if(openDetail){ cancelDayDetailCloseTimer(); setDayDetailClosing(false); setDayDetailOpen(true) }
  }

  const openTaskAtItsDay = (task:Task) => {
    if (!task.date) { setInboxOpen(false); openTaskDetail(task); return }
    const [year,month,day]=task.date.split('-').map(Number)
    const date=new Date(year,month-1,day)
    navigateToCalendarDate(date)
    setOverdueInboxOpen(false)
    window.setTimeout(()=>openTaskDetail(task),0)
  }

  const openSearchResult = (result: SearchResult) => {
    setSearchOpen(false)
    setMobileSearchVisible(false)
    if (result.kind === 'task' || result.kind === 'journal') {
      const dateKey=result.item.date
      if (result.kind === 'task' && !dateKey) { openTaskDetail(result.item); return }
      const [year,month,day]=(dateKey as string).split('-').map(Number)
      const date=new Date(year,month-1,day)
      navigateToCalendarDate(date)
      window.setTimeout(()=>{
        if(result.kind==='task') openTaskDetail(result.item)
        else setViewingJournalId(result.id)
      },0)
      return
    }
    if (result.kind === 'habit') {setMainView('habits');return}
    if (result.kind === 'note') {
      setMainView('notes')
      setRequestedNoteId(result.id)
      return
    }
    openAnniversaryEditor(result.item)
  }

  const anniversaryPageRows = useMemo(() => buildAnniversaryPageRows(activeAnniversaries, today), [activeAnniversaries])

  const attachmentLifecycle = useMemo(() => buildAttachmentLifecycle(tasks, journalEntries, notes), [tasks, journalEntries, notes])
  const allStoredAttachments = useMemo(() => sortAttachmentsNewestFirst(attachmentLifecycle.map(row => row.attachment)), [attachmentLifecycle])
  const activeStoredAttachments = useMemo(() => sortAttachmentsNewestFirst(attachmentLifecycle.filter(row => row.state === 'active').map(row => row.attachment)), [attachmentLifecycle])
  const trashedStoredAttachments = useMemo(() => sortAttachmentsNewestFirst(attachmentLifecycle.filter(row => row.state === 'trash').map(row => row.attachment)), [attachmentLifecycle])
  const browsedActiveAttachments = storageBrowser ? activeStoredAttachments.filter(item => item.type === storageBrowser) : []
  const browsedTrashedAttachments = storageBrowser ? trashedStoredAttachments.filter(item => item.type === storageBrowser) : []
  const browsedAttachments = [...browsedActiveAttachments, ...browsedTrashedAttachments]
  const libraryImages = allStoredAttachments.filter(item => item.type === 'image')
  const effectiveImageBytes = allStoredAttachments.filter(item => item.type === 'image').reduce((sum,item)=>sum+item.size,0)
  const effectiveAudioBytes = allStoredAttachments.filter(item => item.type === 'audio').reduce((sum,item)=>sum+item.size,0)
  const effectiveAttachmentBytes = effectiveImageBytes + effectiveAudioBytes
  const inspectB2Orphans = async () => {
    if (orphanCleanupBusy) return
    setOrphanCleanupBusy(true)
    try {
      const referencedKeys=referencedAttachmentKeys(tasks, journalEntries, notes)
      const response=await fetch('/api/b2-gc',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json',Authorization:`Bearer ${githubSyncToken.trim()}`},body:JSON.stringify({action:'preview',referencedKeys})})
      const payload:any=await response.json().catch(()=>({}))
      if(!response.ok) throw new Error(String(payload?.error||`HTTP ${response.status}`))
      const keys:string[]=Array.isArray(payload.orphans)?payload.orphans:[]
      const rows=await Promise.all(keys.map(async key=>{
        try{
          const signedResponse=await fetch(`/api/b2-sign?key=${encodeURIComponent(key)}&method=GET`,{headers:{Accept:'application/json',Authorization:`Bearer ${githubSyncToken.trim()}`}})
          const signed:any=await signedResponse.json().catch(()=>({}))
          if(!signedResponse.ok||!signed.url) throw new Error('sign failed')
          const headResponse=await fetch(`/api/b2-sign?key=${encodeURIComponent(key)}&method=HEAD`,{headers:{Accept:'application/json',Authorization:`Bearer ${githubSyncToken.trim()}`}})
          const headSigned:any=await headResponse.json().catch(()=>({}))
          let contentType='',size=0
          if(headResponse.ok&&headSigned.url){ const metadata=await fetch(headSigned.url,{method:'HEAD'}); if(metadata.ok){contentType=metadata.headers.get('content-type')||'';size=Number(metadata.headers.get('content-length')||0)||0} }
          return {key,url:String(signed.url),contentType,size}
        }catch{return {key,url:'',contentType:'',size:0}}
      }))
      setOrphanAttachments(rows); setOrphanCleanupOpen(true)
    }catch(error){window.alert(`孤儿附件检查失败：${error instanceof Error?error.message:String(error)}`)}
    finally{setOrphanCleanupBusy(false)}
  }
  const cleanupB2Orphans = async () => {
    if(orphanCleanupBusy||orphanAttachments.length===0)return
    if(!window.confirm(`永久删除这 ${orphanAttachments.length} 个孤儿附件？删除后无法恢复。`))return
    setOrphanCleanupBusy(true)
    try{
      const referencedKeys=referencedAttachmentKeys(tasks,journalEntries,notes)
      const response=await fetch('/api/b2-gc',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json',Authorization:`Bearer ${githubSyncToken.trim()}`},body:JSON.stringify({action:'delete',referencedKeys,orphanKeys:orphanAttachments.map(item=>item.key)})})
      const payload:any=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(String(payload?.error||`HTTP ${response.status}`))
      const result = b2CleanupResult(payload, orphanAttachments.map(item=>item.key))
      setOrphanAttachments(current=>current.filter(item=>result.remaining.has(item.key)))
      if (!result.remaining.size) setOrphanCleanupOpen(false)
      // Remote cleanup must not collect unrelated local blobs or bytes whose
      // deletion failed. Storage statistics are read-only and non-blocking.
      void getStorageStats().then(setStorageStats).catch(console.error)
      window.alert(result.message)
    }catch(error){window.alert(`孤儿附件清理失败：${error instanceof Error?error.message:String(error)} · 待确认 ${orphanAttachments.length} 个，请重新扫描。`)}finally{setOrphanCleanupBusy(false)}
  }
  const chooseLibraryImage = (source: Attachment) => {
    const linked: Attachment = { ...source, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    if (imageLibraryTarget === 'task') {
      setDraft(current => current.attachments.some(a => a.storageKey === source.storageKey) ? current : { ...current, attachments: [...current.attachments, linked] })
    } else if (imageLibraryTarget === 'journal') {
      setJournalDraft(current => {
        if (current.attachments.some(a => a.storageKey === source.storageKey) || current.attachments.filter(a => a.type === 'image').length >= 9) return current
        return { ...current, attachments: [...current.attachments, linked] }
      })
    } else if (imageLibraryTarget === 'note' && imageLibraryNoteId) {
      const now = new Date().toISOString()
      setNotes(current => linkImageAttachmentToNote(current, imageLibraryNoteId, source, now, linked.id))
    }
  }

  const resetAllUserData = async () => {
    if (resettingData) return
    setResettingData(true); setBackupMessage('正在清空数据…')
    try {
      // Clear user data and create sync tombstones in one IndexedDB transaction.
      // This makes “清空所有数据” a real cross-device deletion on the next GitHub sync.
      await clearZingUserDataWithSync(REQUIRED_SYSTEM_TAGS)
      const cleared: Record<SyncEntityType, any[]> = { task:[], journal:[], note:[], notebook:[], mood:[], energy:[], environment:[], period:[], tag:REQUIRED_SYSTEM_TAGS, anniversary:[], focus:[], habit:[], habitCheckIn:[], settings:syncSnapshotsRef.current.settings }
      syncSnapshotsRef.current = cleared
      Object.keys(syncSnapshotReadyRef.current).forEach(key => { syncSnapshotReadyRef.current[key as SyncEntityType] = true })
      setRandomPoolGroups([]); setRandomPoolItems([]); setTasks([]); setJournalEntries([]); setNotes([]); setNotebooks(ensureDefaultNotebook([])); setDailyMoods([]); setDailyEnergy([]); setDailyEnvironment([]); setMenstrualPeriods([]); setTags(REQUIRED_SYSTEM_TAGS); setAnniversaries([]); setFocusSessions([]); setHabits([]); setHabitCheckIns([])
      setLocalWriteRevision(value=>value+1)
      setSelectedDate(today); closeDayDetailImmediately(); setSearchQuery('')
      setResetDataConfirm(false)
      void getStorageStats().then(setStorageStats).catch(console.error)
      setBackupMessage('数据已清空 · 删除将在下次 GitHub 同步传播 · 应用设置已保留')
    } catch (error) {
      console.error('Failed to reset Zing data', error)
      setBackupMessage(error instanceof Error ? `清空失败：${error.message}` : '清空失败')
    } finally { setResettingData(false) }
  }

  const { exportAnniversariesCsv, exportFocusCsv, exportJournalsCsv, exportTasksCsv } = createCsvExports({ activeAnniversaries, activeJournalEntries, activeTasks, emotionOptions, focusSessions, setBackupMessage, tags })

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
        {path:'data/notes.json',bytes:json(notes)},
        {path:'data/notebooks.json',bytes:json(notebooks)},
        {path:'data/moods.json',bytes:json(dailyMoods)},
        {path:'data/energy.json',bytes:json(dailyEnergy)},
        {path:'data/environment.json',bytes:json(dailyEnvironment)},
        {path:'data/periods.json',bytes:json(menstrualPeriods)},
        {path:'data/tags.json',bytes:json(tags)},
        {path:'data/anniversaries.json',bytes:json(anniversaries)},
        {path:'data/focus.json',bytes:json(focusSessions)},
        {path:'data/habits.json',bytes:json(habits)},
        {path:'data/habit-checkins.json',bytes:json(habitCheckIns)},
        {path:'data/settings.json',bytes:json({greeting,weekStart:weekStartsMonday?'monday':'sunday',dateFormat,defaultPriority,showEndedTasks,showAllRecurringTasks,excludeDefaultFocusStats,wordCloudIgnored,encouragementMessages,encouragementStyle,maxFocusHours,keepScreenAwakeDuringFocus,weatherOptions,thermalOptions,emotionOptions,randomPoolGroups,randomPoolItems,mixedPoolItemIds,defaultMobileNavigation:syncedDefaultMobileNav,modulePriority:moduleOrder,daySectionOrder,settingsGroupOrder})},
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
      const manifest={format:'zing-calendar-backup',schemaVersion:1,appVersion:APP_VERSION,exportedAt,
        counts:{tasks:tasks.length,journals:journalEntries.length,notes:notes.length,notebooks:notebooks.length,moods:dailyMoods.length,energies:dailyEnergy.length,environments:dailyEnvironment.length,periods:menstrualPeriods.length,tags:tags.length,anniversaries:anniversaries.length,focusSessions:focusSessions.length,habits:habits.length,habitCheckIns:habitCheckIns.length,attachments:attachmentRows.length},
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
      const parsed=parseBackupEntries(entries)
      setBackupPreview({file,...parsed})
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
      const restoredTasks = backupPreview.tasks.map(normalizeTaskScheduling)
      const restoredTags = normalizeTags(backupPreview.tags)
      const s=backupPreview.settings ?? {}
      // Restore is device-local by design. Persist restored settings locally too, but do
      // not create sync changes/tombstones that could roll the cloud back.
      const restoredAt=new Date().toISOString()
      const restoredWords=Array.isArray(s.wordCloudIgnored)?s.wordCloudIgnored:wordCloudIgnored
      const restoredSettings:SyncedUserSettings={
        id:'settings',updatedAt:restoredAt,greeting:s.greeting??greeting,
        weekStart:s.weekStart??(weekStartsMonday?'monday':'sunday'),dateFormat:s.dateFormat??dateFormat,
        defaultPriority:s.defaultPriority??defaultPriority,showEndedTasks:s.showEndedTasks??showEndedTasks,
        showAllRecurringTasks:s.showAllRecurringTasks??showAllRecurringTasks,excludeDefaultFocusStats:s.excludeDefaultFocusStats??excludeDefaultFocusStats,
        wordCloudIgnored:restoredWords,wordCloudIgnoredAddedAt:Object.fromEntries(restoredWords.map(word=>[word.trim().toLowerCase(),restoredAt])),wordCloudIgnoredRemovedAt:{},
        encouragementMessages:Array.isArray(s.encouragementMessages)?s.encouragementMessages:encouragementMessages,
        encouragementStyle:(s.encouragementStyle==='dark'||s.encouragementStyle==='light'||s.encouragementStyle==='random')?s.encouragementStyle:encouragementStyle,
        maxFocusHours:typeof s.maxFocusHours==='number'?Math.min(12,Math.max(2,Math.round(s.maxFocusHours))):maxFocusHours,
        keepScreenAwakeDuringFocus:typeof s.keepScreenAwakeDuringFocus==='boolean'?s.keepScreenAwakeDuringFocus:keepScreenAwakeDuringFocus,
        weatherOptions:Array.isArray(s.weatherOptions)?s.weatherOptions:weatherOptions, thermalOptions:Array.isArray(s.thermalOptions)?s.thermalOptions:thermalOptions, emotionOptions:Array.isArray(s.emotionOptions)?s.emotionOptions:emotionOptions, randomPoolGroups:Array.isArray(s.randomPoolGroups)?s.randomPoolGroups:randomPoolGroups, randomPoolItems:Array.isArray(s.randomPoolItems)?s.randomPoolItems:randomPoolItems, mixedPoolItemIds:Array.isArray(s.mixedPoolItemIds)?s.mixedPoolItemIds:mixedPoolItemIds, defaultMobileNavigation: s.defaultMobileNavigation ? normalizeMobileNav(s.defaultMobileNavigation) : syncedDefaultMobileNav, modulePriority:normalizeModuleOrder(s.modulePriority),daySectionOrder:normalizeDaySectionOrder(s.daySectionOrder),settingsGroupOrder:normalizeSettingsGroupOrder(s.settingsGroupOrder),
      }
      await replaceZingData({
        settings:restoredSettings, tasks:restoredTasks,journals:backupPreview.journals,notes:backupPreview.notes,notebooks:ensureDefaultNotebook(backupPreview.notebooks),moods:backupPreview.moods,energies:backupPreview.energies,environments:backupPreview.environments,periods:backupPreview.periods,
        tags:restoredTags,anniversaries:backupPreview.anniversaries,focusSessions:backupPreview.focusSessions,habits:backupPreview.habits,habitCheckIns:backupPreview.habitCheckIns,
        attachments:backupPreview.attachments.map(item=>({key:item.storageKey,blob:new Blob([(() => {
          const copy = new Uint8Array(item.bytes.byteLength)
          copy.set(item.bytes)
          return copy.buffer
        })()],{type:item.mimeType})}))
      })
      if (s.defaultMobileNavigation) receiveDefaultMobileNav(normalizeMobileNav(s.defaultMobileNavigation))
      setModuleOrder(normalizeModuleOrder(s.modulePriority))
      setDaySectionOrder(normalizeDaySectionOrder(s.daySectionOrder))
      setSettingsGroupOrder(normalizeSettingsGroupOrder(s.settingsGroupOrder))
      settingsWordClockRef.current={added:{...(restoredSettings.wordCloudIgnoredAddedAt??{})},removed:{}}
      syncSnapshotsRef.current = { task:restoredTasks, journal:backupPreview.journals, note:backupPreview.notes, notebook:ensureDefaultNotebook(backupPreview.notebooks), mood:backupPreview.moods, energy:backupPreview.energies, environment:backupPreview.environments, period:backupPreview.periods, tag:backupPreview.tags, anniversary:backupPreview.anniversaries, focus:backupPreview.focusSessions, habit:backupPreview.habits, habitCheckIn:backupPreview.habitCheckIns, settings:[restoredSettings] }
      Object.keys(syncSnapshotReadyRef.current).forEach(key => { syncSnapshotReadyRef.current[key as SyncEntityType] = true })
      setTasks(restoredTasks); setJournalEntries(backupPreview.journals); setNotes(backupPreview.notes); setNotebooks(ensureDefaultNotebook(backupPreview.notebooks)); setDailyMoods(backupPreview.moods); setDailyEnergy(backupPreview.energies); setDailyEnvironment(backupPreview.environments); setMenstrualPeriods(backupPreview.periods)
      setTags(restoredTags); setAnniversaries(backupPreview.anniversaries); setFocusSessions(backupPreview.focusSessions);setHabits(backupPreview.habits);setHabitCheckIns(backupPreview.habitCheckIns)
      suppressNextSettingsSyncRef.current = true
      if (s.greeting!==undefined) setGreeting(s.greeting || 'Hello, Zing')
      if (s.weekStart) setWeekStartsMonday(s.weekStart==='monday')
      if (s.dateFormat) setDateFormat(s.dateFormat)
      if (typeof s.defaultPriority==='number' && s.defaultPriority>=0 && s.defaultPriority<=3) setDefaultPriority(s.defaultPriority as TaskPriority)
      if (typeof s.showEndedTasks==='boolean') setShowEndedTasks(s.showEndedTasks)
      if (typeof s.showAllRecurringTasks==='boolean') setShowAllRecurringTasks(s.showAllRecurringTasks)
      if (typeof s.excludeDefaultFocusStats==='boolean') setExcludeDefaultFocusStats(s.excludeDefaultFocusStats)
      if (Array.isArray(s.wordCloudIgnored)) setWordCloudIgnored(s.wordCloudIgnored)
      if (Array.isArray(s.encouragementMessages)) setEncouragementMessages(s.encouragementMessages)
      if (s.encouragementStyle==='dark'||s.encouragementStyle==='light'||s.encouragementStyle==='random') setEncouragementStyle(s.encouragementStyle)
      if (typeof s.maxFocusHours==='number') setMaxFocusHours(Math.min(12,Math.max(2,Math.round(s.maxFocusHours))))
      if (typeof s.keepScreenAwakeDuringFocus==='boolean') setKeepScreenAwakeDuringFocus(s.keepScreenAwakeDuringFocus)
      if (Array.isArray(s.weatherOptions)) setWeatherOptions(normalizeEnvironmentOptions(s.weatherOptions,DEFAULT_WEATHER_OPTIONS))
      if (Array.isArray(s.thermalOptions)) setThermalOptions(normalizeEnvironmentOptions(s.thermalOptions,DEFAULT_THERMAL_OPTIONS))
      if (Array.isArray(s.emotionOptions)) setEmotionOptions(normalizeEmotionOptions(s.emotionOptions))
      if (Array.isArray(s.randomPoolGroups)) setRandomPoolGroups(s.randomPoolGroups)
      if (Array.isArray(s.randomPoolItems)) setRandomPoolItems(s.randomPoolItems)
      if (Array.isArray(s.mixedPoolItemIds)) setMixedPoolItemIds(s.mixedPoolItemIds)
      setBackupPreview(null); setBackupMessage('恢复完成')
      void getStorageStats().then(setStorageStats).catch(console.error)
    } catch(error) {
      console.error('Failed to restore backup',error)
      setBackupMessage(error instanceof Error?`恢复失败：${error.message}`:'恢复失败')
    } finally { setBackupRestoring(false) }
  }

  const executeGithubSync = async (automatic = false) => {
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
      await saveGitHubDeviceCredential(githubSyncToken.trim())
      setGithubTokenSaved(true)
      const stamp = result.finishedAt
      setLastGithubSyncAt(stamp)
      writeLocalCache('zing:lastGithubSyncAt', stamp)
      setGithubSyncMessageKind('success')
      setGithubSyncMessage(result.attachmentWarning
        ? `✓ GitHub 数据同步完成 · ⚠ 附件同步失败：${result.attachmentWarning}`
        : result.initializedRemote
          ? `✓ 首次同步完成 · 云端现有 ${result.pushedRecords} 条数据 · ${result.attachments.total} 个附件`
          : `✓ 同步完成 · 云端现有 ${result.pushedRecords} 条数据 · ${result.attachments.total} 个附件${result.attachments.missing ? ` · ⚠ ${result.attachments.missing} 个附件缺失` : ''}`)
      if (automatic) setAutoSyncToast('✓ 今日首次修改已自动同步')
      // Rehydrate merged records so remote changes become visible immediately.
      const [nextTasks,nextJournals,nextNotes,nextNotebooks,nextMoods,nextEnergy,nextEnvironment,nextPeriods,nextTags,nextAnniversaries,nextFocusSessions,nextSettings,nextHabits,nextHabitCheckIns] = await Promise.all([
        loadTasks<Task>(), loadJournalEntries<JournalEntry>(), loadNotes<Note>(), loadNotebooks<Notebook>(), loadDailyMoods<DailyMood>(), loadDailyEnergy<DailyEnergy>(), loadDailyEnvironment<DailyEnvironment>(), loadMenstrualPeriods<MenstrualPeriod>(), loadTags<Tag>(), loadAnniversaries<Anniversary>(), loadFocusSessions<FocusSession>(), loadUserSettings<SyncedUserSettings>(), loadHabits<Habit>(), loadHabitCheckIns<HabitCheckIn>()
      ])
      const normalizedNextTasks = nextTasks.map(normalizeTaskScheduling)
      if (JSON.stringify(normalizedNextTasks) !== JSON.stringify(nextTasks)) await saveTasks(normalizedNextTasks)
      const normalizedNextTags = normalizeTags(nextTags)
      const hydratedTags = ensureRequiredSystemTags(normalizedNextTags)
      const missingSystemTags = hydratedTags.filter(tag => !normalizedNextTags.some(existing => existing.id === tag.id))
      if (missingSystemTags.length) {
        // Persist self-healed schema tags and mark them as upserts so the next
        // GitHub write repairs the cloud tag store instead of losing them again.
        await saveEntityWithSync('tag', hydratedTags)
      }
      // Remote merge is hydration, not a local user edit. Reset the diff baselines
      // before React state changes so pulled records/deletes do not generate fresh tombstones.
      syncSnapshotsRef.current = {
        task: normalizedNextTasks,
        journal: nextJournals,
        note: nextNotes,
        notebook: nextNotebooks,
        mood: nextMoods,
        energy: nextEnergy,
        environment: nextEnvironment,
        period: nextPeriods,
        tag: hydratedTags,
        anniversary: nextAnniversaries,
        focus: nextFocusSessions,
        habit: nextHabits, habitCheckIn: nextHabitCheckIns,
        settings: nextSettings,
      }
      syncSnapshotReadyRef.current = { task:true, journal:true, note:true, notebook:true, mood:true, energy:true, environment:true, period:true, tag:true, anniversary:true, focus:true, habit:true, habitCheckIn:true, settings:true }
      setTasks(normalizedNextTasks); setJournalEntries(nextJournals); setNotes(nextNotes); setNotebooks(ensureDefaultNotebook(nextNotebooks)); setDailyMoods(nextMoods); setDailyEnergy(nextEnergy); setDailyEnvironment(nextEnvironment); setMenstrualPeriods(nextPeriods)
      setTags(hydratedTags)
      setAnniversaries(nextAnniversaries)
      setFocusSessions(nextFocusSessions);setHabits(nextHabits);setHabitCheckIns(nextHabitCheckIns)
      const syncedSettings = nextSettings[0]
      if (syncedSettings) {
        settingsWordClockRef.current=hydrateWordClock(syncedSettings, new Date().toISOString())
        const incoming=normalizedIncomingSettings(syncedSettings)
        if (incoming.defaultMobileNavigation) receiveDefaultMobileNav(incoming.defaultMobileNavigation)
        setModuleOrder(normalizeModuleOrder(incoming.modulePriority))
        setDaySectionOrder(normalizeDaySectionOrder(incoming.daySectionOrder))
        setSettingsGroupOrder(normalizeSettingsGroupOrder(incoming.settingsGroupOrder))
        suppressNextSettingsSyncRef.current = true
        writeLocalCache('zing:greeting',incoming.greeting)
        writeLocalCache('zing:weekStart',incoming.weekStartsMonday?'monday':'sunday')
        writeLocalCache('zing:dateFormat',incoming.dateFormat)
        writeLocalCache('zing:defaultPriority',String(incoming.defaultPriority))
        writeLocalCache('zing:showEndedTasks',String(incoming.showEndedTasks))
        writeLocalCache('zing:showAllRecurringTasks',String(incoming.showAllRecurringTasks))
        writeLocalCache('zing:excludeDefaultFocusStats',String(incoming.excludeDefaultFocusStats))
        writeLocalCache('zing:wordCloudIgnored',JSON.stringify(incoming.wordCloudIgnored))
        writeLocalCache('zing:encouragementMessages',JSON.stringify(incoming.encouragementMessages))
        writeLocalCache('zing:encouragementStyle',incoming.encouragementStyle)
        writeLocalCache('zing:maxFocusHours',String(incoming.maxFocusHours))
        writeLocalCache('zing:keepScreenAwakeDuringFocus',String(incoming.keepScreenAwakeDuringFocus))
        writeLocalCache('zing:randomPoolGroups',JSON.stringify(incoming.randomPoolGroups)); writeLocalCache('zing:randomPoolItems',JSON.stringify(incoming.randomPoolItems)); writeLocalCache('zing:mixedPoolItemIds',JSON.stringify(incoming.mixedPoolItemIds))
        setGreeting(incoming.greeting); setWeekStartsMonday(incoming.weekStartsMonday); setDateFormat(incoming.dateFormat); setDefaultPriority(incoming.defaultPriority); setShowEndedTasks(incoming.showEndedTasks); setShowAllRecurringTasks(incoming.showAllRecurringTasks); setExcludeDefaultFocusStats(incoming.excludeDefaultFocusStats); setWordCloudIgnored(incoming.wordCloudIgnored); setEncouragementMessages(incoming.encouragementMessages); setEncouragementStyle(incoming.encouragementStyle); setMaxFocusHours(incoming.maxFocusHours); setKeepScreenAwakeDuringFocus(incoming.keepScreenAwakeDuringFocus); setWeatherOptions(incoming.weatherOptions); setThermalOptions(incoming.thermalOptions); setEmotionOptions(incoming.emotionOptions); setRandomPoolGroups(incoming.randomPoolGroups); setRandomPoolItems(incoming.randomPoolItems); setMixedPoolItemIds(incoming.mixedPoolItemIds)
      }
    } catch (error) {
      setGithubSyncMessageKind('error')
      setGithubSyncMessage(`同步失败 · ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setGithubSyncBusy(false)
    }
  }

  const switchMainView = (view: MainView) => {
    if (view === 'calendar' && isMobileCalendar) {
      // A calendar entry is a fresh navigation to Today. Reset the finite month
      // window before mounting the page so the IntersectionObserver cannot inherit
      // an old off-screen window and prepend progressively older months.
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      pendingPrependAnchorRef.current = null
      pendingCalendarScrollRef.current = `date:${toDateKey(today)}`
      setMobileCalendarPositionReady(false)
      setVisibleMonth(currentMonth)
      setMobileActiveMonth(currentMonth)
      setMobileMonths(Array.from({length:7}, (_,index) => new Date(today.getFullYear(), today.getMonth() + index - 3, 1)))
    } else if (view !== 'calendar') {
      // Pending calendar navigation must never survive on another top-level page.
      pendingCalendarScrollRef.current = null
      pendingPrependAnchorRef.current = null
      setMobileCalendarPositionReady(false)
    }
    setMainView(view)
    // Bottom navigation changes the top-level page. Do not reuse the document
    // scroll position from the previous page; calendar-internal restoration is separate.
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
  }

  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('zing:desktopSidebarCollapsed') === 'true' } catch { return false }
  })
  const toggleDesktopSidebar = () => setDesktopSidebarCollapsed(current => {
    const next = !current
    try { writeLocalCache('zing:desktopSidebarCollapsed', String(next)) } catch { /* local storage unavailable */ }
    return next
  })

  const runGithubSync = async (automatic = false) => {
    if (automatic) return executeGithubSync(true)
    if (!githubSyncOwner.trim() || !githubSyncRepo.trim() || !githubSyncBranch.trim()) {
      setGithubSyncMessageKind('error'); setGithubSyncMessage('请先填写 GitHub 用户名、数据仓库和分支。'); return
    }
    if (!githubSyncToken.trim()) {
      setGithubSyncMessageKind('error'); setGithubSyncMessage('请输入本设备的 GitHub Token。Token 不会保存到 Zing 数据或备份中。'); return
    }
    setGithubSyncBusy(true); setGithubSyncMessageKind('working'); setGithubSyncMessage('正在比较本机与服务器…')
    try {
      const preview = await previewGitHubSync({owner:githubSyncOwner.trim(),repo:githubSyncRepo.trim(),branch:githubSyncBranch.trim(),token:githubSyncToken.trim()})
      setGithubSyncPreview(preview)
      setGithubSyncMessageKind('idle'); setGithubSyncMessage('')
    } catch (error) {
      setGithubSyncMessageKind('error'); setGithubSyncMessage(`同步检查失败 · ${error instanceof Error ? error.message : '未知错误'}`)
    } finally { setGithubSyncBusy(false) }
  }

  useEffect(() => {
    if (!autoSyncToast) return
    const timer = window.setTimeout(() => setAutoSyncToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [autoSyncToast])

  useEffect(() => {
    if (!encouragementReward) return
    const timer = window.setTimeout(() => setEncouragementReward(''), 4800)
    return () => window.clearTimeout(timer)
  }, [encouragementReward])

  useEffect(() => {
    if (localWriteRevision === 0 || githubSyncBusy || !githubSyncToken.trim()) return
    const todayKey = toDateKey(new Date())
    if (localStorage.getItem('zing:lastAutoSyncDate') === todayKey) return
    // Claim today's single automatic attempt before starting. A failed attempt is not retried automatically.
    writeLocalCache('zing:lastAutoSyncDate', todayKey)
    void runGithubSync(true)
  }, [localWriteRevision, githubSyncBusy, githubSyncToken])

  return (
    <main className={`app-shell${desktopSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>

      <ApplicationHeader {...{
        desktopSidebarCollapsed, greeting, highlightSearch, mainView, mobileSearchVisible, moduleOrder,
        normalizedSearch, openSearchResult, searchDateLabel, searchFilter, searchMarker, searchOpen,
        searchQuery, searchResults, searchWrapRef, selectedSearchTag, setMobileSearchVisible,
        setSearchFilter, setSearchOpen, setSearchQuery, switchMainView, tagKeyword, tagSearchMode,
        tagSuggestions, toggleDesktopSidebar
      }} />

      <CalendarPage {...{
        openFocus, activeFocusElapsed, activeFocusHabit, activeFocusNote, activeFocusRemaining,
        activeFocusSession, activeTimerTask, continuousCalendarContent, continuousCalendarRef,
        dayDetailOpen, displayWeekdays, endedTasksViewToggle, formatClock, goToday,
        inboxCount: inboxTasks.length, isMobileCalendar, mainView, mobileActiveMonth, moveMonth,
        openMonthPicker, overdueCount: overdueTasks.length, programRefreshBusy, refreshProgram,
        renderCalendarMonthGrid, setInboxOpen, setOverdueInboxOpen, setTrashOpen,
        trashCount: trashItems.length, visibleMonth
      }} />

      <StatisticsPage {...{
        today, weekStartsMonday, activeTasks, activeJournalEntries, dailyMoods, dailyEnergy, managedTags,
        tags, focusSessions, notes, wordCloudIgnored, timerNow, excludeDefaultFocusStats, mainView,
        setExcludeDefaultFocusStats, setWordCloudIgnored
      }} />

      <HabitWorkspace {...{
        activeFocusHabit, activeFocusSession, beginEditFocusSession, focusEditId, focusHistoryEditFields,
        focusSessions, formatUiDate, habitCheckIns, habits, mainView, quickHabitCheckIn,
        requestedHabitId, saveFocusSessionEdit, setFocusEditId, setFocusSessions, setHabitCheckIns,
        setHabits, startHabitFocus, stopHabitFocus, tags, timerNow, undoHabitCheckIn
      }} />

      <NotesWorkspace {...{
        activeFocusElapsed, activeFocusNote, activeFocusSession, addNoteImages, formatUiDate, mainView,
        noteFocusSecondsById, notebooks, notes, openImagePreview, requestNoteFocus, requestedNoteId,
        setFocusEditId, setFocusSessions, setImageLibraryNoteId, setImageLibraryTarget,
        setNoteFocusHistoryId, setNotebooks, setNotes, setRequestedNoteId, stopNoteFocus, tags
      }} />

      <AnniversariesPage {...{
        anniversaryPageRows, mainView, openAnniversaryEditor, today
      }} />

      <SettingsPage {...{
        allStoredAttachments, archivedTags, backupExporting, backupInputRef, backupMessage, dateFormat,
        defaultPriority, effectiveAttachmentBytes, effectiveAudioBytes, effectiveImageBytes,
        encouragementMessages, encouragementStyle, exportFullBackup, formatBytes, greeting,
        inspectB2Orphans, inspectBackupFile, keepScreenAwakeDuringFocus, lastGithubSyncAt, mainView,
        maxFocusHours, mobileNav, openExternalImport, orphanCleanupBusy, randomPoolGroups,
        randomPoolItems, setArchivedTagsOpen, setDateFormat, setDefaultPriority, setEmotionManagerOpen,
        setEncouragementManagerOpen, setEncouragementStyle, setEnvironmentManagerKind, setGithubSyncOpen,
        setGreeting, setKeepScreenAwakeDuringFocus, setLayoutEditor, setMaxFocusHours,
        setMobileNavSettingsOpen, setMobileNavToast, setMobileSearchVisible, setModulePriorityOpen,
        setPlainExportOpen, setRandomPoolOpen, setRandomWheelOpen, setResetDataConfirm, setSearchOpen,
        setShowAllRecurringTasks, setStorageBrowser, setTagManagerOpen, setWeekStartsMonday,
        setWordIgnoreManagerOpen, settingsGroupStyle, showAllRecurringTasks, storageStats,
        switchMainView, weekStartsMonday, wordCloudIgnored
      }} />

      <SyncDialogs {...{
        executeGithubSync, githubSyncBranch, githubSyncBusy, githubSyncMessage, githubSyncMessageKind,
        githubSyncOpen, githubSyncOwner, githubSyncPreview, githubSyncRepo, githubSyncToken,
        githubTokenSaved, lastGithubSyncAt, moduleOrder, runGithubSync, setGithubSyncBranch,
        setGithubSyncMessage, setGithubSyncMessageKind, setGithubSyncOpen, setGithubSyncOwner,
        setGithubSyncPreview, setGithubSyncRepo, setGithubSyncToken, setGithubTokenSaved
      }} />

      <EnvironmentManager {...{
        addEnvironmentOption, deleteEnvironmentOption, editEnvironmentEmoji, environmentManagerKind,
        environmentOptionUsed, moveEnvironmentOption, renameEnvironmentOption, setEnvironmentManagerKind,
        thermalOptions, toggleArchiveEnvironmentOption, weatherOptions
      }} />

      <EmotionDialogs {...{
        addEmotionOption, changeEmotionGroup, emotionManagerExpanded, emotionManagerOpen, emotionOptions,
        emotionPickerOpen, journalDraft, journalEntries, removeEmotionOption, renameEmotionOption,
        setEmotionManagerExpanded, setEmotionManagerOpen, setEmotionPickerOpen, setJournalDraft,
        toggleArchiveEmotionOption
      }} />

      <EncouragementManager {...{
        encouragementDraft, encouragementEditingId, encouragementManagerOpen, encouragementMessages,
        setEncouragementDraft, setEncouragementEditingId, setEncouragementManagerOpen,
        setEncouragementMessages
      }} />

      <WordIgnoreManager {...{
        setWordCloudIgnored, setWordIgnoreDraft, setWordIgnoreManagerOpen, wordCloudIgnored,
        wordIgnoreDraft, wordIgnoreManagerOpen
      }} />

      <BackupDialogs {...{
        backupPreview, backupRestoring, exportAnniversariesCsv, exportFocusCsv, exportJournalsCsv,
        exportTasksCsv, plainExportOpen, resetAllUserData, resetDataConfirm, resettingData,
        restoreBackup, setBackupPreview, setPlainExportOpen, setResetDataConfirm
      }} />

      <ExternalImportModal controller={externalImport} />

      <RandomWorkspace {...{
        mixedPoolItemIds, randomPoolGroups, randomPoolItems, randomPoolOpen, randomWheelOpen,
        setMixedPoolItemIds, setRandomPoolGroups, setRandomPoolItems, setRandomPoolOpen,
        setRandomWheelOpen
      }} />

      {!editorOpen && !journalEditorOpen && !anniversaryEditorOpen && !tagManagerOpen && !archivedTagsOpen && !viewingJournalId && !viewingTask && !storageBrowser && !orphanCleanupOpen && !backupPreview && !resetDataConfirm && !externalImportOpen && !inboxOpen && !overdueInboxOpen && !trashOpen && !focusOpen && !focusHistoryDate && !noteFocusHistoryId && !monthPickerTarget && !dayDetailOpen && !imagePreview && !seriesAction && !confirmSingleTask && !randomWheelOpen && !randomPoolOpen && (
      <>
        <MobileNavigation config={mobileNav} active={mainView} onNavigate={switchMainView} />
      </>
      )}

      <NavigationSettingsDialogs {...{
        daySectionOrder, layoutEditor, mainView, mobileNav, mobileNavSettingsOpen, mobileNavToast,
        moduleDragRef, moduleOrder, modulePriorityOpen, setDaySectionOrder, setLayoutEditor,
        setMobileNavSettingsOpen, setMobileNavToast, setModuleOrder, setModulePriorityOpen,
        setSettingsGroupOrder, setSyncedDefaultMobileNav, settingsGroupOrder, syncedDefaultMobileNav,
        updateMobileNav
      }} />

      <StorageDialogs {...{
        browsedActiveAttachments, browsedAttachments, browsedTrashedAttachments, cleanupB2Orphans,
        formatBytes, openImagePreview, orphanAttachments, orphanCleanupBusy, orphanCleanupOpen,
        setOrphanCleanupOpen, setStorageBrowser, storageBrowser, storageStats
      }} />

      {autoSyncToast && <div className="auto-sync-toast" role="status" aria-live="polite">{autoSyncToast}</div>}
      {encouragementReward && <div className={`encouragement-reward ${encouragementRewardStyle}`} role="status" aria-live="polite"><span>✓ 任务完成</span><strong>{encouragementReward}</strong></div>}

      <footer className="status-line">
        <span className="status-links" aria-label="基础设施快捷入口">
          <a href="https://github.com/zzZing0-0/zing-calendar" target="_blank" rel="noreferrer">GitHub</a><i aria-hidden="true">｜</i>
          <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Vercel</a><i aria-hidden="true">｜</i>
          <a href="https://secure.backblaze.com/b2_buckets.htm" target="_blank" rel="noreferrer">Backblaze B2</a>
        </span>
        <span className="status-version">Zing Calendar · v{APP_VERSION}</span>
      </footer>

      <DayDetail {...{
        cancelDayDetailCloseTimer, closeDayDetail, dayDetailClosing, dayDetailOpen, daySectionStyle,
        deletePeriod, displayWeekdays, endPeriod, endedTasksViewToggle, energyByDate, formatUiDate,
        habitCheckIns, habits, handleEnvironmentLocation, journalDates, journalThreadDates,
        menstrualPrediction, moodDays, moodMonth, moodsByDate, openAnniversaryEditor, openJournalEditor,
        openTaskDetail, openTaskEditor, periodForDate, quickHabitCheckIn, selectedAnniversaries,
        selectedDate, selectedEnergy, selectedEnvironment, selectedFocusSeconds, selectedImpactTotal,
        selectedIsFuture, selectedJournalEntries, selectedMood, selectedTasks, setDayDetailClosing,
        setDayDetailOpen, setEnergy, setEnvironmentChoice, setFocusHistoryDate, setMood, setMoodMonth,
        setSelectedDate, setStatusCalendarMode, setTaskStatus, setViewingJournalId, setVisibleMonth,
        startPeriod, statusCalendarMode, tags, thermalOptions, today, undoHabitCheckIn,
        updatePeriodDayLog, weatherOptions, weekStartsMonday
      }} />

      <FocusDialogs {...{
        activeFocusElapsed, activeFocusHabit, activeFocusNote, activeFocusRemaining, activeFocusSession,
        activeTasks, activeTimerTask, beginEditFocusSession, closeDayDetailImmediately, focusEditId,
        focusEditTagIds, focusHistoryDate, focusHistoryEditFields, focusHistoryRecords, focusMinutes,
        focusMode, focusOpen, focusSessions, focusTagIds, focusTagSelectOpen, formatClock, formatUiDate,
        noteFocusHistoryId, noteFocusHistoryNote, noteFocusHistorySeconds, noteFocusHistorySessions,
        notes, pendingNoteFocusId, saveFocusSessionEdit, setAutoSyncToast, setFocusEditError,
        setFocusEditId, setFocusEditTagIds, setFocusHistoryDate, setFocusMinutes, setFocusMode,
        setFocusOpen, setFocusSessions, setFocusTagIds, setFocusTagSelectOpen, setMainView,
        setNoteFocusHistoryId, setPendingNoteFocusId, setRequestedNoteId, setViewingTask,
        startDirectFocus, startNoteFocus, stopDirectFocus, stopHabitFocus, stopNoteFocus, stopTaskTimer,
        tags, timerNow
      }} />

      <TrashDialog {...{
        clearTrash, moduleOrder, notebooks, permanentlyDeleteTrashItem, restoreTrashItem, setTrashFilter,
        setTrashOpen, showEndedTasks, tags, trashFilter, trashItems, trashOpen, trashTaskGroups,
        trashTaskStatus, visibleTrashItems
      }} />

      <InboxDialogs {...{
        inboxCompletedTasks, inboxOpen, inboxSortDragRef, inboxSortDropTarget, inboxSortOrder,
        inboxTaskMeta, inboxTasks, inboxTodoGroups, openInboxTaskEditor, openTaskAtItsDay,
        openTaskDetail, overdueInboxOpen, overdueTasks, postponeTask, setInboxOpen,
        setInboxSortDropTarget, setInboxSortOrder, setOverdueInboxOpen, setTaskStatus, showEndedTasks,
        today
      }} />

      <MonthPicker {...{
        chooseMonth, isMobileCalendar, mobileActiveMonth, monthPickerTarget, monthPickerYear, moodMonth,
        setMonthPickerTarget, setMonthPickerYear, today, visibleMonth
      }} />

      <AnniversaryEditor {...{
        anniversaryDraft, anniversaryEditorOpen, deleteAnniversary, editingAnniversaryId,
        saveAnniversary, setAnniversaryDraft, setAnniversaryEditorOpen, today
      }} />

      <TagDialogs {...{
        activeManagedTags, addTag, archivedTags, archivedTagsOpen, canSetTagScope, closeTagEditor,
        deleteTag, focusSessions, journalEntries, moduleOrder, newTagColor, newTagName, newTagScope,
        saveTagEdit, selectedTagManageId, setArchivedTagsOpen, setNewTagColor, setNewTagName,
        setNewTagScope, setSelectedTagManageId, setTagArchived, setTagEditDraft, setTagManagerOpen,
        tagEditDraft, tagManagerOpen, tagScopeBlockedReason, tagUsageAreas, tasks
      }} />

      <TaskDetails {...{
        activeFocusSession, activeTimerTask, beginEditFocusSession, deleteTask, editTask, focusEditId,
        focusEditTagIds, focusHistoryEditFields, formatRunningTimer, formatUiDate, openImagePreview,
        saveFocusSessionEdit, setAutoSyncToast, setEditingOccurrenceDate, setEditingTaskId,
        setFocusEditError, setFocusEditId, setFocusEditTagIds, setFocusSessions, setSeriesAction,
        setTaskFocusHistoryOpen, setTaskStatus, setViewingTask, startTaskTimer, stopTaskTimer, tags,
        taskFocusHistoryOpen, taskFocusHistorySeconds, taskFocusHistorySessions, tasks, timerNow,
        viewingTask
      }} />

      <JournalDialogs {...{
        addJournalImages, closeJournalEditor, deleteJournal, editJournal, editingJournalId,
        emotionOptions, formatUiDate, journalDraft, journalEditorOpen, journalMessageDraft,
        openImagePreview, recording, recordingSeconds, removeJournalAttachment, saveJournal,
        sendJournalMessage, setEmotionPickerOpen, setImageLibraryTarget, setJournalDraft,
        setJournalMessageDraft, setViewingJournalId, startJournalRecording, stopJournalRecording, tags,
        toggleDraftTag, viewingJournal
      }} />

      <TaskEditor {...{
        addTaskImages, closeEditor, confirmSingleTask, convertOccurrenceToSingleTask, deleteTask, draft,
        editingOccurrenceDate, editingTaskId, editorOpen, handleTaskNotesKeyDown,
        insertTaskNoteChecklist, openImagePreview, removeTaskImage, saveTask, selectedDate, seriesAction,
        setConfirmSingleTask, setDraft, setImageLibraryTarget, setSeriesAction, setTaskStatus,
        stopRepeating, tags, taskNotesRef, tasks, today, toggleDraftTag, toggleTaskNoteChecklistLine
      }} />

      <MediaDialogs {...{
        chooseLibraryImage, closeImagePreview, draft, imageLibraryNoteId, imageLibraryTarget,
        imagePreview, journalDraft, libraryImages, notes, renamePreviewImage, setImageLibraryTarget,
        stepImagePreview
      }} />

    </main>
  )
}

export default App
