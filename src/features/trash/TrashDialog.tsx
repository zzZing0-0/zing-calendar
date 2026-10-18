import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import {
  anniversaryIcon
} from '../../domain/calendar'
import { orderedCategories } from '../../domain/modulePriority'
import {
  formatFocusDuration
} from '../../domain/task'
import type { Notebook, Tag, Task, TaskStatus } from '../../types'
import type { TrashItem } from './trashTypes'

export interface TrashDialogProps {
  clearTrash: () => void
  moduleOrder: ("task" | "note" | "habit" | "journal" | "anniversary" | "focus")[]
  notebooks: Notebook[]
  permanentlyDeleteTrashItem: (item: TrashItem) => void
  restoreTrashItem: (item: TrashItem) => void
  setTrashFilter: React.Dispatch<React.SetStateAction<"task" | "note" | "habit" | "journal" | "anniversary" | "focus" | "all">>
  setTrashOpen: React.Dispatch<React.SetStateAction<boolean>>
  showEndedTasks: boolean
  tags: Tag[]
  trashFilter: "task" | "note" | "habit" | "journal" | "anniversary" | "focus" | "all"
  trashItems: TrashItem[]
  trashOpen: boolean
  trashTaskGroups: { active: { key: string; entity: "task"; kind: "occurrence" | "series" | "future"; task: Task; occurrenceDate?: string | undefined; trashedAt: string; }[]; ended: { key: string; entity: "task"; kind: "occurrence" | "series" | "future"; task: Task; occurrenceDate?: string | undefined; trashedAt: string; }[]; } | null
  trashTaskStatus: (item: { key: string; entity: "task"; kind: "occurrence" | "series" | "future"; task: Task; occurrenceDate?: string | undefined; trashedAt: string; }) => TaskStatus
  visibleTrashItems: TrashItem[]
}

export function TrashDialog({
  clearTrash,
  moduleOrder,
  notebooks,
  permanentlyDeleteTrashItem,
  restoreTrashItem,
  setTrashFilter,
  setTrashOpen,
  showEndedTasks,
  tags,
  trashFilter,
  trashItems,
  trashOpen,
  trashTaskGroups,
  trashTaskStatus,
  visibleTrashItems
}: TrashDialogProps) {
  return <>
{trashOpen && (
        <div className="modal-layer overdue-inbox-layer trash-inbox-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭回收站" onClick={()=>setTrashOpen(false)} />
          <section className="task-editor overdue-inbox-panel trash-inbox-panel" role="dialog" aria-modal="true" aria-labelledby="trash-inbox-title">
            <DialogHeader titleId="trash-inbox-title" title={<>回收站 · {trashItems.length}</>} eyebrow={<>RECYCLE BIN</>} actions={<><div className="trash-header-actions">{trashItems.length>0 && <Button className="trash-clear-button" type="button" onClick={()=>{if(window.confirm(`确定永久删除回收站中的 ${trashItems.length} 项吗？此操作无法恢复。`)) clearTrash()}}>清空</Button>}<Button className="close-button" type="button" onClick={()=>setTrashOpen(false)} aria-label="关闭">×</Button></div></>} />
            <div className="editor-body overdue-inbox-body">
              {trashItems.length===0 ? <EmptyState className="page-empty compact">回收站是空的。</EmptyState> : <>
                <div className="trash-filter-row" role="group" aria-label="回收站类型筛选">
                  {orderedCategories([['all','全部'],['task','任务'],['journal','记录'],['note','笔记'],['anniversary','纪念日'],['focus','专注'],['habit','习惯']] as const,moduleOrder).map(([value,label])=><Button key={value} type="button" className={trashFilter===value?'active':''} onClick={()=>setTrashFilter(value)}>{label}</Button>)}
                </div>
                {visibleTrashItems.length===0 ? <EmptyState className="page-empty compact">这一类还没有内容。</EmptyState> : <div className="overdue-inbox-list trash-inbox-list">
                  {(trashTaskGroups ? [
                    {label:'未完成',items:trashTaskGroups.active},
                    ...(showEndedTasks ? [{label:'已完成',items:trashTaskGroups.ended}] : []),
                  ] : [{label:'',items:visibleTrashItems}]).map(group=>group.items.length>0&&<div className="trash-task-group" key={group.label||'all'}>{group.label&&<div className="trash-task-group-label">{group.label} · {group.items.length}</div>}{group.items.map(item=><article key={item.key} className={`trash-inbox-item${item.entity==='task'&&trashTaskStatus(item)!=='todo'?' completed':''}`}>
                    <div className="trash-inbox-main"><strong>{item.entity==='task'&&trashTaskStatus(item)!=='todo'&&<span className="trash-task-status" aria-label="已完成">✓</span>}{item.entity==='task'?item.task.title:item.entity==='journal'?item.journal.title:item.entity==='note'?item.note.title:item.entity==='anniversary'?item.anniversary.title:item.entity==='habit'?item.habit.name:(tags.find(tag=>item.session.tagIds.includes(tag.id))?.name??'默认')}</strong><small>{item.entity==='journal'?`${item.journal.date.replaceAll('-','/')} · 记录`:item.entity==='note'?`${notebooks.find(book=>book.id===item.note.notebookId)?.name??'默认'} · 笔记`:item.entity==='anniversary'?`${anniversaryIcon(item.anniversary.type)} · 纪念日`:item.entity==='habit'?'习惯 · 历史打卡可恢复':item.entity==='focus'?`${new Date(item.session.startedAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 自由专注 · ${formatFocusDuration(item.session.durationSeconds??0)}`:item.kind==='occurrence'?`${item.occurrenceDate?.replaceAll('-','/')} · 单次任务`:item.kind==='future'?`${item.occurrenceDate?.replaceAll('-','/')} 起 · 此后重复任务`:`${item.task.date ? item.task.date.replaceAll('-','/') : '收集箱'} · ${item.task.recurrence?'整个重复任务':'任务'}`}</small><time>删除于 {new Date(item.trashedAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div>
                    <div className="trash-inbox-actions"><Button type="button" onClick={()=>restoreTrashItem(item)}>恢复</Button><Button variant="danger" className="danger" type="button" onClick={()=>{if(window.confirm('永久删除后无法从回收站恢复，确定继续吗？')) permanentlyDeleteTrashItem(item)}}>永久删除</Button></div>
                  </article>)}</div>)}
                </div>}
              </>}
            </div>
          </section>
        </div>
      )}
  </>
}
