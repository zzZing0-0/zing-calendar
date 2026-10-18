import type { FocusSession, Tag } from '../types'
import { DEFAULT_TAG_ID, isImportSourceTagId } from './preferences'

export function createDirectFocusSession(input: { id:string; tagIds:string[]; mode:FocusSession['mode']; plannedMinutes:number; startedAt:string }): FocusSession {
  return { id:input.id, tagIds:input.tagIds.length?input.tagIds:[DEFAULT_TAG_ID], mode:input.mode,
    ...(input.mode==='countdown'?{plannedSeconds:input.plannedMinutes*60}:{}), startedAt:input.startedAt, createdAt:input.startedAt, updatedAt:input.startedAt }
}

export function createTaskFocusSession(input: { id:string; taskId:string; tagIds:string[]; startedAt:string }): FocusSession {
  return { id:input.id, tagIds:input.tagIds.length?input.tagIds:[DEFAULT_TAG_ID], mode:'stopwatch', startedAt:input.startedAt,
    createdAt:input.startedAt, updatedAt:input.startedAt, context:{kind:'task',taskId:input.taskId} }
}

export function createNoteFocusSession(input: { id:string; noteId:string; tagIds:string[]; startedAt:string }): FocusSession {
  return { id:input.id, tagIds:input.tagIds.length?input.tagIds:[DEFAULT_TAG_ID], mode:'stopwatch', startedAt:input.startedAt,
    createdAt:input.startedAt, updatedAt:input.startedAt, context:{kind:'note',noteId:input.noteId} }
}

export function createHabitFocusSession(input: { id:string; habitId:string; tagIds:string[]; startedAt:string }): FocusSession {
  return { id:input.id, tagIds:input.tagIds.length?input.tagIds:[DEFAULT_TAG_ID], mode:'stopwatch', startedAt:input.startedAt,
    createdAt:input.startedAt, updatedAt:input.startedAt, context:{kind:'habit',habitId:input.habitId} }
}

export function lastSelectableFocusTagId(session: FocusSession, tags: Tag[]) {
  return session.tagIds.find(id => id===DEFAULT_TAG_ID || (!isImportSourceTagId(id) && tags.some(tag=>tag.id===id&&!tag.archived&&(tag.scope==='both'||tag.scope==='focus')))) ?? DEFAULT_TAG_ID
}
