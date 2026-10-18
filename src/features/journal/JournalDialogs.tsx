import type * as React from 'react'
import { Fragment } from 'react'
import { MarkdownRenderer } from '../../components/markdown/MarkdownRenderer'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { Field } from '../../components/ui/Field'
import {
  IMPACTS,
  normalizeJournalMessages
} from '../../domain/journal'
import {
  DEFAULT_TAG_ID,
  isImportSourceTagId
} from '../../domain/preferences'
import {
  tagsFor
} from '../../domain/tags'
import {
  fromDateKey
} from '../../domain/task'
import type { Attachment, EmotionOption, JournalDraft, JournalEntry, Tag } from '../../types'
import { AttachmentThumb, AudioAttachment } from '../attachments/AttachmentMedia'

export interface JournalDialogsProps {
  addJournalImages: (files: FileList | null) => Promise<void>
  closeJournalEditor: () => void
  deleteJournal: (id: string) => void
  editJournal: (entry: JournalEntry) => void
  editingJournalId: string | null
  emotionOptions: EmotionOption[]
  formatUiDate: (date: Date) => string
  journalDraft: JournalDraft
  journalEditorOpen: boolean
  journalMessageDraft: string
  openImagePreview: (attachment: Attachment, gallery?: Attachment[]) => Promise<void>
  recording: boolean
  recordingSeconds: number
  removeJournalAttachment: (attachment: Attachment) => Promise<void>
  saveJournal: () => void
  sendJournalMessage: (journalId: string) => void
  setEmotionPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setImageLibraryTarget: React.Dispatch<React.SetStateAction<"task" | "note" | "journal" | null>>
  setJournalDraft: React.Dispatch<React.SetStateAction<JournalDraft>>
  setJournalMessageDraft: React.Dispatch<React.SetStateAction<string>>
  setViewingJournalId: React.Dispatch<React.SetStateAction<string | null>>
  startJournalRecording: () => Promise<void>
  stopJournalRecording: () => void
  tags: Tag[]
  toggleDraftTag: (kind: "task" | "journal", id: string) => void
  viewingJournal: JournalEntry | null
}

