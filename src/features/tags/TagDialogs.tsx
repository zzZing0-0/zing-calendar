import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field } from '../../components/ui/Field'
import { orderedCategories } from '../../domain/modulePriority'
import {
  TAG_COLORS
} from '../../domain/preferences'
import {
  tagScopeLabel
} from '../../domain/tags'
import type { FocusSession, JournalEntry, Tag, TagScope, Task } from '../../types'

export interface TagDialogsProps {
  activeManagedTags: Tag[]
  addTag: () => void
  archivedTags: Tag[]
  archivedTagsOpen: boolean
  canSetTagScope: (tagId: string, nextScope: TagScope) => boolean
  closeTagEditor: () => void
  deleteTag: (id: string) => void
  focusSessions: FocusSession[]
  journalEntries: JournalEntry[]
  moduleOrder: ("task" | "note" | "habit" | "journal" | "anniversary" | "focus")[]
  newTagColor: string
  newTagName: string
  newTagScope: TagScope
  saveTagEdit: (tag: Tag) => void
  selectedTagManageId: string | null
  setArchivedTagsOpen: React.Dispatch<React.SetStateAction<boolean>>
  setNewTagColor: React.Dispatch<React.SetStateAction<string>>
  setNewTagName: React.Dispatch<React.SetStateAction<string>>
  setNewTagScope: React.Dispatch<React.SetStateAction<TagScope>>
  setSelectedTagManageId: React.Dispatch<React.SetStateAction<string | null>>
  setTagArchived: (id: string, archived: boolean) => void
  setTagEditDraft: React.Dispatch<React.SetStateAction<{ name: string; color: string; scope: TagScope; } | null>>
  setTagManagerOpen: React.Dispatch<React.SetStateAction<boolean>>
  tagEditDraft: { name: string; color: string; scope: TagScope; } | null
  tagManagerOpen: boolean
  tagScopeBlockedReason: (tagId: string, nextScope: TagScope) => string
  tagUsageAreas: (id: string) => string[]
  tasks: Task[]
}

export function TagDialogs({
  activeManagedTags,
  addTag,
  archivedTags,
  archivedTagsOpen,
  canSetTagScope,
  closeTagEditor,
  deleteTag,
  focusSessions,
  journalEntries,
  moduleOrder,
  newTagColor,
  newTagName,
  newTagScope,
  saveTagEdit,
  selectedTagManageId,
  setArchivedTagsOpen,
  setNewTagColor,
  setNewTagName,
  setNewTagScope,
  setSelectedTagManageId,
  setTagArchived,
  setTagEditDraft,
  setTagManagerOpen,
  tagEditDraft,
  tagManagerOpen,
  tagScopeBlockedReason,
  tagUsageAreas,
  tasks
}: TagDialogsProps) {
  return <>
{tagManagerOpen && (
        <div className="modal-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭标签管理" onClick={() => {setSelectedTagManageId(null);setTagEditDraft(null);setTagManagerOpen(false)}} />
          <section className="task-editor tag-manager compact-tag-manager" role="dialog" aria-modal="true" aria-labelledby="tag-manager-title">
            <DialogHeader titleId="tag-manager-title" title={<>标签</>} eyebrow={<>TAGS</>} actions={<><Button className="close-button" type="button" onClick={() => {setSelectedTagManageId(null);setTagEditDraft(null);setTagManagerOpen(false)}}>×</Button></>} />
            <div className="editor-body">
              <div className="tag-scope-tabs" role="tablist" aria-label="标签分类">
                {orderedCategories([['both','共享'],['task','任务'],['focus','专注'],['journal','记录'],['note','笔记'],['habit','习惯']] as const,moduleOrder).map(([scope,label])=><Button key={scope} type="button" className={newTagScope===scope?'active':''} onClick={()=>{setNewTagScope(scope);setSelectedTagManageId(null)}}>{label}<small>{activeManagedTags.filter(tag=>tag.scope===scope).length}</small></Button>)}
              </div>

              <div className="compact-tag-create">
                <div className="compact-tag-create-main"><input value={newTagName} onChange={e=>setNewTagName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addTag()}} placeholder={`新建${tagScopeLabel(newTagScope)}`} /><Button variant="primary" className="save-button" type="button" onClick={addTag} disabled={!newTagName.trim()}>添加</Button></div>
                <div className="tag-color-row compact-palette">{TAG_COLORS.map(color=><Button key={color} type="button" className={`tag-color${newTagColor===color?' active':''}`} style={{background:color}} onClick={()=>setNewTagColor(color)} aria-label={`选择颜色 ${color}`} />)}</div>
              </div>

              <div className="compact-tag-list">
                {activeManagedTags.filter(tag=>tag.scope===newTagScope).map(tag=><Button key={tag.id} type="button" className="compact-tag-chip" onClick={()=>{setSelectedTagManageId(tag.id);setTagEditDraft({name:tag.name,color:tag.color,scope:tag.scope})}}>
                  <i style={{background:tag.color}} /><span>{tag.name}</span>
                </Button>)}
                {activeManagedTags.every(tag=>tag.scope!==newTagScope)&&<EmptyState className="page-empty compact">这里还没有{tagScopeLabel(newTagScope)}。</EmptyState>}
              </div>

            </div>
          </section>
        </div>
      )}

