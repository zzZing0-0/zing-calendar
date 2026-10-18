import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { focusSessionDurationSeconds, trashFocusSession } from '../../domain/focus'
import {
  DEFAULT_TAG_ID,
  isImportSourceTagId
} from '../../domain/preferences'
import {
  focusSelectableTags
} from '../../domain/tags'
import {
  formatFocusDuration, formatTaskRange, fromDateKey, isMultiDayTask
} from '../../domain/task'
import type { Attachment, FocusSession, Tag, Task, TaskStatus } from '../../types'
import { AttachmentThumb } from '../attachments/AttachmentMedia'

export interface TaskDetailsProps {
  activeFocusSession: FocusSession | null
  activeTimerTask: Task | null
  beginEditFocusSession: (session: FocusSession) => void
  deleteTask: (task: Task, scope?: "occurrence" | "series" | "future") => void
  editTask: (task: Task) => void
  focusEditId: string | null
  focusEditTagIds: string[]
  focusHistoryEditFields: React.JSX.Element
  formatRunningTimer: (_task: Task) => string
  formatUiDate: (date: Date) => string
  openImagePreview: (attachment: Attachment, gallery?: Attachment[]) => Promise<void>
  saveFocusSessionEdit: () => void
  setAutoSyncToast: React.Dispatch<React.SetStateAction<string>>
  setEditingOccurrenceDate: React.Dispatch<React.SetStateAction<string | null>>
  setEditingTaskId: React.Dispatch<React.SetStateAction<string | null>>
  setFocusEditError: React.Dispatch<React.SetStateAction<string>>
  setFocusEditId: React.Dispatch<React.SetStateAction<string | null>>
  setFocusEditTagIds: React.Dispatch<React.SetStateAction<string[]>>
  setFocusSessions: React.Dispatch<React.SetStateAction<FocusSession[]>>
  setSeriesAction: React.Dispatch<React.SetStateAction<"save" | "delete" | null>>
  setTaskFocusHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>
  setTaskStatus: (task: Task, status: TaskStatus) => void
  setViewingTask: React.Dispatch<React.SetStateAction<Task | null>>
  startTaskTimer: (task: Task) => void
  stopTaskTimer: (task: Task, complete?: boolean, forcedEndMs?: number | undefined) => void
  tags: Tag[]
  taskFocusHistoryOpen: boolean
  taskFocusHistorySeconds: number
  taskFocusHistorySessions: FocusSession[]
  tasks: Task[]
  timerNow: number
  viewingTask: Task | null
}

