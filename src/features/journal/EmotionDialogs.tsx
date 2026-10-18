import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { EMOTION_GROUP_LABEL, emotionGroupOrder, sortEmotionOptionsBuiltinsFirst, toggleEmotionId } from '../../domain/emotions'
import type { EmotionGroup, EmotionOption, JournalDraft, JournalEntry } from '../../types'

export interface EmotionDialogsProps {
  addEmotionOption: (group: EmotionGroup) => void
  changeEmotionGroup: (item: EmotionOption, group: EmotionGroup) => void
  emotionManagerExpanded: EmotionGroup | null
  emotionManagerOpen: boolean
  emotionOptions: EmotionOption[]
  emotionPickerOpen: boolean
  journalDraft: JournalDraft
  journalEntries: JournalEntry[]
  removeEmotionOption: (item: EmotionOption) => void
  renameEmotionOption: (item: EmotionOption) => void
  setEmotionManagerExpanded: React.Dispatch<React.SetStateAction<EmotionGroup | null>>
  setEmotionManagerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEmotionPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setJournalDraft: React.Dispatch<React.SetStateAction<JournalDraft>>
  toggleArchiveEmotionOption: (item: EmotionOption) => void
}

export function EmotionDialogs({
  addEmotionOption,
  changeEmotionGroup,
  emotionManagerExpanded,
  emotionManagerOpen,
  emotionOptions,
  emotionPickerOpen,
  journalDraft,
  journalEntries,
  removeEmotionOption,
  renameEmotionOption,
  setEmotionManagerExpanded,
  setEmotionManagerOpen,
  setEmotionPickerOpen,
  setJournalDraft,
  toggleArchiveEmotionOption
}: EmotionDialogsProps) {
  return <>
{emotionPickerOpen && (
        <div className="modal-layer emotion-picker-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭具体感受选择" onClick={()=>setEmotionPickerOpen(false)} />
          <section className="task-editor emotion-picker-modal" role="dialog" aria-modal="true" aria-label="选择具体感受">
            <DialogHeader title={<>选择具体感受</>} eyebrow={<>EMOTIONS</>} actions={<><Button className="close-button" type="button" onClick={()=>setEmotionPickerOpen(false)}>×</Button></>} />
            <div className="editor-body emotion-picker-body"><div className="emotion-picker-status"><span>已选择 {journalDraft.emotionIds.length}/3</span><Button type="button" onClick={()=>setJournalDraft(current=>({...current,emotionIds:[]}))} disabled={!journalDraft.emotionIds.length}>清空</Button></div><div className="emotion-groups">{emotionGroupOrder(journalDraft.impact).map(group=>{const rows=sortEmotionOptionsBuiltinsFirst(emotionOptions.filter(item=>item.group===group&&!item.deletedAt&&(!item.archived||journalDraft.emotionIds.includes(item.id))));return rows.length?<section className={`emotion-group emotion-${group}`} key={group}><small>{EMOTION_GROUP_LABEL[group]}</small><div className="emotion-picker">{rows.map(item=><Button key={item.id} type="button" className={`emotion-choice${journalDraft.emotionIds.includes(item.id)?' active':''}`} disabled={!journalDraft.emotionIds.includes(item.id)&&journalDraft.emotionIds.length>=3} onClick={()=>setJournalDraft(current=>({...current,emotionIds:toggleEmotionId(current.emotionIds,item.id)}))}>{item.name}</Button>)}</div></section>:null})}</div></div>
            <div className="editor-footer emotion-picker-footer"><Button variant="primary" type="button" className="save-button" onClick={()=>setEmotionPickerOpen(false)}>完成</Button></div>
          </section>
        </div>
      )}

{emotionManagerOpen && (
        <div className="modal-layer environment-manager-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭具体感受管理" onClick={()=>setEmotionManagerOpen(false)} />
          <section className="task-editor environment-manager emotion-manager" role="dialog" aria-modal="true" aria-label="管理具体感受">
            <DialogHeader title={<>具体感受</>} eyebrow={<>EMOTIONS</>} actions={<><Button className="close-button" type="button" onClick={()=>setEmotionManagerOpen(false)}>×</Button></>} />
            <div className="editor-body environment-manager-body">
              <div className="environment-option-heading"><div><strong>Emotion Vocabulary</strong><small>按分组管理 · Record 最多选择 3 个</small></div></div>
              {(['positive','neutral','negative'] as EmotionGroup[]).map(group=>{const rows=sortEmotionOptionsBuiltinsFirst(emotionOptions.filter(item=>item.group===group&&!item.deletedAt));const expanded=emotionManagerExpanded===group;return <section className={`emotion-manager-group emotion-${group}${expanded?' expanded':''}`} key={group}><div className="emotion-manager-group-heading"><Button type="button" className="emotion-manager-toggle" onClick={()=>setEmotionManagerExpanded(current=>current===group?null:group)}><span className="emotion-manager-dot"/><strong>{EMOTION_GROUP_LABEL[group]}</strong><small>{rows.length}</small><b>{expanded?'⌃':'⌄'}</b></Button><Button type="button" className="emotion-manager-add" aria-label={`添加${EMOTION_GROUP_LABEL[group]}感受`} onClick={()=>addEmotionOption(group)}>＋</Button></div>{expanded&&<div className="environment-option-list">{rows.map(item=><div className={`environment-option-row${item.archived?' archived':''}${item.builtin?' builtin':''}`} key={item.id}><span className="emotion-manager-dot"/><Button type="button" className={`environment-option-name ${item.builtin?'readonly':'editable'}`} onClick={()=>renameEmotionOption(item)}>{item.name}</Button><div className="environment-option-actions compact">{!item.builtin&&<select aria-label={`${item.name}分组`} value={item.group} onChange={event=>changeEmotionGroup(item,event.target.value as EmotionGroup)}><option value="positive">正向</option><option value="neutral">中性</option><option value="negative">负向</option></select>}<Button type="button" onClick={()=>toggleArchiveEmotionOption(item)}>{item.archived?'恢复':'归档'}</Button>{!item.builtin&&!journalEntries.some(entry=>(entry.emotionIds??[]).includes(item.id))&&<Button variant="danger" type="button" className="danger-text" onClick={()=>removeEmotionOption(item)}>删除</Button>}</div></div>)}</div>}</section>})}
            </div>
          </section>
        </div>
      )}
  </>
}
