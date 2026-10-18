import type * as React from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Attachment, JournalDraft, Note, TaskDraft } from '../../types'
import { StorageImage } from './AttachmentMedia'

export interface MediaDialogsProps {
  chooseLibraryImage: (source: Attachment) => void
  closeImagePreview: () => void
  draft: TaskDraft
  imageLibraryNoteId: string | null
  imageLibraryTarget: "task" | "note" | "journal" | null
  imagePreview: { url: string; name: string; storageKey: string; galleryKeys?: string[] | undefined; } | null
  journalDraft: JournalDraft
  libraryImages: Attachment[]
  notes: Note[]
  renamePreviewImage: () => void
  setImageLibraryTarget: React.Dispatch<React.SetStateAction<"task" | "note" | "journal" | null>>
  stepImagePreview: (delta: number) => void
}

export function MediaDialogs({
  chooseLibraryImage,
  closeImagePreview,
  draft,
  imageLibraryNoteId,
  imageLibraryTarget,
  imagePreview,
  journalDraft,
  libraryImages,
  notes,
  renamePreviewImage,
  setImageLibraryTarget,
  stepImagePreview
}: MediaDialogsProps) {
  return <>
{imageLibraryTarget && createPortal(
        <div className="storage-browser-layer attachment-library-layer" role="dialog" aria-modal="true" aria-label="从图片库选择">
          <Button className="modal-backdrop" type="button" aria-label="关闭图片库" onClick={()=>setImageLibraryTarget(null)} />
          <section className="storage-browser attachment-library-modal">
            <header className="storage-browser-header"><div><span className="eyebrow">IMAGE LIBRARY</span><h2>从图片库选择</h2><small>复用已有图片，不会重复占用存储空间</small></div><Button className="close-button" type="button" onClick={()=>setImageLibraryTarget(null)}>×</Button></header>
            {libraryImages.length===0 ? <EmptyState className="page-empty">图片库还是空的。</EmptyState> : <div className="storage-image-grid selectable-library-grid">{libraryImages.map(attachment => {
              const selected = imageLibraryTarget==='task'
                ? draft.attachments.some(a=>a.storageKey===attachment.storageKey)
                : imageLibraryTarget==='journal'
                  ? journalDraft.attachments.some(a=>a.storageKey===attachment.storageKey)
                  : notes.find(note=>note.id===imageLibraryNoteId)?.attachments?.some(a=>a.storageKey===attachment.storageKey) ?? false
              return <div className={`library-pick-item ${selected?'selected':''}`} key={attachment.storageKey}><StorageImage attachment={attachment} onPreview={()=>chooseLibraryImage(attachment)} />{selected && <span className="library-picked-mark">✓ 已引用</span>}</div>
            })}</div>}
          </section>
        </div>,
        document.body
      )}

{imagePreview && (
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={imagePreview.name}>
          <Button className="image-lightbox-backdrop" type="button" aria-label="关闭图片" onClick={closeImagePreview} />
          <img src={imagePreview.url} alt={imagePreview.name} />
          {imagePreview.galleryKeys?.length ? <>
            <Button className="image-lightbox-nav image-lightbox-prev" type="button" onClick={()=>stepImagePreview(-1)} disabled={imagePreview.galleryKeys.indexOf(imagePreview.storageKey)<=0} aria-label="上一张">‹</Button>
            <Button className="image-lightbox-nav image-lightbox-next" type="button" onClick={()=>stepImagePreview(1)} disabled={imagePreview.galleryKeys.indexOf(imagePreview.storageKey)>=imagePreview.galleryKeys.length-1} aria-label="下一张">›</Button>
            <span className="image-lightbox-count">{imagePreview.galleryKeys.indexOf(imagePreview.storageKey)+1} / {imagePreview.galleryKeys.length}</span>
            <Button className="image-lightbox-rename" type="button" onClick={renamePreviewImage}>重命名</Button>
          </>:null}
          <Button className="image-lightbox-close" type="button" onClick={closeImagePreview} aria-label="关闭">×</Button>
        </div>
      )}
  </>
}
