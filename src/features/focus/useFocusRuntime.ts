import type * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { activeFocusSessions, countdownMinutes, activeFocusSession as findActiveFocusSession, focusTiming, formatFocusClock, noteFocusSeconds } from '../../domain/focus'
import { createDirectFocusSession, createHabitFocusSession, createNoteFocusSession, createTaskFocusSession, lastSelectableFocusTagId } from '../../domain/focusRuntime'
import { appendFocusSession, endFocusSession } from '../../domain/focusSessionActions'
import {
  DEFAULT_TAG_ID,
  isImportSourceTagId
} from '../../domain/preferences'
import {
  focusSelectableTags,
  tagScopeLabel
} from '../../domain/tags'
import {
  materializeOccurrence
} from '../../domain/task'
import { useFocusWakeLock } from '../../hooks/useFocusWakeLock'
import type { FocusSession, Note, Tag, Task, TaskStatus } from '../../types'
import type { Habit } from '../habits/habitDomain'
import type { MainView } from '../navigation/navigationTypes'
interface Dependencies {
  setRequestedHabitId: React.Dispatch<React.SetStateAction<{ id: string; request: number } | null>>
  activeTasks: Task[]
  focusHydrated: boolean
  focusSessions: FocusSession[]
  habits: Habit[]
  keepScreenAwakeDuringFocus: boolean
  maxFocusHours: number
  notes: Note[]
  setFocusSessions: React.Dispatch<React.SetStateAction<FocusSession[]>>
  setMainView: React.Dispatch<React.SetStateAction<MainView>>
  setRequestedNoteId: React.Dispatch<React.SetStateAction<string | null>>
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>
  setTaskStatus: (task: Task, status: TaskStatus) => void
  setTimerNow: React.Dispatch<React.SetStateAction<number>>
  setViewingTask: React.Dispatch<React.SetStateAction<Task | null>>
  tags: Tag[]
  tasks: Task[]
  timerNow: number
  viewingTask: Task | null
}