export function TaskDetails({
  activeFocusSession,
  activeTimerTask,
  beginEditFocusSession,
  deleteTask,
  editTask,
  focusEditId,
  focusEditTagIds,
  focusHistoryEditFields,
  formatRunningTimer,
  formatUiDate,
  openImagePreview,
  saveFocusSessionEdit,
  setAutoSyncToast,
  setEditingOccurrenceDate,
  setEditingTaskId,
  setFocusEditError,
  setFocusEditId,
  setFocusEditTagIds,
  setFocusSessions,
  setSeriesAction,
  setTaskFocusHistoryOpen,
  setTaskStatus,
  setViewingTask,
  startTaskTimer,
  stopTaskTimer,
  tags,
  taskFocusHistoryOpen,
  taskFocusHistorySeconds,
  taskFocusHistorySessions,
  tasks,
  timerNow,
  viewingTask
}: TaskDetailsProps) {
  return <>
{viewingTask && (
        <div className="modal-layer task-view-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭任务详情" onClick={()=>{setTaskFocusHistoryOpen(false);setFocusEditId(null);setViewingTask(null)}} />
          <section className="task-editor task-viewer" role="dialog" aria-modal="true" aria-labelledby="task-view-title">
            <div className="editor-header task-view-header">
              <div className="task-view-heading">
                <div className="task-view-title-row">
                  <Button
                    type="button"
                    className={`task-view-checkbox priority-${viewingTask.priority} status-${viewingTask.status}`}
                    aria-label={viewingTask.status==='completed'?'取消完成':'完成任务'}
                    onClick={()=>{
                      const nextStatus:TaskStatus=viewingTask.status==='completed'?'todo':'completed'
                      if (activeTimerTask?.id===viewingTask.id && nextStatus==='completed') {
                        stopTaskTimer(viewingTask, true)
                        return
                      }
                      setTaskStatus(viewingTask,nextStatus)
                      setViewingTask(current=>current?{...current,status:nextStatus,completedAt:nextStatus==='completed'?new Date().toISOString():undefined}:current)
                    }}
                  >{viewingTask.status==='completed'?'✓':viewingTask.status==='abandoned'?'×':''}</Button>
                  <h2 id="task-view-title">{viewingTask.title}</h2>
                </div>
              </div>
              <Button className="close-button" type="button" onClick={()=>{setTaskFocusHistoryOpen(false);setFocusEditId(null);setViewingTask(null)}} aria-label="关闭任务详情">×</Button>
            </div>
            <div className="editor-body task-view-body">
              {taskFocusHistoryOpen ? <section className="task-inline-focus-history" aria-label="任务专注历史">
                <div className="task-inline-focus-history-head"><Button type="button" onClick={()=>{setTaskFocusHistoryOpen(false);setFocusEditId(null)}}>‹ 返回</Button><div><strong>专注记录</strong><small>{formatFocusDuration(taskFocusHistorySeconds)} · {taskFocusHistorySessions.length} 条</small></div></div>
                {taskFocusHistorySessions.length===0?<EmptyState className="page-empty compact">这个任务还没有专注记录。</EmptyState>:<div className="focus-history-list">{taskFocusHistorySessions.map(session=>{
                  const editing=focusEditId===session.id
                  const focusTag=session.tagIds.filter(id=>!isImportSourceTagId(id)).map(id=>tags.find(tag=>tag.id===id)).find(Boolean)
                  const seconds=focusSessionDurationSeconds(session,timerNow)
                  const started=new Date(session.startedAt)
                  return <div className="focus-history-item" key={session.id}>
                    <div className="focus-history-main"><strong className="focus-history-primary">{focusTag&&<i style={{background:focusTag.color}} />}{focusTag?.name??'默认'}</strong><div className="focus-history-meta"><span>{formatUiDate(started)} · {started.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><small>{formatFocusDuration(seconds)}</small></div></div>
                    {editing?<div className="focus-history-edit">{focusHistoryEditFields}<div className="focus-history-edit-tags">{focusSelectableTags(tags).map(tag=>{const checked=focusEditTagIds.includes(tag.id);return <Button key={tag.id} type="button" className={checked?'selected':''} onClick={()=>setFocusEditTagIds([tag.id])}><i style={{background:tag.color}} />{tag.name}</Button>})}</div><div className="focus-history-edit-actions"><Button type="button" onClick={()=>{setFocusEditId(null);setFocusEditError('')}}>取消</Button><Button variant="primary" type="button" className="primary" onClick={saveFocusSessionEdit}>保存</Button></div></div>:<div className="focus-history-actions"><Button type="button" disabled={!session.endedAt} onClick={()=>beginEditFocusSession(session)}>更改</Button><Button variant="danger" type="button" className="danger" disabled={!session.endedAt} onClick={()=>{if(!session.endedAt)return;if(!window.confirm('确定删除这条任务专注记录吗？'))return;const now=new Date().toISOString();setFocusSessions(cur=>cur.map(item=>item.id===session.id?trashFocusSession(item,now):item));setAutoSyncToast('✓ 专注已移入回收站')}}>删除</Button></div>}
                  </div>})}</div>}
              </section> : <>
              {viewingTask.date && <div className="task-view-schedule" aria-label="任务时间">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.2 2"/></svg>
                <span>{isMultiDayTask(viewingTask) ? formatTaskRange(viewingTask) : `${formatUiDate(fromDateKey(viewingTask.date))}${!viewingTask.allDay && viewingTask.time ? ` · ${viewingTask.time}` : ''}`}</span>
              </div>}

              {viewingTask.status === 'todo' && !viewingTask.recurrence && !viewingTask.seriesId && (
                <section className={`task-timer-panel ${activeTimerTask?.id===viewingTask.id ? 'running' : ''}`}>
                  {activeTimerTask?.id===viewingTask.id ? (
                    <>
                      <span className="task-timer-label">正在专注</span>
                      <strong className="task-timer-clock">{formatRunningTimer(viewingTask)}</strong>
                      <Button className="task-timer-stop" type="button" onClick={()=>stopTaskTimer(viewingTask)}>■ 结束计时</Button>
                      <small>结束本次计时后，可继续浏览或编辑任务。</small>
                    </>
                  ) : (
                    <>
                      <Button className="task-timer-start" type="button" disabled={Boolean(activeFocusSession)} onClick={()=>startTaskTimer(viewingTask)}>▶ 开始计时</Button>{activeFocusSession && <small>已有其他专注正在进行，请先结束后再开始任务计时。</small>}
                    </>
                  )}
                </section>
              )}

              {(viewingTask.attachments ?? []).some(item=>item.type==='image') && (
                <section className="task-view-section task-view-images">
                  <div className="attachment-list">
                    {(viewingTask.attachments ?? []).filter(item=>item.type==='image').map(attachment=>
                      <AttachmentThumb key={attachment.id} attachment={attachment} onPreview={attachment=>void openImagePreview(attachment)} />
                    )}
                  </div>
                </section>
              )}

              {taskFocusHistorySeconds > 0 && !viewingTask.seriesId && (
                <section className="task-view-section task-view-focus-summary">
                  <Button type="button" className="task-focus-history-trigger" onClick={()=>setTaskFocusHistoryOpen(true)}>累计专注 {formatFocusDuration(taskFocusHistorySeconds)} · 历史 ›</Button>
                </section>
              )}

              {viewingTask.deadline && <section className="task-view-section"><h3>截止日期</h3><p>{viewingTask.deadline}</p></section>}

              {(viewingTask.tagIds ?? []).filter(id=>id!==DEFAULT_TAG_ID).length>0 && (
                <section className="task-view-section">
                  <h3>标签</h3>
                  <div className="entry-tags task-view-tags">
                    {(viewingTask.tagIds ?? []).filter(id=>id!==DEFAULT_TAG_ID).map(id=>{
                      const tag=tags.find(item=>item.id===id)
                      return tag?<span key={id} className="mini-tag" style={{'--tag-color':tag.color} as any}>#{tag.name}</span>:null
                    })}
                  </div>
                </section>
              )}

              {viewingTask.notes && <section className="task-view-section"><h3>备注</h3><div className="task-view-notes">{viewingTask.notes}</div></section>}
              </>}
            </div>
            {!taskFocusHistoryOpen && <div className="editor-footer task-view-footer">
              {activeTimerTask?.id!==viewingTask.id && <Button className="delete-button task-view-delete" type="button" onClick={()=>{
                      const task=viewingTask
                      const series=task.seriesId ? tasks.find(item=>item.id===task.seriesId) : task
                      if (!series) return
                      if (task.seriesId && task.occurrenceDate && series.recurrence) {
                        setEditingTaskId(series.id)
                        setEditingOccurrenceDate(task.occurrenceDate)
                        setViewingTask(null)
                        setSeriesAction('delete')
                        return
                      }
                      deleteTask(series,'series')
                      setViewingTask(null)
              }}>删除</Button>}
              <div className="editor-primary-actions">
                {activeTimerTask?.id===viewingTask.id ? (
                  <><span className="task-timer-lock-note">🔒 计时中，结束后可编辑</span><Button className="cancel-button" type="button" onClick={()=>setViewingTask(null)}>关闭</Button></>
                ) : (<>
                  <Button className="cancel-button" type="button" onClick={()=>setViewingTask(null)}>关闭</Button>
                  <Button variant="primary" className="save-button" type="button" onClick={()=>editTask(viewingTask)}>编辑</Button>
                </>)}
              </div>
            </div>}
          </section>
        </div>
      )}
  </>
}
