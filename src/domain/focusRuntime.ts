import type { FocusSession, RecurrenceException, Tag, Task, TaskStatus } from '../types'
import { DEFAULT_TAG_ID, isImportSourceTagId } from './preferences'
import { materializeOccurrence } from './task'

export function findActiveTimedTask(tasks: Task[]) {
  for (const task of tasks) {
    if (task.activeTimerStartedAt) return task
    if (!task.recurrenceExceptions) continue
    for (const [occurrenceDate, exception] of Object.entries(task.recurrenceExceptions) as [string, RecurrenceException][]) {
      if (!exception.activeTimerStartedAt) continue
      const occurrence = materializeOccurrence(task, occurrenceDate)
      if (occurrence) return occurrence
    }
  }
  return null
}

export function createDirectFocusSession(input: {
  id: string
  tagIds: string[]
  mode: FocusSession['mode']
  plannedMinutes: number
  startedAt: string
}): FocusSession {
  return {
    id: input.id,
    tagIds: input.tagIds.length ? input.tagIds : [DEFAULT_TAG_ID],
    mode: input.mode,
    ...(input.mode === 'countdown' ? { plannedSeconds: input.plannedMinutes * 60 } : {}),
    startedAt: input.startedAt,
    createdAt: input.startedAt,
    updatedAt: input.startedAt,
  }
}

export function lastSelectableFocusTagId(session: FocusSession, tags: Tag[]) {
  return session.tagIds.find(id =>
    id === DEFAULT_TAG_ID ||
    (!isImportSourceTagId(id) && tags.some(tag => tag.id === id && !tag.archived && (tag.scope === 'both' || tag.scope === 'focus'))),
  ) ?? DEFAULT_TAG_ID
}

export function taskTimerStopPatch(
  current: Task | RecurrenceException,
  fallbackTask: Task,
  endedAt: Date,
  durationSeconds: number,
  complete = false,
): Partial<Task> | Partial<RecurrenceException> {
  const previousMinutes = Number(current.actualDurationMinutes ?? fallbackTask.actualDurationMinutes ?? 0)
  const previousRemainder = Number(current.timerSecondsRemainder ?? fallbackTask.timerSecondsRemainder ?? 0)
  const totalSeconds = previousRemainder + durationSeconds
  const addedMinutes = Math.floor(totalSeconds / 60)
  return {
    activeTimerStartedAt: undefined,
    activeTimerFocusTagIds: undefined,
    timerSessions: [
      ...(current.timerSessions ?? fallbackTask.timerSessions ?? []),
      {
        startedAt: fallbackTask.activeTimerStartedAt!,
        endedAt: endedAt.toISOString(),
        durationSeconds,
        focusTagIds: current.activeTimerFocusTagIds ?? fallbackTask.activeTimerFocusTagIds ?? [DEFAULT_TAG_ID],
      },
    ],
    timerSecondsRemainder: totalSeconds % 60,
    actualDurationMinutes: previousMinutes + addedMinutes,
    ...(complete ? { status: 'completed' as TaskStatus, completedAt: endedAt.toISOString() } : {}),
  }
}

export function runningTaskSeconds(task: Task, nowMs: number, maxFocusSeconds: number) {
  if (!task.activeTimerStartedAt) return 0
  return Math.min(maxFocusSeconds, Math.max(0, Math.floor((nowMs - new Date(task.activeTimerStartedAt).getTime()) / 1000)))
}

export function formatRunningTaskTimer(task: Task, nowMs: number, maxFocusSeconds: number) {
  const seconds = runningTaskSeconds(task, nowMs, maxFocusSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
