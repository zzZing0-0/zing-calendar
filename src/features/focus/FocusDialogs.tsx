import { FocusHistorySummary } from '../../components/ui/FocusHistorySummary'
import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field } from '../../components/ui/Field'
import type { FocusHistoryRecord } from '../../domain/focus'
import { countdownMinutes, focusSessionDurationSeconds, trashFocusSession } from '../../domain/focus'
import {
  DEFAULT_TAG, DEFAULT_TAG_ID,
  isImportSourceTagId
} from '../../domain/preferences'
import {
  focusSelectableTags
} from '../../domain/tags'
import {
  combinedFocusSecondsByDate,
  formatFocusDuration,
  fromDateKey
} from '../../domain/task'
import type { FocusSession, Note, Tag, Task } from '../../types'
import type { Habit } from '../habits/habitDomain'
import type { MainView } from '../navigation/navigationTypes'

export interface FocusDialogsProps {
  activeFocusElapsed: number
  activeFocusHabit: Habit | null
  activeFocusNote: Note | null
  activeFocusRemaining: number
  activeFocusSession: FocusSession | null
  activeTasks: Task[]
  activeTimerTask: Task | null
  beginEditFocusSession: (session: FocusSession) => void
  closeDayDetailImmediately: () => void
  focusEditId: string | null
  focusEditTagIds: string[]
  focusHistoryDate: string | null
  focusHistoryEditFields: React.JSX.Element
  focusHistoryRecords: FocusHistoryRecord[]
  focusMinutes: string
  focusMode: "stopwatch" | "countdown"
  focusOpen: boolean
  focusSessions: FocusSession[]
  focusTagIds: string[]
  focusTagSelectOpen: boolean
  formatClock: (seconds: number) => string
  formatUiDate: (date: Date) => string
  noteFocusHistoryId: string | null
  noteFocusHistoryNote: Note | null
  noteFocusHistorySeconds: number
  noteFocusHistorySessions: FocusSession[]
  notes: Note[]
  pendingNoteFocusId: string | null
  saveFocusSessionEdit: () => void
  setAutoSyncToast: React.Dispatch<React.SetStateAction<string>>
  setFocusEditError: React.Dispatch<React.SetStateAction<string>>
  setFocusEditId: React.Dispatch<React.SetStateAction<string | null>>
  setFocusEditTagIds: React.Dispatch<React.SetStateAction<string[]>>
  setFocusHistoryDate: React.Dispatch<React.SetStateAction<string | null>>
  setFocusMinutes: React.Dispatch<React.SetStateAction<string>>
  setFocusMode: React.Dispatch<React.SetStateAction<"stopwatch" | "countdown">>
  setFocusOpen: React.Dispatch<React.SetStateAction<boolean>>
  setFocusSessions: React.Dispatch<React.SetStateAction<FocusSession[]>>
  setFocusTagIds: React.Dispatch<React.SetStateAction<string[]>>
  setFocusTagSelectOpen: React.Dispatch<React.SetStateAction<boolean>>
  setMainView: React.Dispatch<React.SetStateAction<MainView>>
  setNoteFocusHistoryId: React.Dispatch<React.SetStateAction<string | null>>
  setPendingNoteFocusId: React.Dispatch<React.SetStateAction<string | null>>
  setRequestedNoteId: React.Dispatch<React.SetStateAction<string | null>>
  setViewingTask: React.Dispatch<React.SetStateAction<Task | null>>
  startDirectFocus: () => void
  startNoteFocus: (note: Note, tagId: string) => void
  stopDirectFocus: (automatic?: boolean) => void
  stopHabitFocus: (habit: Habit) => void
  stopNoteFocus: (note: Note, forcedEndMs?: number | undefined) => void
  stopTaskTimer: (task: Task, complete?: boolean, forcedEndMs?: number | undefined) => void
  tags: Tag[]
  timerNow: number
}

