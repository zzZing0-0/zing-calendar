import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { Field } from '../../components/ui/Field'
import {
  isImportSourceTagId
} from '../../domain/preferences'
import {
  tagsFor
} from '../../domain/tags'
import {
  PRIORITIES,
  materializeOccurrence,
  toDateKey
} from '../../domain/task'
import type { Attachment, Tag, Task, TaskDraft, TaskStatus } from '../../types'
import { AttachmentThumb } from '../attachments/AttachmentMedia'

export interface TaskEditorProps {
  addTaskImages: (files: FileList | null) => Promise<void>
  closeEditor: () => void
  confirmSingleTask: boolean
  convertOccurrenceToSingleTask: () => void
  deleteTask: (task: Task, scope?: "occurrence" | "series" | "future") => void
  draft: TaskDraft
  editingOccurrenceDate: string | null
  editingTaskId: string | null
  editorOpen: boolean
  handleTaskNotesKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  insertTaskNoteChecklist: () => void
  openImagePreview: (attachment: Attachment, gallery?: Attachment[]) => Promise<void>
  removeTaskImage: (attachment: Attachment) => Promise<void>
  saveTask: (scope?: "occurrence" | "series" | "future") => void
  selectedDate: Date | null
  seriesAction: "save" | "delete" | null
  setConfirmSingleTask: React.Dispatch<React.SetStateAction<boolean>>
  setDraft: React.Dispatch<React.SetStateAction<TaskDraft>>
  setImageLibraryTarget: React.Dispatch<React.SetStateAction<"task" | "note" | "journal" | null>>
  setSeriesAction: React.Dispatch<React.SetStateAction<"save" | "delete" | null>>
  setTaskStatus: (task: Task, status: TaskStatus) => void
  stopRepeating: (series: Task, occurrenceDate: string) => void
  tags: Tag[]
  taskNotesRef: React.RefObject<HTMLTextAreaElement | null>
  tasks: Task[]
  today: Date
  toggleDraftTag: (kind: "task" | "journal", id: string) => void
  toggleTaskNoteChecklistLine: () => void
}