{selectedTagManageId && (() => {
        const tag=activeManagedTags.find(item=>item.id===selectedTagManageId)
        if(!tag) return null
        return <div className="modal-layer tag-edit-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭编辑标签" onClick={closeTagEditor} />
          <section className="task-editor compact-tag-edit-modal" role="dialog" aria-modal="true" aria-labelledby="tag-edit-title">
            <div className="editor-header">
              <div className="compact-tag-edit-title"><i style={{background:tag.color}} /><div><span className="eyebrow">TAG</span><h2 id="tag-edit-title">编辑标签</h2></div></div>
              <Button className="close-button" type="button" aria-label="关闭编辑标签" onClick={closeTagEditor}>×</Button>
            </div>
            <div className="editor-body compact-tag-edit-body">
              <Field className="field"><span>名称</span><input value={tagEditDraft?.name ?? tag.name} onChange={e=>setTagEditDraft(current=>current?{...current,name:e.target.value}:current)} autoFocus /></Field>
              <div className="field"><span>颜色</span><div className="tag-color-row detail-palette">{TAG_COLORS.map(color=><Button key={color} type="button" className={`tag-color${(tagEditDraft?.color ?? tag.color)===color?' active':''}`} style={{background:color}} onClick={()=>setTagEditDraft(current=>current?{...current,color}:current)} aria-label={`设为 ${color}`} />)}</div></div>
              <div className="field"><span>分类</span><div className="tag-detail-scope">
                {orderedCategories([['both','共享'],['task','任务'],['focus','专注'],['journal','记录'],['note','笔记'],['habit','习惯']] as const,moduleOrder).map(([scope,label])=>{const blocked=!canSetTagScope(tag.id,scope);return <Button key={scope} type="button" className={`${(tagEditDraft?.scope ?? tag.scope)===scope?'active ':''}${blocked?'scope-disabled':''}`.trim()} disabled={blocked} title={blocked?tagScopeBlockedReason(tag.id,scope):undefined} onClick={()=>setTagEditDraft(current=>current?{...current,scope}:current)}>{label}</Button>})}
              </div><small className="tag-usage-hint">当前引用：{tagUsageAreas(tag.id).join(' · ') || '暂无'}</small></div>
            </div>
            <div className="editor-actions compact-tag-edit-actions">
              <div className="compact-tag-edit-secondary">
                <Button type="button" className="ghost-button" onClick={()=>{setTagArchived(tag.id,true);closeTagEditor()}}>归档</Button>
                <Button type="button" className="danger-button" onClick={()=>deleteTag(tag.id)}>删除</Button>
              </div>
              <Button variant="primary" type="button" className="save-button" onClick={()=>saveTagEdit(tag)} disabled={!tagEditDraft?.name.trim()}>保存</Button>
            </div>
          </section>
        </div>
      })()}

{archivedTagsOpen && (
        <div className="modal-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭已归档标签" onClick={() => setArchivedTagsOpen(false)} />
          <section className="task-editor tag-manager compact-tag-manager" role="dialog" aria-modal="true" aria-labelledby="archived-tags-title">
            <DialogHeader titleId="archived-tags-title" title={<>已归档</>} eyebrow={<>ARCHIVED TAGS</>} actions={<><Button className="close-button" type="button" onClick={() => setArchivedTagsOpen(false)}>×</Button></>} />
            <div className="editor-body">
              {archivedTags.length ? <div className="archived-tag-list">{archivedTags.map(tag=>{
                const taskCount=tasks.filter(task=>(task.tagIds??[]).includes(tag.id)||Object.values(task.recurrenceExceptions??{}).some(exception=>(exception.tagIds??[]).includes(tag.id))).length
                const focusCount=focusSessions.filter(session=>(session.tagIds??[]).includes(tag.id)).length
                const journalCount=journalEntries.filter(entry=>(entry.tagIds??[]).includes(tag.id)).length
                return <div className="archived-tag-row" key={tag.id}>
                  <div className="archived-tag-info"><span><i style={{background:tag.color}} />{tag.name}</span><small>任务 {taskCount} · 专注 {focusCount} · 记录 {journalCount}</small></div>
                  <div className="archived-tag-actions"><Button type="button" className="archive-button" onClick={()=>setTagArchived(tag.id,false)}>恢复</Button><Button type="button" className="delete-button compact-delete" onClick={()=>deleteTag(tag.id)}>删除</Button></div>
                </div>
              })}</div> : <EmptyState className="page-empty compact">暂无已归档标签。</EmptyState>}
            </div>
          </section>
        </div>
      )}
  </>
}