export function FocusDialogs({
  activeFocusElapsed,
  activeFocusHabit,
  activeFocusNote,
  activeFocusRemaining,
  activeFocusSession,
  activeTasks,
  activeTimerTask,
  beginEditFocusSession,
  closeDayDetailImmediately,
  focusEditId,
  focusEditTagIds,
  focusHistoryDate,
  focusHistoryEditFields,
  focusHistoryRecords,
  focusMinutes,
  focusMode,
  focusOpen,
  focusSessions,
  focusTagIds,
  focusTagSelectOpen,
  formatClock,
  formatUiDate,
  noteFocusHistoryId,
  noteFocusHistoryNote,
  noteFocusHistorySeconds,
  noteFocusHistorySessions,
  notes,
  pendingNoteFocusId,
  saveFocusSessionEdit,
  setAutoSyncToast,
  setFocusEditError,
  setFocusEditId,
  setFocusEditTagIds,
  setFocusHistoryDate,
  setFocusMinutes,
  setFocusMode,
  setFocusOpen,
  setFocusSessions,
  setFocusTagIds,
  setFocusTagSelectOpen,
  setMainView,
  setNoteFocusHistoryId,
  setPendingNoteFocusId,
  setRequestedNoteId,
  setViewingTask,
  startDirectFocus,
  startNoteFocus,
  stopDirectFocus,
  stopHabitFocus,
  stopNoteFocus,
  stopTaskTimer,
  tags,
  timerNow
}: FocusDialogsProps) {
  return <>
{focusHistoryDate && (
        <div className="modal-layer focus-history-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭专注记录" onClick={()=>{setFocusHistoryDate(null);setFocusEditId(null)}} />
          <section className="task-editor focus-history-panel" role="dialog" aria-modal="true" aria-label="专注记录">
            <DialogHeader title={<>{formatUiDate(fromDateKey(focusHistoryDate))} · 专注记录</>} eyebrow={<>FOCUS LOG</>} actions={<><Button className="close-button" type="button" onClick={()=>{setFocusHistoryDate(null);setFocusEditId(null)}}>×</Button></>} />
            <div className="editor-body focus-history-body">
              <div className="focus-history-summary"><strong>{formatFocusDuration(combinedFocusSecondsByDate(activeTasks,focusSessions,timerNow,undefined,notes).get(focusHistoryDate)??0)}</strong><span>{focusHistoryRecords.length} 项</span></div>
              {focusHistoryRecords.length===0?<EmptyState className="page-empty compact">这一天还没有专注记录。</EmptyState>:<div className="focus-history-sections">{(['direct','note','task','habit'] as const).map(kind=>{
                const rows=focusHistoryRecords.filter(record=>record.kind===kind)
                if(!rows.length)return null
                const label=kind==='direct'?'自由专注':kind==='note'?'笔记':kind==='habit'?'习惯':'任务'
                return <section className="focus-history-section" key={kind}><h3>{label}<small>{rows.length} 项</small></h3><div className="focus-history-list">{rows.map(record=>{
                  const editing=(record.kind==='direct'||record.kind==='habit')&&record.session&&focusEditId===record.session.id
                  const focusTag=record.tagIds.filter(id=>!isImportSourceTagId(id)).map(id=>tags.find(tag=>tag.id===id)).find(Boolean)
                  return <div className="focus-history-item" key={record.id}>
                    <div className="focus-history-main"><strong className="focus-history-primary">{focusTag&&<i style={{background:focusTag.color}} />}{focusTag?.name??'默认'}</strong><div className="focus-history-meta"><span>{record.kind==='task'?`任务 · ${record.title}`:record.kind==='note'?`笔记 · ${record.title}`:record.kind==='habit'?'习惯专注':'自由专注'}</span><small>{formatFocusDuration(record.seconds)}</small></div></div>
                    {editing&&record.session?<div className="focus-history-edit">{focusHistoryEditFields}<div className="focus-history-edit-tags">{focusSelectableTags(tags).map(tag=>{const checked=focusEditTagIds.includes(tag.id);return <Button key={tag.id} type="button" className={checked?'selected':''} onClick={()=>setFocusEditTagIds([tag.id])}><i style={{background:tag.color}} />{tag.name}</Button>})}</div><div className="focus-history-edit-actions"><Button type="button" onClick={()=>{setFocusEditId(null);setFocusEditError('')}}>取消</Button><Button variant="primary" type="button" className="primary" onClick={saveFocusSessionEdit}>保存</Button></div></div>:<div className="focus-history-actions">
                      {record.kind==='note'&&record.note&&<Button type="button" onClick={()=>{setFocusHistoryDate(null);setFocusEditId(null);setNoteFocusHistoryId(record.note!.id);setMainView('notes');setRequestedNoteId(record.note!.id)}}>查看</Button>}
                      {record.kind==='task'&&record.task&&<Button type="button" onClick={()=>{setFocusHistoryDate(null);closeDayDetailImmediately();setViewingTask(record.task!)}}>查看</Button>}
                      {(record.kind==='direct'||record.kind==='habit')&&record.session&&<><Button type="button" disabled={!record.session.endedAt} onClick={()=>beginEditFocusSession(record.session!)}>更改</Button><Button variant="danger" type="button" className="danger" disabled={!record.session.endedAt} onClick={()=>{if(!record.session?.endedAt)return;if(!window.confirm('确定删除这条专注记录吗？'))return;const now=new Date().toISOString();setFocusSessions(cur=>cur.map(item=>item.id===record.session!.id?trashFocusSession(item,now):item));setAutoSyncToast('✓ 专注已移入回收站')}}>删除</Button></>}
                    </div>}
                  </div>})}</div></section>})}</div>}
            </div>
          </section>
        </div>
      )}

{noteFocusHistoryId && noteFocusHistoryNote && (
        <div className="modal-layer note-focus-history-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭笔记专注历史" onClick={()=>{setNoteFocusHistoryId(null);setFocusEditId(null)}} />
          <section className="task-editor focus-history-panel" role="dialog" aria-modal="true" aria-label="笔记专注历史">
            <DialogHeader title={<>{noteFocusHistoryNote.title || '无标题笔记'} · 专注历史</>} eyebrow={<>NOTE FOCUS</>} actions={<><Button className="close-button" type="button" onClick={()=>{setNoteFocusHistoryId(null);setFocusEditId(null)}}>×</Button></>} />
            <div className="editor-body focus-history-body">
              <FocusHistorySummary duration={formatFocusDuration(noteFocusHistorySeconds)} count={noteFocusHistorySessions.length} />
              {noteFocusHistorySessions.length===0?<EmptyState className="page-empty compact">这篇笔记还没有专注记录。</EmptyState>:<div className="focus-history-list">{noteFocusHistorySessions.map(session=>{
                const editing=focusEditId===session.id
                const focusTag=session.tagIds.filter(id=>!isImportSourceTagId(id)).map(id=>tags.find(tag=>tag.id===id)).find(Boolean)
                const seconds=focusSessionDurationSeconds(session,timerNow)
                const started=new Date(session.startedAt)
                return <div className="focus-history-item" key={session.id}>
                  <div className="focus-history-main"><strong className="focus-history-primary">{focusTag&&<i style={{background:focusTag.color}} />}{focusTag?.name??'默认'}</strong><div className="focus-history-meta"><span>{formatUiDate(started)} · {started.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><small>{formatFocusDuration(seconds)}</small></div></div>
                  {editing?<div className="focus-history-edit">{focusHistoryEditFields}<div className="focus-history-edit-tags">{focusSelectableTags(tags).map(tag=>{const checked=focusEditTagIds.includes(tag.id);return <Button key={tag.id} type="button" className={checked?'selected':''} onClick={()=>setFocusEditTagIds([tag.id])}><i style={{background:tag.color}} />{tag.name}</Button>})}</div><div className="focus-history-edit-actions"><Button type="button" onClick={()=>{setFocusEditId(null);setFocusEditError('')}}>取消</Button><Button variant="primary" type="button" className="primary" onClick={saveFocusSessionEdit}>保存</Button></div></div>:<div className="focus-history-actions"><Button type="button" disabled={!session.endedAt} onClick={()=>beginEditFocusSession(session)}>更改</Button><Button variant="danger" type="button" className="danger" disabled={!session.endedAt} onClick={()=>{if(!session.endedAt)return;if(!window.confirm('确定删除这条笔记专注记录吗？'))return;const now=new Date().toISOString();setFocusSessions(cur=>cur.map(item=>item.id===session.id?trashFocusSession(item,now):item));setAutoSyncToast('✓ 专注已移入回收站')}}>删除</Button></div>}
                </div>})}</div>}
            </div>
          </section>
        </div>
      )}

{focusOpen && (
        <div className="modal-layer focus-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭专注界面" onClick={()=>setFocusOpen(false)} />
          <section className="task-editor focus-panel" role="dialog" aria-modal="true" aria-label="专注">
            <DialogHeader title={<>{activeFocusSession?'正在专注':'开始专注'}</>} eyebrow={<>FOCUS</>} actions={<><Button className="close-button" type="button" onClick={()=>setFocusOpen(false)} aria-label="关闭专注界面">×</Button></>} />
            <div className="editor-body focus-body">
              {activeFocusSession ? <>
                <div className="focus-live-clock">{formatClock(activeFocusSession.mode==='countdown'?activeFocusRemaining:activeFocusElapsed)}</div>
                <div className="focus-live-tags">{activeFocusSession.tagIds.map(id=>tags.find(tag=>tag.id===id)).filter(Boolean).map(tag=><span key={tag!.id}><i style={{background:tag!.color}} />{tag!.name}</span>)}</div>
                <small>{activeFocusSession.mode==='countdown'?`倒计时 · 原定 ${Math.round((activeFocusSession.plannedSeconds??0)/60)} 分钟`:'正计时'}</small>
                {activeFocusNote&&<small>笔记 · {activeFocusNote.title || '无标题笔记'}</small>}
                {activeFocusHabit&&<small>习惯 · {activeFocusHabit.name}</small>}
                <Button className="focus-stop-button" type="button" onClick={()=>{if(activeFocusNote)stopNoteFocus(activeFocusNote);else if(activeFocusHabit)stopHabitFocus(activeFocusHabit);else if(activeTimerTask)stopTaskTimer(activeTimerTask);else stopDirectFocus(false)}}>■ 结束专注</Button>
              </> : <>
                <div className="focus-mode-switch"><Button type="button" className={focusMode==='stopwatch'?'active':''} onClick={()=>setFocusMode('stopwatch')}>正计时</Button><Button type="button" className={focusMode==='countdown'?'active':''} onClick={()=>setFocusMode('countdown')}>倒计时</Button></div>
                {focusMode==='countdown' && <Field className="focus-minutes-field"><span>时长</span><div><input type="number" min="1" max="720" value={focusMinutes} onChange={e=>setFocusMinutes(e.target.value)} onBlur={()=>setFocusMinutes(String(countdownMinutes(focusMinutes,15)))} /><b>分钟</b></div></Field>}
                <div className="focus-tag-picker compact"><span>专注标签</span>{(()=>{const selected=tags.find(tag=>tag.id===(focusTagIds[0]??DEFAULT_TAG_ID))??DEFAULT_TAG;return <Button className="focus-current-tag" type="button" onClick={()=>setFocusTagSelectOpen(true)}><span><i style={{background:selected.color}} />{selected.name}</span><b>›</b></Button>})()}</div>

                {activeTimerTask && <p className="focus-conflict-note">当前有任务正在计时，请先结束任务计时。</p>}
                <Button className="focus-start-button" type="button" disabled={Boolean(activeTimerTask)||focusTagIds.length===0} onClick={startDirectFocus}>▶ 开始专注</Button>
              </>}
            </div>
          </section>
          {focusTagSelectOpen&&<div className="focus-tag-select-layer" role="presentation"><Button className="modal-backdrop" type="button" aria-label="关闭标签选择" onClick={()=>setFocusTagSelectOpen(false)} /><section className="focus-tag-select-panel" role="dialog" aria-modal="true" aria-label="选择专注标签"><header><strong>选择专注标签</strong><Button type="button" onClick={()=>setFocusTagSelectOpen(false)}>×</Button></header><div className="focus-tag-select-list">{focusSelectableTags(tags).map(tag=><Button key={tag.id} type="button" className={focusTagIds.includes(tag.id)?'selected':''} onClick={()=>{setFocusTagIds([tag.id]);setFocusTagSelectOpen(false)}}><i style={{background:tag.color}} /><span>{tag.name}</span>{focusTagIds.includes(tag.id)&&<b>✓</b>}</Button>)}</div></section></div>}
        </div>
      )}

{pendingNoteFocusId&&<div className="focus-tag-select-layer" role="presentation"><Button className="modal-backdrop" type="button" aria-label="关闭标签选择" onClick={()=>setPendingNoteFocusId(null)} /><section className="focus-tag-select-panel" role="dialog" aria-modal="true" aria-label="选择笔记专注标签"><header><strong>选择专注标签</strong><Button type="button" onClick={()=>setPendingNoteFocusId(null)}>×</Button></header><div className="focus-tag-select-list">{focusSelectableTags(tags).map(tag=><Button key={tag.id} type="button" className={focusTagIds.includes(tag.id)?'selected':''} onClick={()=>{setFocusTagIds([tag.id]);const note=notes.find(item=>item.id===pendingNoteFocusId&&!item.trashedAt);if(note)startNoteFocus(note,tag.id);else setPendingNoteFocusId(null)}}><i style={{background:tag.color}} /><span>{tag.name}</span>{focusTagIds.includes(tag.id)&&<b>✓</b>}</Button>)}</div></section></div>}
  </>
}
