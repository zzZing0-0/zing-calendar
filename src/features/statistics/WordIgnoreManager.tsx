import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { EmptyState } from '../../components/ui/EmptyState'

export interface WordIgnoreManagerProps {
  setWordCloudIgnored: React.Dispatch<React.SetStateAction<string[]>>
  setWordIgnoreDraft: React.Dispatch<React.SetStateAction<string>>
  setWordIgnoreManagerOpen: React.Dispatch<React.SetStateAction<boolean>>
  wordCloudIgnored: string[]
  wordIgnoreDraft: string
  wordIgnoreManagerOpen: boolean
}

export function WordIgnoreManager({
  setWordCloudIgnored,
  setWordIgnoreDraft,
  setWordIgnoreManagerOpen,
  wordCloudIgnored,
  wordIgnoreDraft,
  wordIgnoreManagerOpen
}: WordIgnoreManagerProps) {
  return <>
{wordIgnoreManagerOpen && (
        <div className="modal-layer word-ignore-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭屏蔽词管理" onClick={()=>setWordIgnoreManagerOpen(false)} />
          <section className="task-editor word-ignore-modal" role="dialog" aria-modal="true" aria-label="管理屏蔽词">
            <DialogHeader title={<>管理屏蔽词</>} eyebrow={<>WORD CLOUD</>} actions={<><Button className="close-button" type="button" onClick={()=>setWordIgnoreManagerOpen(false)}>×</Button></>} />
            <div className="editor-body">
              <p className="word-ignore-intro">这些词不会进入 Journal 词云。词云中点击词语也可以直接加入这里。</p>
              <div className="word-ignore-add">
                <input value={wordIgnoreDraft} onChange={e=>setWordIgnoreDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();const word=wordIgnoreDraft.trim().toLowerCase();if(word){setWordCloudIgnored(list=>list.includes(word)?list:[...list,word]);setWordIgnoreDraft('')}}}} placeholder="添加屏蔽词" />
                <Button type="button" onClick={()=>{const word=wordIgnoreDraft.trim().toLowerCase();if(word){setWordCloudIgnored(list=>list.includes(word)?list:[...list,word]);setWordIgnoreDraft('')}}}>添加</Button>
              </div>
              <div className="word-ignore-panel-list">
                {wordCloudIgnored.length ? wordCloudIgnored.map(word=><Button type="button" key={word} title="点击恢复到词云" onClick={()=>setWordCloudIgnored(list=>list.filter(item=>item!==word))}><span>{word}</span><b>×</b></Button>) : <EmptyState className="page-empty compact">还没有手动屏蔽的词。</EmptyState>}
              </div>
            </div>
          </section>
        </div>
      )}
  </>
}
