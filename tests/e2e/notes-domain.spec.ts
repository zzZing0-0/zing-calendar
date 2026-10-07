import { test, expect } from '@playwright/test'
import { activeNotes, DEFAULT_NOTEBOOK_ID, ensureDefaultNotebook, normalizeNotes, removeNotebook, reorderActiveNotes } from '../../src/domain/notes'
import { buildAttachmentLifecycle } from '../../src/domain/attachments'

test('notes regression › default notebook is stable and missing notebook ownership heals to default',()=>{
 const books=ensureDefaultNotebook([],'2026-10-07T00:00:00.000Z'); expect(books).toHaveLength(1); expect(books[0].id).toBe(DEFAULT_NOTEBOOK_ID)
 const notes=normalizeNotes([{id:'n',notebookId:'gone',title:'x',content:'',active:false,createdAt:'2026-10-07T00:00:00.000Z',updatedAt:'2026-10-07T00:00:00.000Z'}] as any,new Set(books.map(b=>b.id)))
 expect(notes[0].notebookId).toBe(DEFAULT_NOTEBOOK_ID)
})

test('notes regression › active notes use explicit manual order rather than updatedAt',()=>{
 const rows:any[]=[{id:'a',active:true,activeOrder:1,createdAt:'1',updatedAt:'9'},{id:'b',active:true,activeOrder:0,createdAt:'2',updatedAt:'1'}]
 expect(activeNotes(rows).map(n=>n.id)).toEqual(['b','a'])
 expect(activeNotes(reorderActiveNotes(rows,['a','b'],'10')).map(n=>n.id)).toEqual(['a','b'])
})

test('notes regression › deleting a notebook moves its notes to default without deleting content',()=>{
 const rows:any[]=[{id:'n',notebookId:'custom',title:'plan',content:'body',active:true,createdAt:'1',updatedAt:'1'}]
 const next=removeNotebook(rows,'custom','2'); expect(next[0]).toMatchObject({notebookId:DEFAULT_NOTEBOOK_ID,title:'plan',content:'body',active:true})
})

test('notes regression › note attachment participates in lifecycle and trash keeps the binary referenced',()=>{
 const attachment:any={id:'a',type:'image',filename:'x.png',mimeType:'image/png',size:1,storageKey:'k',createdAt:'1'}
 const active:any={id:'n',notebookId:DEFAULT_NOTEBOOK_ID,title:'x',content:'',active:false,createdAt:'1',updatedAt:'1',attachments:[attachment]}
 expect(buildAttachmentLifecycle([],[],[active])[0]).toMatchObject({state:'active',activeRefs:1})
 expect(buildAttachmentLifecycle([],[],[{...active,trashedAt:'2'}])[0]).toMatchObject({state:'trash',trashRefs:1})
})
