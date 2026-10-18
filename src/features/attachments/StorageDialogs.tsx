import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Attachment } from '../../types'
import { AudioAttachment, StorageImage } from './AttachmentMedia'

export interface StorageDialogsProps {
  browsedActiveAttachments: Attachment[]
  browsedAttachments: Attachment[]
  browsedTrashedAttachments: Attachment[]
  cleanupB2Orphans: () => Promise<void>
  formatBytes: (bytes: number) => string
  openImagePreview: (attachment: Attachment, gallery?: Attachment[]) => Promise<void>
  orphanAttachments: { key: string; url: string; contentType: string; size: number; }[]
  orphanCleanupBusy: boolean
  orphanCleanupOpen: boolean
  setOrphanCleanupOpen: React.Dispatch<React.SetStateAction<boolean>>
  setStorageBrowser: React.Dispatch<React.SetStateAction<"image" | "audio" | null>>
  storageBrowser: "image" | "audio" | null
  storageStats: { total: number; images: number; audio: number; data: number; attachmentCount: number; }
}

export function StorageDialogs({
  browsedActiveAttachments,
  browsedAttachments,
  browsedTrashedAttachments,
  cleanupB2Orphans,
  formatBytes,
  openImagePreview,
  orphanAttachments,
  orphanCleanupBusy,
  orphanCleanupOpen,
  setOrphanCleanupOpen,
  setStorageBrowser,
  storageBrowser,
  storageStats
}: StorageDialogsProps) {
  return <>
{orphanCleanupOpen && (
        <div className="modal-layer storage-browser-layer orphan-cleanup-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭孤儿附件检查" onClick={()=>setOrphanCleanupOpen(false)} />
          <section className="storage-browser orphan-cleanup-modal" role="dialog" aria-modal="true" aria-label="孤儿附件检查">
            <div className="storage-browser-header">
              <div><span className="eyebrow">B2 CLEANUP</span><h2>孤儿附件</h2><small>{orphanAttachments.length} 个文件 · 删除前可以逐个查看</small></div>
              <Button className="close-button" type="button" onClick={()=>setOrphanCleanupOpen(false)}>×</Button>
            </div>
            {orphanAttachments.length===0 ? <EmptyState className="page-empty">没有发现孤儿附件，B2 很干净。</EmptyState> : <>
              <p className="orphan-cleanup-note">这些文件当前没有任何任务、记录或回收站内容引用。图片可直接查看，录音可直接试听；无法识别的文件仍会显示 B2 storage key。</p>
              <div className="orphan-preview-list">{orphanAttachments.map(item=>{const image=item.contentType.startsWith('image/'),audio=item.contentType.startsWith('audio/');return <article className="orphan-preview-item" key={item.key}>
                <div className="orphan-preview-media">{image&&item.url?<img src={item.url} alt="孤儿附件"/>:audio&&item.url?<audio controls src={item.url}/>:<span>{item.url?'无法预览此文件':'预览链接获取失败'}</span>}</div>
                <div className="orphan-preview-meta"><code>{item.key}</code><small>{item.contentType||'未知类型'}{item.size?` · ${formatBytes(item.size)}`:''}</small></div>
              </article>})}</div>
              <div className="orphan-cleanup-actions"><Button type="button" onClick={()=>setOrphanCleanupOpen(false)} disabled={orphanCleanupBusy}>暂不清理</Button><Button variant="danger" className="danger" type="button" onClick={()=>void cleanupB2Orphans()} disabled={orphanCleanupBusy}>{orphanCleanupBusy?'正在清理…':`永久删除 ${orphanAttachments.length} 个`}</Button></div>
            </>}
          </section>
        </div>
      )}

{storageBrowser && (
        <div className="modal-layer storage-browser-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭附件浏览" onClick={()=>setStorageBrowser(null)} />
          <section className="storage-browser">
            <div className="storage-browser-header">
              <div><span className="eyebrow">STORAGE</span><h2>{storageBrowser==='image'?'所有图片':'所有录音'}</h2><small>{browsedAttachments.length} 个附件 · {formatBytes(storageBrowser==='image'?storageStats.images:storageStats.audio)}</small></div>
              <Button className="close-button" type="button" onClick={()=>setStorageBrowser(null)}>×</Button>
            </div>
            {browsedAttachments.length===0 ? <EmptyState className="page-empty">还没有{storageBrowser==='image'?'图片':'录音'}。</EmptyState> : <>
              {storageBrowser==='image' ? <div className="storage-image-grid">{browsedActiveAttachments.map(attachment => <StorageImage key={attachment.storageKey} attachment={attachment} onPreview={item=>void openImagePreview(item,browsedAttachments)} />)}</div>
                : <div className="storage-audio-list">{browsedActiveAttachments.map(attachment => <div className="storage-audio-row" key={attachment.storageKey}><span><strong>{attachment.filename}</strong><small>{formatBytes(attachment.size)}</small></span><AudioAttachment attachment={attachment}/></div>)}</div>}
              {browsedTrashedAttachments.length>0 && <section className="storage-trash-section"><div className="storage-trash-divider"><span>回收站 · {browsedTrashedAttachments.length}</span><small>所有引用它的内容都已进入回收站</small></div>
                {storageBrowser==='image' ? <div className="storage-image-grid">{browsedTrashedAttachments.map(attachment => <StorageImage key={attachment.storageKey} attachment={attachment} onPreview={item=>void openImagePreview(item,browsedAttachments)} />)}</div>
                  : <div className="storage-audio-list">{browsedTrashedAttachments.map(attachment => <div className="storage-audio-row" key={attachment.storageKey}><span><strong>{attachment.filename}</strong><small>{formatBytes(attachment.size)}</small></span><AudioAttachment attachment={attachment}/></div>)}</div>}
              </section>}
            </>}

          </section>
        </div>
      )}
  </>
}
