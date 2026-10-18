import type { FocusSession } from '../types'
import { finishedFocusSession } from './focus'
import { focusLocalInputToDate } from './focusHistorySelectors'

/** Immutable updates shared by task, note and direct focus workflows. */
export function appendFocusSession(sessions: FocusSession[], session: FocusSession): FocusSession[] {
  return [...sessions, session]
}

export function endFocusSession(sessions: FocusSession[], id: string, endMs: number): FocusSession[] {
  return sessions.map(session => session.id === id && !session.trashedAt && !session.endedAt
    ? finishedFocusSession(session, endMs) : session)
}

export type FocusEditInput = {
  startedAt: string
  endedAt: string
  tagIds: string[]
  maxFocusHours: number
  updatedAt: string
}
export type FocusEditResult = { session: FocusSession; error: null } | { session: null; error: string }

/** Validate before mutating a completed session; keep stored ISO timestamps and seconds consistent. */
export function editFinishedFocusSession(session: FocusSession, input: FocusEditInput): FocusEditResult {
  if (!session.endedAt || session.trashedAt) return { session: null, error: '只能修改已结束且未删除的专注记录' }
  const start = focusLocalInputToDate(input.startedAt)
  const end = focusLocalInputToDate(input.endedAt)
  if (!start || !end) return { session: null, error: '请选择完整的开始和结束日期时间' }
  const durationMs = end.getTime() - start.getTime()
  if (durationMs <= 0) return { session: null, error: '结束时间必须晚于开始时间' }
  if (durationMs > input.maxFocusHours * 3600000) return { session: null, error: `专注时长不能超过 ${input.maxFocusHours} 小时` }
  return { session: { ...session, tagIds: input.tagIds, startedAt: start.toISOString(), endedAt: end.toISOString(), durationSeconds: Math.round(durationMs / 1000), updatedAt: input.updatedAt }, error: null }
}
