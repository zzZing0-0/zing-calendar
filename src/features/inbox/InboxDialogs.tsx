import type * as React from 'react'
import { Fragment } from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import type { InboxSortKey, InboxTaskGroup } from '../../domain/inbox'
import { moveInboxSortKey } from '../../domain/inbox'
import {
  toDateKey
} from '../../domain/task'
import type { Task, TaskStatus } from '../../types'

export interface InboxDialogsProps {
  inboxCompletedTasks: Task[]
  inboxOpen: boolean
  inboxSortDragRef: React.RefObject<InboxSortKey | null>
  inboxSortDropTarget: InboxSortKey | null
  inboxSortOrder: InboxSortKey[]
  inboxTaskMeta: (task: Task) => { tag: string; tagColor: string; activity: string; }
  inboxTasks: Task[]
  inboxTodoGroups: InboxTaskGroup[]
  openInboxTaskEditor: () => void
  openTaskAtItsDay: (task: Task) => void
  openTaskDetail: (task: Task) => void
  overdueInboxOpen: boolean
  overdueTasks: Task[]
  postponeTask: (task: Task, newDate: string) => void
  setInboxOpen: React.Dispatch<React.SetStateAction<boolean>>
  setInboxSortDropTarget: React.Dispatch<React.SetStateAction<InboxSortKey | null>>
  setInboxSortOrder: React.Dispatch<React.SetStateAction<InboxSortKey[]>>
  setOverdueInboxOpen: React.Dispatch<React.SetStateAction<boolean>>
  setTaskStatus: (task: Task, status: TaskStatus) => void
  showEndedTasks: boolean
  today: Date
}

