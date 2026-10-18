import type * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_TAG_ID,
  TAG_COLORS,
  isImportSourceTag
} from '../../domain/preferences'
import {
  cleanupJournalTagIdsAfterDelete, cleanupNoteTagIdsAfterDelete, cleanupTaskTagIdsAfterDelete,
  managedTagRows,
  normalizedTagName,
  sortTagsByColor, tagDateFromKey, tagNameTaken, tagScopeLabel
} from '../../domain/tags'
import {
  taskEndDate,
  toDateKey
} from '../../domain/task'
import type { FocusSession, JournalEntry, Note, Tag, TagScope, Task } from '../../types'
import type { Habit } from '../habits/habitDomain'
interface Dependencies {
  activeJournalEntries: JournalEntry[]
  activeTasks: Task[]
  focusSessions: FocusSession[]
  habits: Habit[]
  journalEntries: JournalEntry[]
  notes: Note[]
  setAutoSyncToast: React.Dispatch<React.SetStateAction<string>>
  setFocusSessions: React.Dispatch<React.SetStateAction<FocusSession[]>>
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  tags: Tag[]
  tasks: Task[]
}

export function useTagManagement({ activeJournalEntries, activeTasks, focusSessions, habits, journalEntries, notes, setAutoSyncToast, setFocusSessions, setHabits, setJournalEntries, setNotes, setTags, setTasks, tags, tasks }: Dependencies) {
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [archivedTagsOpen, setArchivedTagsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [newTagScope, setNewTagScope] = useState<TagScope>('both')
  const [selectedTagManageId, setSelectedTagManageId] = useState<string | null>(null)
  const [tagEditDraft, setTagEditDraft] = useState<{name:string;color:string;scope:TagScope} | null>(null)

  useEffect(() => {
    if (!selectedTagManageId) { setTagEditDraft(null); return }
    const tag = tags.find(item => item.id === selectedTagManageId)
    if (tag) setTagEditDraft({ name: tag.name, color: tag.color, scope: tag.scope })
  }, [selectedTagManageId])

  const addTag = () => {
    const name = newTagName.trim()
    if (!name) return
    const existing = tags.find(tag => normalizedTagName(tag.name) === normalizedTagName(name))
    if (existing) {
      if (!existing.system && existing.scope !== 'both' && existing.scope !== newTagScope) {
        const upgrade = window.confirm(`#${existing.name} 已存在于「${tagScopeLabel(existing.scope)}」。\n\n是否更改为「共享标签」？`)
        if (upgrade) {
          setTags(current => current.map(tag => tag.id === existing.id ? { ...tag, scope: 'both', updatedAt: new Date().toISOString() } : tag))
          setNewTagName('')
          setNewTagScope('both')
          setSelectedTagManageId(existing.id)
          setAutoSyncToast(`✓ #${existing.name} 已改为共享标签`)
        }
        return
      }
      if (!existing.system && newTagScope === 'both' && existing.scope !== 'both') {
        const upgrade = window.confirm(`#${existing.name} 已存在于「${tagScopeLabel(existing.scope)}」。\n\n是否更改为「共享标签」？`)
        if (upgrade) {
          setTags(current => current.map(tag => tag.id === existing.id ? { ...tag, scope: 'both', updatedAt: new Date().toISOString() } : tag))
          setNewTagName('')
          setSelectedTagManageId(existing.id)
          setAutoSyncToast(`✓ #${existing.name} 已改为共享标签`)
        }
        return
      }
      setAutoSyncToast(`⚠ #${existing.name} 已存在于${existing.system ? '系统标签' : `「${tagScopeLabel(existing.scope)}」`}`)
      return
    }
    const id = crypto.randomUUID()
    setTags(current => [...current, { id, name, color: newTagColor, scope: newTagScope, sortOrder: Math.max(-1, ...current.filter(tag => !tag.system).map(tag => tag.sortOrder ?? 0)) + 1, updatedAt: new Date().toISOString() }])
    setNewTagName('')
  }

  const closeTagEditor = () => {
    setSelectedTagManageId(null)
    setTagEditDraft(null)
  }

  const saveTagEdit = (tag: Tag) => {
    if (!tagEditDraft) return
    const blockedReason = tagScopeBlockedReason(tag.id, tagEditDraft.scope)
    if (blockedReason) {
      setAutoSyncToast(`⚠ ${blockedReason}`)
      return
    }
    const name = tagEditDraft.name.trim()
    if (!name) return
    if (tagNameTaken(tags, name, tag.id)) {
      setAutoSyncToast(`⚠ #${name} 已存在`)
      return
    }
    const now = new Date().toISOString()
    setTags(current => current.map(item => item.id === tag.id ? { ...item, name, color: tagEditDraft.color, scope: tagEditDraft.scope, updatedAt: now } : item))
    setNewTagScope(tagEditDraft.scope)
    setAutoSyncToast(`✓ #${name} 已保存`)
    closeTagEditor()
  }

  const tagUsageAreas = (id: string) => {
    const taskUsed = tasks.some(task => !task.trashedAt && ((task.tagIds ?? []).includes(id) || Object.values(task.recurrenceExceptions ?? {}).some(exception => !exception.trashedAt && (exception.tagIds ?? []).includes(id))))
    const focusUsed = focusSessions.some(session => !session.trashedAt && (session.tagIds ?? []).includes(id))
    const journalUsed = journalEntries.some(entry => !entry.trashedAt && (entry.tagIds ?? []).includes(id))
    const noteUsed = notes.some(note => !note.trashedAt && (note.tagIds ?? []).includes(id))
    const habitUsed = habits.some(habit => !habit.deletedAt && habit.tagId===id)
    return [taskUsed && '任务', focusUsed && '专注', journalUsed && '记录', noteUsed && '笔记',habitUsed && '习惯'].filter(Boolean) as string[]
  }

  const canSetTagScope = (tagId: string, nextScope: TagScope) => {
    if (nextScope === 'both') return true
    const usage = tagUsageAreas(tagId)
    if (usage.length === 0) return true
    if (usage.length > 1) return false
    const scopeForUsage: Record<string, TagScope> = { '任务': 'task', '专注': 'focus', '记录': 'journal', '笔记': 'note', '习惯': 'habit' }
    return scopeForUsage[usage[0]] === nextScope
  }

  const tagScopeBlockedReason = (tagId: string, nextScope: TagScope) => {
    if (canSetTagScope(tagId, nextScope)) return ''
    const usage = tagUsageAreas(tagId)
    return usage.length > 1
      ? `当前引用：${usage.join(' · ')}，跨多个分类使用时必须保持共享`
      : `当前仅实际用于${usage[0]}，不能缩小到其他分类`
  }

  const setTagArchived = (id: string, archived: boolean) => {
    const archivedAt = archived ? toDateKey(new Date()) : undefined
    setTags(current => current.map(tag => tag.id === id ? { ...tag, archived, archivedAt, updatedAt: new Date().toISOString() } : tag))
  }

  const deleteTag = (id: string) => {
    const tag = tags.find(item=>item.id===id)
    if (id === DEFAULT_TAG_ID || tag?.system) return
    const taskCount = tasks.filter(task => (task.tagIds ?? []).includes(id) || Object.values(task.recurrenceExceptions ?? {}).some(exception => (exception.tagIds ?? []).includes(id))).length
    const focusCount = focusSessions.filter(session => (session.tagIds ?? []).includes(id)).length
    const journalCount = journalEntries.filter(entry => (entry.tagIds ?? []).includes(id)).length
    const noteCount = notes.filter(note => !note.trashedAt && (note.tagIds ?? []).includes(id)).length
    const habitCount=habits.filter(h=>h.tagId===id).length
    const linked = taskCount + focusCount + journalCount + noteCount + habitCount
    if (linked && !window.confirm(`删除「${tag?.name ?? '该标签'}」？\n\n关联任务 ${taskCount} 条 · 专注 ${focusCount} 条 · 记录 ${journalCount} 条 · 笔记 ${noteCount} 条 · 习惯 ${habitCount} 条\n关联内容会保留。`)) return
    if (!linked && !window.confirm(`删除「${tag?.name ?? '该标签'}」？`)) return
    const now = new Date().toISOString()
    setTags(current => current.filter(item => item.id !== id))
    setTasks(current => current.map(task => ({
      ...task,
      tagIds: (task.tagIds ?? []).includes(id) ? cleanupTaskTagIdsAfterDelete(task.tagIds, id) : task.tagIds,
      recurrenceExceptions: task.recurrenceExceptions ? Object.fromEntries(Object.entries(task.recurrenceExceptions).map(([key,exception]) => [key, (exception.tagIds ?? []).includes(id) ? {...exception,tagIds:cleanupTaskTagIdsAfterDelete(exception.tagIds,id),updatedAt:now} : exception])) : task.recurrenceExceptions,
      updatedAt: (task.tagIds ?? []).includes(id) || Object.values(task.recurrenceExceptions ?? {}).some(exception => (exception.tagIds ?? []).includes(id)) ? now : task.updatedAt
    })))
    setFocusSessions(current => current.map(session => (session.tagIds ?? []).includes(id) ? {...session,tagIds:cleanupTaskTagIdsAfterDelete(session.tagIds,id),updatedAt:now} : session))
    setJournalEntries(current => current.map(entry => (entry.tagIds ?? []).includes(id) ? {...entry,tagIds:cleanupJournalTagIdsAfterDelete(entry.tagIds,id),updatedAt:now} : entry))
    setNotes(current => current.map(note => (note.tagIds ?? []).includes(id) ? {...note,tagIds:cleanupNoteTagIdsAfterDelete(note.tagIds,id),updatedAt:now} : note))
    setHabits(current=>current.map(h=>h.tagId===id?{...h,tagId:undefined,updatedAt:now}:h))
    setSelectedTagManageId(null)
    setAutoSyncToast(`✓ #${tag?.name ?? '标签'} 已删除`)
  }

  const managedTags = useMemo(() => managedTagRows(tags), [tags])

  const activeManagedTags = useMemo(() => managedTags.filter(tag => !tag.archived), [managedTags])
  const archivedTags = useMemo(() => sortTagsByColor(tags.filter(tag => tag.id !== DEFAULT_TAG_ID && !isImportSourceTag(tag) && tag.archived), tags), [tags])

  const tagUsage = useMemo(() => {
    const usage = new Map<string,{tasks:number;journals:number;days:number}>()
    managedTags.forEach(tag => {
      const taskRows = activeTasks.filter(task => (task.tagIds ?? [DEFAULT_TAG_ID]).includes(tag.id))
      const journalRows = activeJournalEntries.filter(entry => (entry.tagIds ?? [DEFAULT_TAG_ID]).includes(tag.id))
      const days = new Set<string>()
      taskRows.forEach(task => {
        if (!task.date) return
        const start = tagDateFromKey(task.date), end = tagDateFromKey(taskEndDate(task))
        if (!start || !end) { days.add(task.date); return }
        for (let cursor=new Date(start); cursor<=end; cursor.setDate(cursor.getDate()+1)) days.add(toDateKey(cursor))
      })
      journalRows.forEach(entry => days.add(entry.date))
      usage.set(tag.id,{tasks:taskRows.length,journals:journalRows.length,days:days.size})
    })
    return usage
  },[managedTags,activeTasks,activeJournalEntries])

  return { activeManagedTags, addTag, archivedTags, archivedTagsOpen, canSetTagScope, closeTagEditor, deleteTag, managedTags, newTagColor, newTagName, newTagScope, saveTagEdit, selectedTagManageId, setArchivedTagsOpen, setNewTagColor, setNewTagName, setNewTagScope, setSelectedTagManageId, setTagArchived, setTagEditDraft, setTagManagerOpen, tagEditDraft, tagManagerOpen, tagScopeBlockedReason, tagUsage, tagUsageAreas }
}
