import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.resolve(root, file), 'utf8')
const readFeature = (file: string) => read(`src/features/${file}.${fs.existsSync(path.resolve(root, `src/features/${file}.tsx`)) ? 'tsx' : 'ts'}`)

// Legacy source contracts span the composition root and its extracted modules.
// Read the live production files, in workspace order, without rewriting their contents.
const views = [
  'application/ApplicationHeader', 'calendar/CalendarPage', 'statistics/StatisticsPage',
  'habits/HabitWorkspace', 'notes/NotesWorkspace', 'anniversaries/AnniversariesPage',
  'settings/SettingsPage', 'sync/SyncDialogs', 'environment/EnvironmentManager',
  'journal/EmotionDialogs', 'settings/EncouragementManager', 'statistics/WordIgnoreManager',
  'backup/BackupDialogs', 'random-wheel/RandomWorkspace', 'navigation/NavigationSettingsDialogs',
  'attachments/StorageDialogs', 'calendar/DayDetail', 'focus/FocusDialogs', 'trash/TrashDialog',
  'inbox/InboxDialogs', 'calendar/MonthPicker', 'anniversaries/AnniversaryEditor',
  'tags/TagDialogs', 'tasks/TaskDetails', 'journal/JournalDialogs', 'tasks/TaskEditor',
  'attachments/MediaDialogs',
]
const controllers = [
  'application/version', 'calendar/calendarLabels', 'calendar/createCalendarRenderers',
  'navigation/useMobileNavigationPreferences', 'tags/useTagManagement', 'search/useGlobalSearch',
  'focus/useFocusRuntime', 'focus/useFocusHistoryEditor', 'tasks/useTaskNotesEditor',
  'sync/recordSyncDiff', 'sync/syncLabels', 'attachments/AttachmentMedia',
  'journal/StatusIndicators', 'environment/environmentPreferences',
  'backup/createCsvExports', 'backup/downloadTextFile',
]

export function readApplicationSource() {
  return [read('src/App.tsx'), ...views.map(readFeature),
    ...controllers.map(readFeature), read('src/components/ui/PageHeading.tsx'), read('src/features/trash/trashTypes.ts')].join('\n')
}

/** Isolated CSS fixtures need the same design-variable initialization as the app. */
export function readStylesheet(file: string) {
  return [read('src/styles/tokens.css'), read('src/styles/components.css'), read(file)].join('\n')
}
