import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import type { EncouragementMessage } from '../../types'

export interface EncouragementManagerProps {
  encouragementDraft: string
  encouragementEditingId: string | null
  encouragementManagerOpen: boolean
  encouragementMessages: EncouragementMessage[]
  setEncouragementDraft: React.Dispatch<React.SetStateAction<string>>
  setEncouragementEditingId: React.Dispatch<React.SetStateAction<string | null>>
  setEncouragementManagerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEncouragementMessages: React.Dispatch<React.SetStateAction<EncouragementMessage[]>>
}

export function EncouragementManager({
  encouragementDraft,
  encouragementEditingId,
  encouragementManagerOpen,
  encouragementMessages,
  setEncouragementDraft,
  setEncouragementEditingId,
  setEncouragementManagerOpen,
  setEncouragementMessages
}: EncouragementManagerProps) {
  return <>
{encouragementManagerOpen && (
        <div className="modal-layer encouragement-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭鼓励语管理" onClick={()=>{setEncouragementManagerOpen(false);setEncouragementEditingId(null);setEncouragementDraft('')}} />
          <section className="task-editor encouragement-modal" role="dialog" aria-modal="true" aria-label="管理鼓励语">
            <DialogHeader title={<>鼓励语</>} eyebrow={<>ENCOURAGEMENT</>} actions={<><Button className="close-button" type="button" onClick={()=>{setEncouragementManagerOpen(false);setEncouragementEditingId(null);setEncouragementDraft('')}}>×</Button></>} />
            <div className="editor-body">
              <p className="encouragement-intro">只放你自己真正喜欢的话。完成任务时会随机出现一句；两句以上时不会连续重复。</p>
              <div className="encouragement-add">
                <textarea value={encouragementDraft} onChange={e=>setEncouragementDraft(e.target.value)} placeholder="写一句鼓励自己的话" rows={3} />
                <Button type="button" disabled={!encouragementDraft.trim()} onClick={()=>{const text=encouragementDraft.trim();if(!text)return;const now=new Date().toISOString();if(encouragementEditingId){setEncouragementMessages(rows=>rows.map(item=>item.id===encouragementEditingId?{...item,text,updatedAt:now,deletedAt:undefined}:item))}else{setEncouragementMessages(rows=>[...rows,{id:crypto.randomUUID(),text,updatedAt:now}])}setEncouragementDraft('');setEncouragementEditingId(null)}}>{encouragementEditingId?'保存':'添加'}</Button>
              </div>
              <div className="encouragement-list">
                {encouragementMessages.filter(item=>!item.deletedAt).length ? encouragementMessages.filter(item=>!item.deletedAt).map(item=><div className="encouragement-item" key={item.id}><p>{item.text}</p><div><Button type="button" onClick={()=>{setEncouragementEditingId(item.id);setEncouragementDraft(item.text)}}>编辑</Button><Button variant="danger" type="button" className="danger-text" onClick={()=>{const now=new Date().toISOString();setEncouragementMessages(rows=>rows.map(row=>row.id===item.id?{...row,deletedAt:now,updatedAt:now}:row));if(encouragementEditingId===item.id){setEncouragementEditingId(null);setEncouragementDraft('')}}}>删除</Button></div></div>) : <EmptyState className="page-empty compact">还没有鼓励语。</EmptyState>}
              </div>
            </div>
          </section>
        </div>
      )}
  </>
}
