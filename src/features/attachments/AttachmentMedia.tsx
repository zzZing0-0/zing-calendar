import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { getAttachmentBlob } from '../../db/calendar'
import type {
  Attachment
} from '../../types'
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const targetBytes = 1024 * 1024
  let width = bitmap.width
  let height = bitmap.height
  const initialScale = Math.min(1, 1800 / Math.max(width, height))
  width = Math.max(1, Math.round(width * initialScale))
  height = Math.max(1, Math.round(height * initialScale))

  const render = (w: number, h: number, quality: number) => new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片压缩失败')), 'image/webp', quality)
  })

  let blob: Blob | null = null
  // Mobile photos can remain several MB after one quality pass. Reduce quality first,
  // then dimensions, and validate the final stored blob rather than trusting one pass.
  for (let resizeRound = 0; resizeRound < 6; resizeRound += 1) {
    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      blob = await render(width, height, quality)
      if (blob.size <= targetBytes) { bitmap.close(); return blob }
    }
    width = Math.max(640, Math.round(width * 0.82))
    height = Math.max(640, Math.round(height * 0.82))
  }
  bitmap.close()
  if (!blob || blob.size > targetBytes) throw new Error('这张图片压缩后仍超过 1 MB，请选择分辨率更低的图片')
  return blob
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AttachmentThumb({ attachment, onRemove, onPreview }: { attachment: Attachment; onRemove?: () => void; onPreview: (attachment: Attachment) => void }) {
  const [url, setUrl] = useState<string>('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    getAttachmentBlob(attachment.storageKey).then(blob => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.storageKey])

  return <div className="attachment-card">
    <Button className="attachment-image-button" type="button" onClick={() => onPreview(attachment)} disabled={!url} aria-label={`预览 ${attachment.filename}`}>
      {url ? <img src={url} alt="" /> : <span className="attachment-loading">加载中…</span>}
    </Button>
    <div className="attachment-card-info">
      <span className="attachment-card-name" title={attachment.filename}>{attachment.filename}</span>
      <span className="attachment-card-size">压缩后 {formatFileSize(attachment.size)}</span>
    </div>
    {onRemove && <Button className="attachment-remove-button" type="button" onClick={onRemove} aria-label={`删除 ${attachment.filename}`}>×</Button>}
  </div>
}

export function StorageImage({ attachment, onPreview }: { attachment: Attachment; onPreview:(attachment:Attachment)=>void }) {
  const [url,setUrl]=useState('')
  useEffect(() => {
    let active=true, objectUrl=''
    getAttachmentBlob(attachment.storageKey).then(blob => { if (!active || !blob) return; objectUrl=URL.createObjectURL(blob); setUrl(objectUrl) })
    return () => { active=false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  },[attachment.storageKey])
  return <Button type="button" className="storage-image-item" onClick={()=>onPreview(attachment)}>{url ? <img src={url} alt={attachment.filename}/> : <span>加载中…</span>}<small>{attachment.filename}</small></Button>
}

export function AudioAttachment({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true, objectUrl = ''
    getAttachmentBlob(attachment.storageKey).then(blob => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [attachment.storageKey])
  return url ? <audio className="journal-audio-player" controls src={url} /> : <span>录音加载中…</span>
}
