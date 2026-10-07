import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Note, Notebook } from '../../types'
import { activeNotes, DEFAULT_NOTEBOOK_ID, nextActiveOrder, notesInNotebook, removeNotebook, reorderActiveNotes, trashNote } from '../../domain/notes'
import { MarkdownEditorAdapter } from '../../components/markdown/MarkdownEditorAdapter'
import { MarkdownRenderer } from '../../components/markdown/MarkdownRenderer'

type Props={notes:Note[];notebooks:Notebook[];setNotes:React.Dispatch<React.SetStateAction<Note[]>>;setNotebooks:React.Dispatch<React.SetStateAction<Notebook[]>>;requestedNoteId?:string|null;onRequestedNoteHandled?:()=>void}
export function NotesPage({notes,notebooks,setNotes,setNotebooks,requestedNoteId,onRequestedNoteHandled}:Props){
 const [notebookOpen,setNotebookOpen]=useState(false), [selectedNotebook,setSelectedNotebook]=useState<string|null>(null), [editingId,setEditingId]=useState<string|null>(null), [mobileMode,setMobileMode]=useState<'edit'|'preview'>('edit')
 const active=useMemo(()=>activeNotes(notes),[notes]); const shown=selectedNotebook?notesInNotebook(notes,selectedNotebook):active
 const editing=notes.find(n=>n.id===editingId&&!n.trashedAt)
 useEffect(()=>{if(!requestedNoteId)return;const target=notes.find(n=>n.id===requestedNoteId&&!n.trashedAt);if(target){setEditingId(target.id);setSelectedNotebook(target.notebookId)}onRequestedNoteHandled?.()},[requestedNoteId,notes,onRequestedNoteHandled])
 const previewRef=useRef<HTMLDivElement>(null)
 const [mobileViewport,setMobileViewport]=useState<{top:number;height:number}|null>(null)
 useEffect(()=>{
  if(!editing)return
  const viewport=window.visualViewport
  const update=()=>setMobileViewport(viewport?{top:viewport.offsetTop,height:viewport.height}:null)
  update()
  viewport?.addEventListener('resize',update)
  viewport?.addEventListener('scroll',update)
  const previousOverflow=document.documentElement.style.overflow
  const previousBodyOverflow=document.body.style.overflow
  document.documentElement.style.overflow='hidden'
  document.body.style.overflow='hidden'
  return ()=>{
   viewport?.removeEventListener('resize',update)
   viewport?.removeEventListener('scroll',update)
   document.documentElement.style.overflow=previousOverflow
   document.body.style.overflow=previousBodyOverflow
  }
 },[editingId])
 const editorViewportStyle=mobileViewport?({'--note-vv-top':`${mobileViewport.top}px`,'--note-vv-height':`${mobileViewport.height}px`} as CSSProperties):undefined
 const syncPreviewScroll=useCallback((ratio:number)=>{
  const preview=previewRef.current
  if(!preview)return
  const max=preview.scrollHeight-preview.clientHeight
  preview.scrollTop=max>0?ratio*max:0
 },[])
 const createNote=()=>{const now=new Date().toISOString(), id=crypto.randomUUID(); const notebookId=selectedNotebook??DEFAULT_NOTEBOOK_ID; setNotes(x=>[...x,{id,notebookId,title:'未命名笔记',content:'',active:!selectedNotebook,activeOrder:!selectedNotebook?nextActiveOrder(x):undefined,createdAt:now,updatedAt:now,tagIds:[],attachments:[]}]);setEditingId(id)}
 const patch=(patch:Partial<Note>)=>setNotes(x=>x.map(n=>n.id===editingId?{...n,...patch,updatedAt:new Date().toISOString()}:n))
 const toggleActive=(n:Note)=>setNotes(x=>x.map(row=>row.id===n.id?{...row,active:!row.active,activeOrder:row.active?undefined:nextActiveOrder(x),updatedAt:new Date().toISOString()}:row))
 const move=(id:string,delta:number)=>{const ids=active.map(n=>n.id), i=ids.indexOf(id), j=i+delta;if(i<0||j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];setNotes(x=>reorderActiveNotes(x,ids,new Date().toISOString()))}
 const addNotebook=()=>{const name=window.prompt('笔记本名称')?.trim();if(!name)return;const now=new Date().toISOString();setNotebooks(x=>[...x,{id:crypto.randomUUID(),name,order:x.length,createdAt:now,updatedAt:now}])}
 const deleteNote=(note:Note)=>{if(!window.confirm(`删除「${note.title}」？笔记将移入回收站。`))return;const now=new Date().toISOString();setNotes(x=>x.map(row=>row.id===note.id?trashNote(row,now):row));setEditingId(null)}
 const deleteNotebook=(book:Notebook)=>{if(book.id===DEFAULT_NOTEBOOK_ID)return;if(!window.confirm(`删除「${book.name}」？其中的笔记将移动到「默认」。`))return;const now=new Date().toISOString();setNotes(x=>removeNotebook(x,book.id,now));setNotebooks(x=>x.filter(b=>b.id!==book.id));if(selectedNotebook===book.id)setSelectedNotebook(DEFAULT_NOTEBOOK_ID)}
 return <section className="notes-page">
  <div className="page-heading notes-heading"><div><span className="eyebrow">NOTES</span><h2>{selectedNotebook?notebooks.find(b=>b.id===selectedNotebook)?.name:'笔记'}</h2></div><div className="notes-actions"><button onClick={()=>setNotebookOpen(true)}>笔记本</button><button className="primary" onClick={createNote}>＋ 新建</button></div></div>
  {!selectedNotebook&&<p className="notes-subtitle">已激活笔记 · 当前工作集</p>}
  <div className="note-list">{shown.length?shown.map((n,index)=><article key={n.id} className="note-row" onClick={()=>setEditingId(n.id)}><div><strong>{n.title}</strong><p>{n.content.replace(/[#>*_`~\[\]()!-]+/g,' ').replace(/\s+/g,' ').slice(0,100)||'空白笔记'}</p><small>{notebooks.find(b=>b.id===n.notebookId)?.name??'默认'} · {new Date(n.updatedAt).toLocaleDateString()}</small></div><div className="note-row-actions" onClick={e=>e.stopPropagation()}><button className={n.active?'note-active-toggle is-active':'note-active-toggle'} onClick={()=>toggleActive(n)}>{n.active?'● 已激活':'○ 激活'}</button>{!selectedNotebook&&<><button disabled={index===0} onClick={()=>move(n.id,-1)}>↑</button><button disabled={index===shown.length-1} onClick={()=>move(n.id,1)}>↓</button></>}</div></article>):<p className="page-empty">{selectedNotebook?'这个笔记本还是空的。':'还没有已激活笔记。'}</p>}</div>
  {selectedNotebook&&<button className="notes-back" onClick={()=>setSelectedNotebook(null)}>← 返回已激活笔记</button>}
  {notebookOpen&&<div className="notes-overlay"><button className="modal-backdrop" aria-label="关闭笔记本" onClick={()=>setNotebookOpen(false)}/><aside className="notebook-drawer"><header><h3>笔记本</h3><button onClick={()=>setNotebookOpen(false)}>×</button></header>{notebooks.sort((a,b)=>a.order-b.order).map(b=><div className="notebook-row" key={b.id}><button onClick={()=>{setSelectedNotebook(b.id);setNotebookOpen(false)}}><strong>{b.name}</strong><span>{notes.filter(n=>n.notebookId===b.id&&!n.trashedAt).length}</span></button>{!b.system&&<button className="danger-quiet" onClick={()=>deleteNotebook(b)}>删除</button>}</div>)}<button className="notebook-add" onClick={addNotebook}>＋ 新建笔记本</button></aside></div>}
  {editing&&<div className="note-editor-overlay" style={editorViewportStyle}><button className="modal-backdrop" aria-label="关闭笔记" onClick={()=>setEditingId(null)}/><div className="note-editor"><header><input value={editing.title} onChange={e=>patch({title:e.target.value})}/><div><button className={editing.active?'note-active-toggle is-active':'note-active-toggle'} onClick={()=>toggleActive(editing)}>{editing.active?'● 已激活':'○ 激活'}</button><button className="danger-quiet" onClick={()=>deleteNote(editing)}>删除</button><button onClick={()=>setEditingId(null)}>完成</button></div></header><div className="note-meta"><select value={editing.notebookId} onChange={e=>patch({notebookId:e.target.value})}>{notebooks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><span>{new Date(editing.updatedAt).toLocaleString()}</span></div><div className="note-mobile-tabs"><button className={mobileMode==='edit'?'active':''} onClick={()=>setMobileMode('edit')}>编辑</button><button className={mobileMode==='preview'?'active':''} onClick={()=>setMobileMode('preview')}>预览</button></div><div className={`note-split mobile-${mobileMode}`}><div className="note-edit-pane"><MarkdownEditorAdapter value={editing.content} onChange={content=>patch({content})} onScrollRatio={syncPreviewScroll}/></div><div ref={previewRef} className="note-preview-pane"><MarkdownRenderer content={editing.content}/></div></div></div></div>}
 </section>
}
