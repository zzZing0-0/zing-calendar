import { expect, test } from '@playwright/test'
import { readApplicationSource } from '../helpers/applicationSource'

test('image library uses one createdAt order for storage and reuse pickers',()=>{
 const app=readApplicationSource()
 expect(app).toContain('sortAttachmentsNewestFirst(attachmentLifecycle.map(row => row.attachment))')
 expect(app).toContain("const libraryImages = allStoredAttachments.filter(item => item.type === 'image')")
})

test('settings image preview supports adjacent navigation and rename without storage identity changes',()=>{
 const app=readApplicationSource()
 expect(app).toContain('aria-label="上一张"')
 expect(app).toContain('aria-label="下一张"')
 expect(app).toContain('onClick={renamePreviewImage}>重命名</Button>')
 expect(app).toContain('renameAttachment(row.attachments,key,value)')
 expect(app).toContain("event.key===\'ArrowLeft\'")
 expect(app).toContain("event.key===\'ArrowRight\'")
})