export function useFocusRuntime({ setRequestedHabitId, activeTasks, focusHydrated, focusSessions, habits, keepScreenAwakeDuringFocus, maxFocusHours, notes, setFocusSessions, setMainView, setRequestedNoteId, setTags, setTaskStatus, setTimerNow, setViewingTask, tags, tasks, timerNow, viewingTask }: Dependencies) {
  const [focusOpen, setFocusOpen] = useState(false)
  const [focusMode, setFocusMode] = useState<'stopwatch'|'countdown'>('stopwatch')
  const [focusMinutes, setFocusMinutes] = useState('15')
  const [focusTagIds, setFocusTagIds] = useState<string[]>([DEFAULT_TAG_ID])
  const [focusTagSelectOpen, setFocusTagSelectOpen] = useState(false)
  const [pendingNoteFocusId, setPendingNoteFocusId] = useState<string | null>(null)
  const routedFocusSessionIdRef = useRef<string | null>(null)

  const activeFocusSession = useMemo(() => findActiveFocusSession(focusSessions), [focusSessions])
  const maxFocusSeconds = maxFocusHours * 3600
  const activeFocusTiming = focusTiming(activeFocusSession, timerNow, maxFocusSeconds)
  const activeFocusElapsed = activeFocusTiming.elapsedSeconds
  const activeFocusRemaining = activeFocusTiming.remainingSeconds
  const formatClock = formatFocusClock
  const startDirectFocus = () => {
    if (activeTimerTask || activeFocusSession) return
    const plannedMinutes=countdownMinutes(focusMinutes,15)
    const now=new Date().toISOString()
    setFocusSessions(current=>appendFocusSession(current,createDirectFocusSession({id:crypto.randomUUID(),tagIds:focusTagIds,mode:focusMode,plannedMinutes,startedAt:now})))
    setTimerNow(Date.now())
  }
  const stopDirectFocus = (automatic=false) => {
    if (!activeFocusSession || activeFocusSession.context) return
    // Keep the just-finished focus tag selected when the panel returns to
    // "Start focus", matching the tag restored after closing/reopening it.
    setFocusTagIds([lastSelectableFocusTagId(activeFocusSession,tags)])
    const nowMs=Date.now()
    const timing=focusTiming(activeFocusSession,nowMs,maxFocusSeconds)
    const dueAtMs=timing.dueAtMs??nowMs
    const endMs=automatic ? dueAtMs : Math.min(nowMs,dueAtMs)
    setFocusSessions(current=>endFocusSession(current,activeFocusSession.id,endMs))
  }

  const activeFocusNote = useMemo(() => {
    const context = activeFocusSession?.context
    if (context?.kind !== 'note') return null
    return notes.find(note => note.id === context.noteId && !note.trashedAt) ?? null
  }, [notes, activeFocusSession?.id])

  const noteFocusSecondsById = useMemo(() => Object.fromEntries(notes.map(note => [note.id, noteFocusSeconds(note.id, focusSessions, timerNow)])), [notes, focusSessions, timerNow])

  const startNoteFocus = (note: Note, tagId: string) => {
    if (activeFocusSession || note.trashedAt) return
    const eligible = focusSelectableTags(tags)
    const selectedTagId = eligible.some(tag => tag.id === tagId) ? tagId : DEFAULT_TAG_ID
    const startedAt = new Date().toISOString()
    setFocusSessions(current => appendFocusSession(current, createNoteFocusSession({ id:crypto.randomUUID(), noteId:note.id, tagIds:[selectedTagId], startedAt })))
    setPendingNoteFocusId(null)
    setFocusOpen(false)
    setMainView('notes')
    setRequestedNoteId(note.id)
    setTimerNow(Date.now())
  }

  const requestNoteFocus = (note: Note) => {
    if (activeFocusSession || note.trashedAt) return
    const last = [...activeFocusSessions(focusSessions)].filter(item => item.endedAt).sort((a,b) => b.startedAt.localeCompare(a.startedAt))[0]
    setFocusTagIds([last ? lastSelectableFocusTagId(last,tags) : DEFAULT_TAG_ID])
    setPendingNoteFocusId(note.id)
  }

  const stopNoteFocus = (note: Note, forcedEndMs?: number) => {
    const session = activeFocusSession
    if (!session || session.context?.kind !== 'note' || session.context.noteId !== note.id) return
    const timing = focusTiming(session, Date.now(), maxFocusSeconds)
    const endMs = Math.min(forcedEndMs ?? Date.now(), timing.dueAtMs ?? Date.now())
    setFocusSessions(current => endFocusSession(current,session.id,endMs))
    setFocusOpen(false)
    setMainView('notes')
    setRequestedNoteId(note.id)
  }

  const activeFocusHabit = useMemo(() => {
    const context=activeFocusSession?.context
    if (context?.kind !== 'habit') return null
    return habits.find(habit=>habit.id===context.habitId && !habit.deletedAt) ?? null
  }, [habits, activeFocusSession?.id])

  const startHabitFocus = (habit: Habit) => {
    if (activeFocusSession || habit.archivedAt || habit.deletedAt) return
    const startedAt=new Date().toISOString()
    const eligible=focusSelectableTags(tags)
    const tagId=eligible.some(tag=>tag.id===habit.tagId)?habit.tagId!:DEFAULT_TAG_ID
    setFocusSessions(current=>appendFocusSession(current,createHabitFocusSession({id:crypto.randomUUID(),habitId:habit.id,tagIds:[tagId],startedAt})))
    setTimerNow(Date.now())
  }
  const stopHabitFocus = (habit: Habit) => {
    const session=activeFocusSession
    if (session?.context?.kind!=='habit' || session.context.habitId!==habit.id) return
    setFocusSessions(current=>endFocusSession(current,session.id,Date.now()))
    setTimerNow(Date.now())
  }

  const activeTimerTask = useMemo(() => {
    const context = activeFocusSession?.context
    if (context?.kind !== 'task') return null
    return activeTasks.find(task => task.id === context.taskId) ?? null
  }, [activeTasks, activeFocusSession?.id])

  useEffect(() => {
    if (!activeFocusSession) return
    setTimerNow(Date.now())
    const timer = window.setInterval(() => setTimerNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activeFocusSession?.id])

  useFocusWakeLock(keepScreenAwakeDuringFocus && Boolean(activeFocusSession))

  useEffect(() => {
    if (!activeFocusSession || activeFocusSession.context) return
    const dueAtMs=focusTiming(activeFocusSession,timerNow,maxFocusSeconds).dueAtMs
    if(dueAtMs!==null&&timerNow>=dueAtMs) stopDirectFocus(true)
  },[timerNow,activeFocusSession?.id,activeFocusSession?.plannedSeconds,maxFocusSeconds])

  useEffect(() => {
    if (!activeFocusNote || !activeFocusSession) return
    const dueAtMs = focusTiming(activeFocusSession,timerNow,maxFocusSeconds).dueAtMs
    if (dueAtMs !== null && timerNow >= dueAtMs) stopNoteFocus(activeFocusNote,dueAtMs)
  }, [timerNow,activeFocusNote?.id,activeFocusSession?.id,maxFocusSeconds])

  useEffect(() => {
    if (!focusHydrated || !activeFocusSession) return
    // Restore a running session's panel once. Task/note mutations must never
    // reopen it after the user has dismissed it to work elsewhere.
    if (routedFocusSessionIdRef.current === activeFocusSession.id) return
    const context = activeFocusSession.context
    if (context?.kind === 'task') {
      const task = activeTasks.find(item => item.id === context.taskId)
      if (task) {
        routedFocusSessionIdRef.current = activeFocusSession.id
        setMainView('calendar')
        setViewingTask(task)
      }
      return
    }
    if (context?.kind === 'habit') {
      routedFocusSessionIdRef.current = activeFocusSession.id
      setMainView('habits')
      return
    }
    if (context?.kind === 'note') {
      const note = notes.find(item => item.id === context.noteId && !item.trashedAt)
      if (note) {
        routedFocusSessionIdRef.current = activeFocusSession.id
        setMainView('notes')
        setRequestedNoteId(note.id)
        setFocusOpen(true)
      }
      return
    }
    routedFocusSessionIdRef.current = activeFocusSession.id
    setMainView('calendar')
    setFocusOpen(true)
  }, [focusHydrated, activeFocusSession?.id, activeTasks, notes])

  useEffect(() => {
    if (!viewingTask) return
    const current = viewingTask.seriesId && viewingTask.occurrenceDate
      ? tasks.find(item => item.id === viewingTask.seriesId)
      : tasks.find(item => item.id === viewingTask.id)
    const refreshed = current
      ? (viewingTask.seriesId && viewingTask.occurrenceDate ? materializeOccurrence(current, viewingTask.occurrenceDate) : current)
      : null
    if (refreshed) setViewingTask(refreshed)
  }, [tasks])

  const startTaskTimer = (task: Task) => {
    if (activeFocusSession || task.status !== 'todo' || task.recurrence || task.seriesId) return
    const ordinaryId=(task.tagIds??[]).find(id=>id!==DEFAULT_TAG_ID&&!isImportSourceTagId(id))
    const ordinaryTag=tags.find(tag=>tag.id===ordinaryId)
    let focusTagIds=[ordinaryTag?.id??DEFAULT_TAG_ID]
    if(ordinaryTag&&ordinaryTag.scope!=='both'&&ordinaryTag.scope!=='focus'){
      const share=window.confirm(`#${ordinaryTag.name} 目前是「${tagScopeLabel(ordinaryTag.scope)}」，不能直接用于专注。\n\n确定：扩展为共享标签并用于本次专注\n取消：保持原标签，本次专注记入「默认」`)
      if(share){ const now=new Date().toISOString(); setTags(current=>current.map(tag=>tag.id===ordinaryTag.id?{...tag,scope:'both',updatedAt:now}:tag)) }
      else focusTagIds=[DEFAULT_TAG_ID]
    }
    const startedAt=new Date().toISOString()
    setFocusSessions(current=>appendFocusSession(current,createTaskFocusSession({id:crypto.randomUUID(),taskId:task.id,tagIds:focusTagIds,startedAt})))
    setTimerNow(Date.now())
  }

  const stopTaskTimer = (task: Task, complete = false, forcedEndMs?: number) => {
    const session=activeFocusSession
    if (!session || session.context?.kind!=='task' || session.context.taskId!==task.id) return
    const timing=focusTiming(session,Date.now(),maxFocusSeconds)
    const endMs=Math.min(forcedEndMs??Date.now(),timing.dueAtMs??Date.now())
    setFocusSessions(current=>endFocusSession(current,session.id,endMs))
    if (complete) setTaskStatus(task,'completed')
  }

  useEffect(() => {
    if (!activeTimerTask || !activeFocusSession) return
    const dueAtMs=focusTiming(activeFocusSession,timerNow,maxFocusSeconds).dueAtMs
    if(dueAtMs!==null&&timerNow>=dueAtMs) stopTaskTimer(activeTimerTask,false,dueAtMs)
  },[timerNow,activeTimerTask?.id,activeFocusSession?.id,maxFocusSeconds])

  const formatRunningTimer = (_task: Task) => formatFocusClock(focusTiming(activeFocusSession,timerNow,maxFocusSeconds).elapsedSeconds)

  const openFocus = () => {
    if(activeTimerTask){setViewingTask(activeTimerTask);return}if(activeFocusHabit){setFocusOpen(false);setRequestedHabitId(previous=>({id:activeFocusHabit.id,request:(previous?.request??0)+1}));setMainView('habits');return}if(activeFocusNote){setFocusOpen(false);setMainView('notes');setRequestedNoteId(activeFocusNote.id);return}if(!activeFocusSession){const last=[...activeFocusSessions(focusSessions)].filter(item=>item.endedAt).sort((a,b)=>b.startedAt.localeCompare(a.startedAt))[0];const lastOrdinary=last?.tagIds.find(id=>id===DEFAULT_TAG_ID||(!isImportSourceTagId(id)&&tags.some(tag=>tag.id===id&&!tag.archived&&(tag.scope==='both'||tag.scope==='focus'))));setFocusTagIds([lastOrdinary??DEFAULT_TAG_ID])}setFocusOpen(true)
  }

  return { openFocus, focusOpen, setFocusOpen, focusMode, setFocusMode, focusMinutes, setFocusMinutes, focusTagIds, setFocusTagIds, focusTagSelectOpen, setFocusTagSelectOpen, pendingNoteFocusId, setPendingNoteFocusId, activeFocusElapsed, activeFocusHabit, activeFocusNote, activeFocusRemaining, activeFocusSession, activeTimerTask, formatClock, formatRunningTimer, noteFocusSecondsById, requestNoteFocus, startDirectFocus, startHabitFocus, startNoteFocus, startTaskTimer, stopDirectFocus, stopHabitFocus, stopNoteFocus, stopTaskTimer }
}