export function JournalDialogs({
  addJournalImages,
  closeJournalEditor,
  deleteJournal,
  editJournal,
  editingJournalId,
  emotionOptions,
  formatUiDate,
  journalDraft,
  journalEditorOpen,
  journalMessageDraft,
  openImagePreview,
  recording,
  recordingSeconds,
  removeJournalAttachment,
  saveJournal,
  sendJournalMessage,
  setEmotionPickerOpen,
  setImageLibraryTarget,
  setJournalDraft,
  setJournalMessageDraft,
  setViewingJournalId,
  startJournalRecording,
  stopJournalRecording,
  tags,
  toggleDraftTag,
  viewingJournal
}: JournalDialogsProps) {
  return <>
{viewingJournal && (
        <div className="modal-layer journal-view-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭记录详情" onClick={() => setViewingJournalId(null)} />
          <section className="task-editor journal-viewer" role="dialog" aria-modal="true" aria-labelledby="journal-view-title">
            <DialogHeader titleId="journal-view-title" title={<>{viewingJournal.title || '记录'}</>} eyebrow={<>JOURNAL</>} actions={<><Button className="close-button" type="button" onClick={() => setViewingJournalId(null)} aria-label="关闭">×</Button></>} />
            <div className="editor-body">
              <div className="journal-view-date-meta" aria-label={`事件日期 ${viewingJournal.date}`}>
                <span className="journal-view-date"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4.5 8.5h15M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" /></svg>{formatUiDate(fromDateKey(viewingJournal.date))}</span>
              </div>
              <div className="journal-view-feeling-row">
                {(viewingJournal.emotionIds??[]).map(id=>{const item=emotionOptions.find(row=>row.id===id);return item?<span key={id} className={`emotion-chip emotion-${item.group}`}>{item.name}</span>:null})}
                <span className={`impact-badge impact-${viewingJournal.impact}`}>{viewingJournal.impact > 0 ? '+' : ''}{viewingJournal.impact}</span>
              </div>
              {viewingJournal.content && <div className="journal-view-content"><MarkdownRenderer content={viewingJournal.content}/></div>}
              {(viewingJournal.tagIds ?? []).filter(id=>id!==DEFAULT_TAG_ID && !isImportSourceTagId(id)).length>0 && <div className="entry-tags journal-view-tags">{(viewingJournal.tagIds ?? []).filter(id=>id!==DEFAULT_TAG_ID && !isImportSourceTagId(id)).map(id=>{const tag=tags.find(item=>item.id===id);return tag?<span key={id} className="mini-tag" style={{'--tag-color':tag.color} as any}>#{tag.name}</span>:null})}</div>}
              {(viewingJournal.attachments ?? []).some(a=>a.type==='image') && <div className="attachment-list">{(viewingJournal.attachments ?? []).filter(a=>a.type==='image').map(attachment=><AttachmentThumb key={attachment.id} attachment={attachment} onPreview={attachment=>void openImagePreview(attachment)} />)}</div>}
              {(viewingJournal.attachments ?? []).filter(a=>a.type==='audio').map(attachment=><AudioAttachment key={attachment.id} attachment={attachment}/>)}
              <section className="journal-thread" aria-label="记录后续对话">
                <div className="journal-thread-divider"><span>后续</span></div>
                <div className="journal-message-list">
                  {normalizeJournalMessages(viewingJournal.messages).map((message,index,rows)=>{
                    const previous=rows[index-1]
                    const showTime=!previous || Date.parse(message.createdAt)-Date.parse(previous.createdAt)>=5*60*1000
                    return <Fragment key={message.id}>
                      {showTime&&<div className="journal-message-time">{formatUiDate(new Date(message.createdAt))} · {new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>}
                      <div className="journal-message-row"><div className="journal-message-bubble">{message.content}</div></div>
                    </Fragment>
                  })}
                  {normalizeJournalMessages(viewingJournal.messages).length===0&&<div className="journal-thread-empty">想到什么，就在这里继续说。</div>}
                </div>
                <div className="journal-message-composer">
                  <textarea aria-label="继续说" rows={1} value={journalMessageDraft} onChange={event=>setJournalMessageDraft(event.target.value)} placeholder="继续说点什么…" />
                  <Button type="button" onClick={()=>sendJournalMessage(viewingJournal.id)} disabled={!journalMessageDraft.trim()}>发送</Button>
                </div>
                <small className="journal-message-note">发送后不可修改或删除</small>
              </section>
            </div>
            <div className="editor-footer">
              <div className="editor-secondary-actions"><Button type="button" className="delete-button" onClick={()=>deleteJournal(viewingJournal.id)}>删除记录</Button></div>
              <div className="editor-primary-actions">
                <Button className="cancel-button" type="button" onClick={()=>setViewingJournalId(null)}>关闭</Button>
                <Button variant="primary" className="save-button" type="button" onClick={()=>{const entry=viewingJournal;setViewingJournalId(null);editJournal(entry)}}>编辑</Button>
              </div>
            </div>
          </section>
        </div>
      )}

{journalEditorOpen && (
        <div className="modal-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭记录编辑器" onClick={closeJournalEditor} />
          <section className="task-editor journal-editor" role="dialog" aria-modal="true" aria-labelledby="journal-editor-title">
            <DialogHeader titleId="journal-editor-title" title={<>{editingJournalId ? '编辑记录' : '添加记录'}</>} eyebrow={<>{editingJournalId ? 'EDIT JOURNAL' : 'NEW JOURNAL'}</>} actions={<><Button className="close-button" type="button" onClick={closeJournalEditor} aria-label="关闭">×</Button></>} />
            <div className="editor-body">
              <Field className="field full-field"><span>标题 *</span><input autoFocus value={journalDraft.title} onChange={event => setJournalDraft(current => ({ ...current, title: event.target.value }))} placeholder="给这条记录一个标题" /></Field>
              <div className="field full-field"><span>事件影响</span><div className="impact-picker">{IMPACTS.map(impact => <Button key={impact} type="button" className={`impact-choice impact-${impact}${journalDraft.impact === impact ? ' active' : ''}`} onClick={() => setJournalDraft(current => ({ ...current, impact }))}>{impact > 0 ? '+' : ''}{impact}</Button>)}</div></div>
              <div className="field full-field journal-emotion-field"><span>具体感受 · 可选 · 最多 3 个</span><Button type="button" className="journal-emotion-trigger" onClick={()=>setEmotionPickerOpen(true)}><span className="journal-emotion-selection">{journalDraft.emotionIds.length ? journalDraft.emotionIds.map(id=>{const item=emotionOptions.find(row=>row.id===id);return item?<i key={id} className={`emotion-chip emotion-${item.group}`}>{item.name}</i>:null}) : <small>还没有选择具体感受</small>}</span><b>{journalDraft.emotionIds.length?'修改':'选择'} ›</b></Button></div>
              <Field className="field full-field"><span>正文 · Markdown</span><textarea rows={10} value={journalDraft.content} onChange={event => setJournalDraft(current => ({ ...current, content: event.target.value }))} placeholder="正文可选。支持标题、粗体、斜体、删除线、列表、引用、行内代码、分隔线和链接。" /></Field>
              <div className="field full-field journal-image-field"><span>图片 · 最多 9 张</span><div className="attachment-source-actions"><Field className="attachment-add">＋ 从设备添加<input className="journal-file-input" type="file" accept="image/*" multiple onChange={event => { void addJournalImages(event.target.files); event.currentTarget.value = '' }} disabled={journalDraft.attachments.filter(a => a.type === 'image').length >= 9} /></Field><Button type="button" className="attachment-add" onClick={()=>setImageLibraryTarget('journal')} disabled={journalDraft.attachments.filter(a=>a.type==='image').length>=9}>▧ 从图片库选择</Button></div>
                {journalDraft.attachments.some(a => a.type === 'image') && <div className="attachment-list">{journalDraft.attachments.filter(a => a.type === 'image').map(attachment => <AttachmentThumb key={attachment.id} attachment={attachment} onRemove={() => void removeJournalAttachment(attachment)} onPreview={attachment => void openImagePreview(attachment)} />)}</div>}
                <small>自动压缩后保存 · 单张约 1 MB · 最多 9 张</small>
              </div>
              <div className="field full-field"><span>录音 · 最多 1 条 / 30 分钟</span>
                {journalDraft.attachments.find(a => a.type === 'audio') ? (() => { const audio = journalDraft.attachments.find(a => a.type === 'audio')!; return <div className="journal-audio-edit"><AudioAttachment attachment={audio}/><Button type="button" onClick={() => void removeJournalAttachment(audio)}>删除录音</Button></div> })() :
                  <Button type="button" className="record-button" onClick={recording ? stopJournalRecording : () => void startJournalRecording()}>{recording ? `■ 停止录音 ${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2,'0')}` : '● 开始录音'}</Button>}
              </div>
              <div className="field full-field"><span>标签</span><div className="tag-picker">{tagsFor(tags, 'journal').map(tag => <Button key={tag.id} type="button" className={`tag-choice${journalDraft.tagIds.includes(tag.id) ? ' active' : ''}`} style={{ '--tag-color': tag.color } as any} onClick={() => toggleDraftTag('journal', tag.id)}><i />{tag.name}</Button>)}</div></div>
            </div>
            <div className="editor-footer">
              {editingJournalId && <div className="editor-secondary-actions"><Button type="button" className="delete-button" onClick={() => { deleteJournal(editingJournalId); closeJournalEditor() }}>删除记录</Button></div>}
              <div className="editor-primary-actions"><Button className="cancel-button" type="button" onClick={closeJournalEditor}>取消</Button><Button variant="primary" className="save-button" type="button" onClick={saveJournal} disabled={!journalDraft.title.trim()}>{editingJournalId ? '保存修改' : '保存记录'}</Button></div>
            </div>
          </section>
        </div>
      )}
  </>
}
