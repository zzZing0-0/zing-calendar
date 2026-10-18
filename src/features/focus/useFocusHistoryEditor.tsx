import type * as React from 'react'
import { useState } from 'react'
import { Field } from '../../components/ui/Field'
import { focusIsoToLocalInput, focusLocalInputToDate } from '../../domain/focusHistorySelectors'
import { editFinishedFocusSession } from '../../domain/focusSessionActions'
import {
  singleOrdinaryTagIds
} from '../../domain/tags'
import {
  formatFocusDuration
} from '../../domain/task'
import type {
  FocusSession
} from '../../types'
interface Dependencies {
  focusSessions: FocusSession[]
  maxFocusHours: number
  setFocusSessions: React.Dispatch<React.SetStateAction<FocusSession[]>>
}

export function useFocusHistoryEditor({ focusSessions, maxFocusHours, setFocusSessions }: Dependencies) {
  const [focusEditId, setFocusEditId] = useState<string | null>(null)
  const [focusEditStartedAt, setFocusEditStartedAt] = useState('')
  const [focusEditEndedAt, setFocusEditEndedAt] = useState('')
  const [focusEditError, setFocusEditError] = useState('')
  const [focusEditTagIds, setFocusEditTagIds] = useState<string[]>([])

  const toLocalDateTimeInput = focusIsoToLocalInput
  const fromLocalDateTimeInput = focusLocalInputToDate
  const beginEditFocusSession = (session:FocusSession) => {
    if(!session.endedAt) return
    setFocusEditId(session.id)
    setFocusEditStartedAt(toLocalDateTimeInput(session.startedAt))
    setFocusEditEndedAt(toLocalDateTimeInput(session.endedAt))
    setFocusEditError('')
    setFocusEditTagIds(session.tagIds)
  }
  const focusEditDurationSeconds = (() => {
    const start=fromLocalDateTimeInput(focusEditStartedAt)?.getTime()
    const end=fromLocalDateTimeInput(focusEditEndedAt)?.getTime()
    return start!==undefined&&end!==undefined&&end>start ? Math.round((end-start)/1000) : 0
  })()
  const saveFocusSessionEdit = () => {
    if (!focusEditId) return
    const session = focusSessions.find(item => item.id === focusEditId)
    if (!session) { setFocusEditError('专注记录不存在'); return }
    const result = editFinishedFocusSession(session, {
      startedAt: focusEditStartedAt, endedAt: focusEditEndedAt,
      tagIds: singleOrdinaryTagIds(focusEditTagIds.length ? focusEditTagIds : session.tagIds),
      maxFocusHours, updatedAt: new Date().toISOString(),
    })
    if (result.error) { setFocusEditError(result.error); return }
    if (!result.session) return
    setFocusSessions(current => current.map(item => item.id === focusEditId ? result.session : item))
    setFocusEditId(null); setFocusEditError('')
  }
  const focusHistoryEditFields = <>
    <div className="focus-history-edit-times"><Field><span>开始</span><input type="datetime-local" value={focusEditStartedAt} onChange={e=>{setFocusEditStartedAt(e.target.value);setFocusEditError('')}} /></Field><Field><span>结束</span><input type="datetime-local" value={focusEditEndedAt} onChange={e=>{setFocusEditEndedAt(e.target.value);setFocusEditError('')}} /></Field></div>
    <div className="focus-history-derived-duration"><span>计算时长</span><strong>{focusEditDurationSeconds>0?formatFocusDuration(focusEditDurationSeconds):'—'}</strong></div>
    {focusEditError&&<small className="focus-history-edit-error">{focusEditError}</small>}
  </>

  return { beginEditFocusSession, focusEditId, focusEditTagIds, focusHistoryEditFields, saveFocusSessionEdit, setFocusEditError, setFocusEditId, setFocusEditTagIds }
}