export function InboxDialogs({
  inboxCompletedTasks,
  inboxOpen,
  inboxSortDragRef,
  inboxSortDropTarget,
  inboxSortOrder,
  inboxTaskMeta,
  inboxTasks,
  inboxTodoGroups,
  openInboxTaskEditor,
  openTaskAtItsDay,
  openTaskDetail,
  overdueInboxOpen,
  overdueTasks,
  postponeTask,
  setInboxOpen,
  setInboxSortDropTarget,
  setInboxSortOrder,
  setOverdueInboxOpen,
  setTaskStatus,
  showEndedTasks,
  today
}: InboxDialogsProps) {
  return <>
{inboxOpen && (
        <div className="modal-layer overdue-inbox-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭收集箱" onClick={()=>setInboxOpen(false)} />
          <section className="task-editor overdue-inbox-panel" role="dialog" aria-modal="true" aria-labelledby="inbox-title">
            <div className="editor-header inbox-editor-header">
              <div><span className="eyebrow">INBOX</span><div className="inbox-title-row"><h2 id="inbox-title">收集箱 · {inboxTasks.length}</h2><Button className="inbox-add-button" type="button" onClick={openInboxTaskEditor} aria-label="添加未排期任务" title="添加未排期任务">＋</Button></div></div>
              <Button className="close-button" type="button" onClick={()=>setInboxOpen(false)} aria-label="关闭">×</Button>
            </div>
            <div className="editor-body overdue-inbox-body">
              <div className="inbox-sort-row" aria-label="收集箱排序优先级">
                {inboxSortOrder.map((key,index)=><Fragment key={key}><Button className={`inbox-sort-chip${index===0?' primary':''}${inboxSortDropTarget===key&&inboxSortDragRef.current!==key?' drop-target':''}`} type="button" draggable
                  onDragStart={()=>{inboxSortDragRef.current=key;setInboxSortDropTarget(null)}} onDragEnter={()=>{if(inboxSortDragRef.current&&inboxSortDragRef.current!==key)setInboxSortDropTarget(key)}} onDragOver={event=>event.preventDefault()} onDragEnd={()=>{inboxSortDragRef.current=null;setInboxSortDropTarget(null)}} onDrop={()=>{const from=inboxSortDragRef.current;if(from)setInboxSortOrder(current=>moveInboxSortKey(current,from,key));inboxSortDragRef.current=null;setInboxSortDropTarget(null)}}
                  onTouchStart={()=>{inboxSortDragRef.current=key;setInboxSortDropTarget(null)}} onTouchMove={event=>{const touch=event.touches[0];const target=document.elementFromPoint(touch.clientX,touch.clientY)?.closest<HTMLButtonElement>('[data-inbox-sort-key]');const to=target?.dataset.inboxSortKey as InboxSortKey|undefined;if(to&&to!==inboxSortDragRef.current)setInboxSortDropTarget(to)}} onTouchEnd={event=>{const touch=event.changedTouches[0];const target=document.elementFromPoint(touch.clientX,touch.clientY)?.closest<HTMLButtonElement>('[data-inbox-sort-key]');const to=(target?.dataset.inboxSortKey as InboxSortKey|undefined)??inboxSortDropTarget??undefined;const from=inboxSortDragRef.current;if(from&&to)setInboxSortOrder(current=>moveInboxSortKey(current,from,to));inboxSortDragRef.current=null;setInboxSortDropTarget(null)}}
                  data-inbox-sort-key={key} aria-label={`${index===0?'首要排序：':'排序：'}${key==='time'?'时间':key==='priority'?'优先级':'标签'}`}>{inboxSortDropTarget===key&&inboxSortDragRef.current!==key&&<span className="inbox-sort-drop-cue">放这里</span>}{key==='time'?'时间':key==='priority'?'优先级':'标签'}</Button>{index<inboxSortOrder.length-1&&<span className="inbox-sort-arrow" aria-hidden="true">›</span>}</Fragment>)}
              </div>
              {inboxTasks.length===0 ? <EmptyState className="page-empty compact">暂时没有未排期任务。</EmptyState> :
                <div className="overdue-inbox-list inbox-task-list">
                  {inboxTodoGroups.length>0&&<section className="inbox-task-group" aria-label="未完成任务">
                    <div className="inbox-task-group-label">未完成 · {inboxTodoGroups.reduce((sum,group)=>sum+group.tasks.length,0)}</div>
                    {inboxTodoGroups.map(group=><div className="inbox-primary-group" key={group.key}><div className="inbox-primary-group-label">{group.color&&<span className="inbox-group-dot" style={{background:group.color}} aria-hidden="true"/>}{group.label}</div><div className="inbox-task-group-items">{group.tasks.map(task=>{const meta=inboxTaskMeta(task);const tagIsPrimary=inboxSortOrder[0]==='tag';return <article key={task.id} className={`overdue-inbox-item priority-${task.priority}`}><div className="overdue-inbox-main"><Button className="overdue-priority-box" type="button" aria-label={`完成 ${task.title}`} title="标记完成" onClick={()=>setTaskStatus(task,'completed')}>✓</Button><Button className="overdue-task-link" type="button" onClick={()=>openTaskDetail(task)}><strong>{task.title}</strong><time className="inbox-task-meta">{!tagIsPrimary&&<span className="inbox-task-tag"><i style={{background:meta.tagColor}} aria-hidden="true"/>{meta.tag}</span>}<span>{meta.activity}</span></time></Button></div></article>})}</div></div>)}
                  </section>}
                  {showEndedTasks&&inboxCompletedTasks.length>0&&<section className="inbox-task-group completed" aria-label="已完成任务"><div className="inbox-task-group-label">已完成 · {inboxCompletedTasks.length}</div><div className="inbox-task-group-items">{inboxCompletedTasks.map(task=>{const meta=inboxTaskMeta(task);const tagIsPrimary=inboxSortOrder[0]==='tag';return <article key={task.id} className={`overdue-inbox-item priority-${task.priority} completed`}><div className="overdue-inbox-main"><span className="overdue-priority-box completed" aria-label="已完成">✓</span><Button className="overdue-task-link" type="button" onClick={()=>openTaskDetail(task)}><strong>{task.title}</strong><time className="inbox-task-meta">{!tagIsPrimary&&<span className="inbox-task-tag"><i style={{background:meta.tagColor}} aria-hidden="true"/>{meta.tag}</span>}<span>{meta.activity}</span></time></Button></div></article>})}</div></section>}
                </div>}
            </div>
          </section>
        </div>
      )}

{overdueInboxOpen && (
        <div className="modal-layer overdue-inbox-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭已逾期收件箱" onClick={()=>setOverdueInboxOpen(false)} />
          <section className="task-editor overdue-inbox-panel" role="dialog" aria-modal="true" aria-labelledby="overdue-inbox-title">
            <DialogHeader titleId="overdue-inbox-title" title={<>已逾期 · {overdueTasks.length}</>} eyebrow={<>OVERDUE INBOX</>} actions={<><Button className="close-button" type="button" onClick={()=>setOverdueInboxOpen(false)} aria-label="关闭">×</Button></>} />
            <div className="editor-body overdue-inbox-body">
              {overdueTasks.length===0 ? <EmptyState className="page-empty compact">目前没有已逾期任务。</EmptyState> :
                <div className="overdue-inbox-list">
                  {overdueTasks.map(task=><article key={task.id} className={`overdue-inbox-item priority-${task.priority}`}>
                    <div className="overdue-inbox-main overdue-task-row">
                      <Button className="overdue-priority-box" type="button" aria-label={`完成 ${task.title}`} title="标记完成" onClick={()=>setTaskStatus(task,'completed')}>✓</Button>
                      <Button className="overdue-task-link" type="button" onClick={()=>openTaskAtItsDay(task)}>
                        <strong>{task.title}</strong>
                        <time>{task.date?.replaceAll('-','/') ?? ''}</time>
                      </Button>
                      <Button className="overdue-postpone-today" type="button" onClick={()=>postponeTask(task,toDateKey(today))}>延期</Button>
                    </div>
                  </article>)}
                </div>}
            </div>
          </section>
        </div>
      )}
  </>
}
