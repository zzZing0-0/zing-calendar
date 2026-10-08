import { expect, test } from '@playwright/test'
import { buildAttachmentLifecycle, referencedAttachmentKeys, renameAttachment, sortAttachmentsNewestFirst } from '../../src/domain/attachments'
import type { Attachment, JournalEntry, Task } from '../../src/types'

const image=(key:string):Attachment=>({id:key,type:'image',filename:`${key}.webp`,mimeType:'image/webp',size:123,storageKey:key,createdAt:'2026-10-04T10:00:00.000Z'})
const task=(id:string,attachments:Attachment[],trashedAt?:string):Task=>({id,title:id,date:'2026-10-04',priority:0,status:'todo',allDay:true,createdAt:'2026-10-04T10:00:00.000Z',updatedAt:'2026-10-04T10:00:00.000Z',attachments,trashedAt})
const journal=(id:string,attachments:Attachment[],trashedAt?:string):JournalEntry=>({id,date:'2026-10-04',title:id,content:'',impact:0,createdAt:'2026-10-04T10:00:00.000Z',updatedAt:'2026-10-04T10:00:00.000Z',attachments,trashedAt})

test.describe('attachment lifecycle regression',()=>{
  test('one live reference keeps a shared image active even when another reference is trashed',()=>{
    const shared=image('attachment:11111111-1111-1111-1111-111111111111')
    const rows=buildAttachmentLifecycle([task('live',[shared]),task('trash',[shared],'2026-10-04T11:00:00.000Z')],[])
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({state:'active',activeRefs:1,trashRefs:1})
  })
  test('image moves to trash section only when every remaining reference is trashed',()=>{
    const shared=image('attachment:22222222-2222-2222-2222-222222222222')
    const rows=buildAttachmentLifecycle([task('trash',[shared],'2026-10-04T11:00:00.000Z')],[journal('j',[shared],'2026-10-04T12:00:00.000Z')])
    expect(rows[0]).toMatchObject({state:'trash',activeRefs:0,trashRefs:2})
  })
  test('restoring any owner makes the attachment active again without changing storage identity',()=>{
    const shared=image('attachment:33333333-3333-3333-3333-333333333333')
    expect(buildAttachmentLifecycle([task('t',[shared],'2026-10-04T11:00:00.000Z')],[])[0].state).toBe('trash')
    const restored=buildAttachmentLifecycle([task('t',[shared])],[])[0]
    expect(restored.state).toBe('active'); expect(restored.attachment.storageKey).toBe(shared.storageKey)
  })
  test('permanently deleted recurrence occurrence no longer keeps its attachment referenced',()=>{
    const base=task('series',[]); const gone=image('attachment:44444444-4444-4444-4444-444444444444')
    base.recurrenceExceptions={'2026-10-05':{deleted:true,attachments:[gone],updatedAt:'2026-10-04T12:00:00.000Z'}}
    expect(referencedAttachmentKeys([base],[])).not.toContain(gone.storageKey)
  })
  test('trashed recurrence occurrence keeps its attachment recoverable in trash',()=>{
    const base=task('series',[]); const kept=image('attachment:55555555-5555-5555-5555-555555555555')
    base.recurrenceExceptions={'2026-10-05':{deleted:false,trashedAt:'2026-10-04T12:00:00.000Z',attachments:[kept],updatedAt:'2026-10-04T12:00:00.000Z'}}
    expect(buildAttachmentLifecycle([base],[])[0].state).toBe('trash')
  })
})

test('image library order is newest-added first and renaming never changes that order',()=>{
  const older={...image('attachment:old'),filename:'zzz.webp',createdAt:'2026-10-04T10:00:00.000Z'}
  const newer={...image('attachment:new'),filename:'aaa.webp',createdAt:'2026-10-05T10:00:00.000Z'}
  const renamed=renameAttachment([older,newer],newer.storageKey,'我的图片.webp')!
  expect(sortAttachmentsNewestFirst(renamed).map(item=>item.storageKey)).toEqual([newer.storageKey,older.storageKey])
  expect(renamed.find(item=>item.storageKey===newer.storageKey)?.filename).toBe('我的图片.webp')
})