export function TaskEditor({
  addTaskImages,
  closeEditor,
  confirmSingleTask,
  convertOccurrenceToSingleTask,
  deleteTask,
  draft,
  editingOccurrenceDate,
  editingTaskId,
  editorOpen,
  handleTaskNotesKeyDown,
  insertTaskNoteChecklist,
  openImagePreview,
  removeTaskImage,
  saveTask,
  selectedDate,
  seriesAction,
  setConfirmSingleTask,
  setDraft,
  setImageLibraryTarget,
  setSeriesAction,
  setTaskStatus,
  stopRepeating,
  tags,
  taskNotesRef,
  tasks,
  today,
  toggleDraftTag,
  toggleTaskNoteChecklistLine
}: TaskEditorProps) {
  return <>
{editorOpen && (
        <div className="modal-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭任务编辑器" onClick={closeEditor} />
          <section className="task-editor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
            <DialogHeader titleId="task-editor-title" title={<>{editingTaskId ? '任务详情' : '添加任务'}</>} eyebrow={<>{editingTaskId ? 'TASK DETAIL' : 'NEW TASK'}</>} actions={<><Button className="close-button" type="button" onClick={closeEditor} aria-label="关闭">×</Button></>} />

            <div className="editor-body">
              <Field className="field full-field task-title-field">
                <span>任务名称 *</span>
                <div className="task-title-input-wrap">
                  <input autoFocus value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="要做什么？" />
                  {editingTaskId && (() => {
                    const series = tasks.find(task => task.id === editingTaskId)
                    const shown = series ? (editingOccurrenceDate ? materializeOccurrence(series, editingOccurrenceDate) : series) : null
                    const count = shown?.postponeHistory?.length ?? 0
                    return count > 0 ? <small className={`postpone-count${count > 3 ? ' postpone-count-high' : ''}`}>↪ 已延期 {count} 次</small> : null
                  })()}
                </div>
              </Field>

              <div className="field full-field">
                <span>优先级</span>
                <div className="priority-picker">
                  {PRIORITIES.map(priority => (
                    <Button key={priority.value} type="button" className={`priority-choice priority-${priority.value}${draft.priority === priority.value ? ' active' : ''}`} onClick={() => setDraft(current => ({ ...current, priority: priority.value }))}>
                      <span className="priority-dot" />
                      <strong>{priority.label}</strong>
                      <small>{priority.hint}</small>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="field full-field attachment-field">
                <span>图片附件</span>
                <div className="attachment-source-actions"><Field className="attachment-add">＋ 从设备添加<input type="file" accept="image/*" multiple onChange={event => { void addTaskImages(event.target.files); event.currentTarget.value = '' }} /></Field><Button type="button" className="attachment-add" onClick={()=>setImageLibraryTarget('task')}>▧ 从图片库选择</Button></div>
                {draft.attachments.length > 0 && <div className="attachment-grid">{draft.attachments.map(attachment => <AttachmentThumb key={attachment.id} attachment={attachment} onRemove={() => void removeTaskImage(attachment)} onPreview={attachment => void openImagePreview(attachment)} />)}</div>}
                <small>自动压缩后保存 · 单张上限 1 MB</small>
              </div>

              <div className="field full-field task-notes-field">
                <div className="task-notes-heading"><span>备注</span><div className="task-notes-tools"><Button type="button" onClick={insertTaskNoteChecklist} title="插入清单项">☐ 清单</Button><Button type="button" onClick={toggleTaskNoteChecklistLine} title="勾选或取消当前清单项">✓ 切换</Button></div></div>
                <textarea ref={taskNotesRef} rows={4} value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} onKeyDown={handleTaskNotesKeyDown} placeholder="可选" />
              </div>

              <div className="field full-field"><span>标签</span><div className="tag-picker">{tagsFor(tags, 'task').map(tag => <Button key={tag.id} type="button" className={`tag-choice${draft.tagIds.includes(tag.id) ? ' active' : ''}`} style={{ '--tag-color': tag.color } as any} onClick={() => toggleDraftTag('task', tag.id)}><i />{tag.name}</Button>)}</div>
                {draft.tagIds.some(isImportSourceTagId) && <div className="task-source-readonly">{draft.tagIds.filter(isImportSourceTagId).map(id => { const tag=tags.find(item=>item.id===id); return tag ? <span key={id} className="task-source-tag">#{tag.name}</span> : null })}<small>来源标签由系统管理</small></div>}
              </div>

              <div className="time-row task-timing-toggle">
                <Field className="check-field">
                  <input type="checkbox" checked={Boolean(draft.date)} onChange={event => {
                    if (!event.target.checked) {
                      if (draft.repeatPreset !== 'none') { window.alert('请先取消重复。重复任务需要关联日期。'); return }
                      setDraft(current => ({ ...current, date: '', endDate: '', allDay: false, time: '' }))
                    } else setDraft(current => ({ ...current, date: toDateKey(selectedDate ?? today) }))
                  }} />
                  <span>安排日期</span>
                </Field>
                {draft.date && <Field className="check-field">
                  <input type="checkbox" checked={draft.allDay} onChange={event => setDraft(current => ({ ...current, allDay: event.target.checked, endDate: event.target.checked ? current.endDate : '' }))} />
                  <span>跨日期</span>
                </Field>}
              </div>

              {!draft.date ? null : draft.allDay ? (
                <div className="field-grid">
                  <Field className="field"><span>开始日期</span><input type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value, endDate: current.endDate && current.endDate < event.target.value ? '' : current.endDate }))} /></Field>
                  <Field className="field"><span>结束日期 · 可选</span><input type="date" min={draft.date} value={draft.endDate} onChange={event => setDraft(current => ({ ...current, endDate: event.target.value }))} /></Field>
                </div>
              ) : (
                <div className="field-grid">
                  <Field className="field"><span>日期</span><input type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value, endDate: '' }))} /></Field>
                  <Field className="field"><span>时间</span><input type="time" value={draft.time} onChange={event => setDraft(current => ({ ...current, time: event.target.value }))} /></Field>
                </div>
              )}
            </div>

            <div className="editor-footer">
              {editingTaskId && (
                <div className="editor-secondary-actions">
                  {editingOccurrenceDate && tasks.find(task => task.id === editingTaskId)?.recurrence && (
                    <Button type="button" className="abandon-button" onClick={() => {
                      const series = tasks.find(task => task.id === editingTaskId)
                      if (series) stopRepeating(series, editingOccurrenceDate)
                    }}>停止重复</Button>
                  )}
                  <Button type="button" className="abandon-button" onClick={() => { const series = tasks.find(task => task.id === editingTaskId); if (series) { const shown = editingOccurrenceDate ? materializeOccurrence(series, editingOccurrenceDate) : series; if (shown) setTaskStatus(shown, 'abandoned') }; closeEditor() }}>放弃任务</Button>
                  <Button type="button" className="delete-button" onClick={() => {
                    const series = tasks.find(task => task.id === editingTaskId)
                    if (!series) return
                    if (editingOccurrenceDate && series.recurrence) setSeriesAction('delete')
                    else { deleteTask(series, 'series'); closeEditor() }
                  }}>删除</Button>
                </div>
              )}
              <div className="editor-primary-actions">
                <Button className="cancel-button" type="button" onClick={closeEditor}>取消</Button>
                <Button variant="primary" className="save-button" type="button" onClick={() => {
                  const series = editingTaskId ? tasks.find(task => task.id === editingTaskId) : null
                  if (editingOccurrenceDate && series?.recurrence && draft.repeatPreset === 'none') setConfirmSingleTask(true)
                  else if (editingOccurrenceDate && series?.recurrence) setSeriesAction('save')
                  else saveTask('series')
                }} disabled={!draft.title.trim()}>{editingTaskId ? '保存修改' : '保存任务'}</Button>
              </div>
            </div>
          </section>
        </div>
      )}

