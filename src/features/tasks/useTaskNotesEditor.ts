import type * as React from 'react'
import type { KeyboardEvent } from 'react'
import { useRef } from 'react'
import type { TaskDraft } from '../../types'
interface Dependencies {
  draft: TaskDraft
  setDraft: React.Dispatch<React.SetStateAction<TaskDraft>>
}

export function useTaskNotesEditor({ draft, setDraft }: Dependencies) {
  const taskNotesRef = useRef<HTMLTextAreaElement | null>(null)
  const insertTaskNoteChecklist = () => {
    const textarea = taskNotesRef.current
    const value = draft.notes
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? start
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const prefix = value.slice(lineStart, start)
    const insertion = prefix.trim().length === 0 ? '☐ ' : `\n☐ `
    const next = value.slice(0, start) + insertion + value.slice(end)
    const cursor = start + insertion.length
    setDraft(current => ({ ...current, notes: next }))
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(cursor, cursor)
    })
  }

  const handleTaskNotesKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return
    const textarea = event.currentTarget
    const value = draft.notes
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start !== end) return
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const line = value.slice(lineStart, start)
    const match = line.match(/^(☐|☑)\s?(.*)$/)
    if (!match) return
    event.preventDefault()
    if (!match[2].trim()) {
      const next = value.slice(0, lineStart) + value.slice(start)
      const cursor = lineStart
      setDraft(current => ({ ...current, notes: next }))
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(cursor, cursor)
      })
      return
    }
    const insertion = `\n${match[1]} `
    const next = value.slice(0, start) + insertion + value.slice(start)
    const cursor = start + insertion.length
    setDraft(current => ({ ...current, notes: next }))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const toggleTaskNoteChecklistLine = () => {
    const textarea = taskNotesRef.current
    if (!textarea) return
    const value = draft.notes
    const start = textarea.selectionStart
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const lineEndRaw = value.indexOf('\n', start)
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw
    const line = value.slice(lineStart, lineEnd)
    if (!/^[☐☑]\s?/.test(line)) return
    const nextMark = line.startsWith('☐') ? '☑' : '☐'
    const next = value.slice(0, lineStart) + nextMark + value.slice(lineStart + 1)
    setDraft(current => ({ ...current, notes: next }))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start)
    })
  }

  return { handleTaskNotesKeyDown, insertTaskNoteChecklist, taskNotesRef, toggleTaskNoteChecklistLine }
}