{confirmSingleTask && editingTaskId && editingOccurrenceDate && (
        <div className="scope-layer" role="presentation">
          <Button className="scope-backdrop" type="button" aria-label="关闭" onClick={() => setConfirmSingleTask(false)} />
          <section className="scope-dialog" role="dialog" aria-modal="true">
            <h3>改为单次任务？</h3>
            <p>当前重复系列将在这次任务之前结束；当前这次会保留为单次任务，此前的任务记录保留，之后的重复任务不再生成。</p>
            <div className="scope-actions">
              <Button type="button" onClick={() => setConfirmSingleTask(false)}>取消</Button>
              <Button variant="primary" type="button" className="save-button" onClick={convertOccurrenceToSingleTask}>改为单次任务</Button>
            </div>
          </section>
        </div>
      )}

{seriesAction && editingTaskId && editingOccurrenceDate && (
        <div className="scope-layer" role="presentation">
          <Button className="scope-backdrop" type="button" aria-label="关闭" onClick={() => setSeriesAction(null)} />
          <section className="scope-dialog" role="dialog" aria-modal="true">
            <h3>{seriesAction === 'save' ? '修改重复任务' : '删除重复任务'}</h3>
            <p>{seriesAction === 'save' ? '这次修改应用到哪里？' : '要删除哪些重复任务？'}</p>
            <div className="scope-actions scope-actions-three">
              <Button type="button" onClick={() => {
                if (seriesAction === 'save') saveTask('occurrence')
                else {
                  const series = tasks.find(t => t.id === editingTaskId)
                  const shown = series ? materializeOccurrence(series, editingOccurrenceDate) : null
                  if (shown) deleteTask(shown, 'occurrence')
                  closeEditor()
                }
                setSeriesAction(null)
              }}>仅本次</Button>
              <Button type="button" onClick={() => {
                if (seriesAction === 'save') saveTask('future')
                else {
                  const series = tasks.find(t => t.id === editingTaskId)
                  const shown = series ? materializeOccurrence(series, editingOccurrenceDate) : null
                  if (shown) deleteTask(shown, 'future')
                  closeEditor()
                }
                setSeriesAction(null)
              }}>本次及以后</Button>
              <Button type="button" className={seriesAction === 'delete' ? 'delete-button' : 'save-button'} onClick={() => {
                const series = tasks.find(t => t.id === editingTaskId)
                if (seriesAction === 'save') saveTask('series')
                else if (series) {
                  deleteTask(series, 'series')
                  closeEditor()
                }
                setSeriesAction(null)
              }}>整个系列</Button>
            </div>
          </section>
        </div>
      )}
  </>
}
