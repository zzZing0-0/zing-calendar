import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import MDEditor, { commands } from '@uiw/react-md-editor'
import { toggleMarkdownTaskAtOffset } from '../../domain/markdown'

const headingGroup = commands.group(
  [commands.title1, commands.title2, commands.title3, commands.title4, commands.title5, commands.title6],
  { name:'zing-heading', groupName:'zing-heading', icon:<span className="zing-heading-command">H⌄</span>, buttonProps:{'aria-label':'选择标题级别',title:'标题'} },
)
type ToolbarCommand={buttonProps?:ButtonHTMLAttributes<HTMLButtonElement>|null}
function withChineseTitle<T extends ToolbarCommand>(command:T,title:string):T{return {...command,buttonProps:{...(command.buttonProps??{}),title,'aria-label':title}} as T}
const toolbarCommands={bold:withChineseTitle(commands.bold,'粗体'),italic:withChineseTitle(commands.italic,'斜体'),strike:withChineseTitle(commands.strikethrough,'删除线'),unordered:withChineseTitle(commands.unorderedListCommand,'无序列表'),ordered:withChineseTitle(commands.orderedListCommand,'有序列表'),checklist:withChineseTitle(commands.checkedListCommand,'插入清单'),quote:withChineseTitle(commands.quote,'引用'),link:withChineseTitle(commands.link,'插入链接'),table:withChineseTitle(commands.table,'插入表格'),code:withChineseTitle(commands.code,'行内代码'),codeBlock:withChineseTitle(commands.codeBlock,'代码块'),hr:withChineseTitle(commands.hr,'分隔线')}

type Props={value:string;onChange:(value:string)=>void;onScrollRatio?:(ratio:number)=>void}
type Selection={start:number;end:number}

function replaceSelection(value:string,selection:Selection,replacement:string){return value.slice(0,selection.start)+replacement+value.slice(selection.end)}
function lineBounds(value:string,offset:number){const start=value.lastIndexOf('\n',Math.max(0,offset-1))+1;const next=value.indexOf('\n',offset);return {start,end:next<0?value.length:next}}

function MobileMarkdownEditor({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const textareaRef=useRef<HTMLTextAreaElement>(null)
 const pendingSelection=useRef<Selection|null>(null)
 const pendingScroll=useRef<{scroller:HTMLElement|null;top:number;pageX:number;pageY:number}|null>(null)
 const resize=()=>{const el=textareaRef.current;if(!el)return;el.style.height='auto';el.style.height=`${Math.max(320,el.scrollHeight)}px`}
 const restoreScroll=()=>{const snapshot=pendingScroll.current;if(!snapshot)return;if(snapshot.scroller?.isConnected)snapshot.scroller.scrollTop=snapshot.top;window.scrollTo(snapshot.pageX,snapshot.pageY)}
 useLayoutEffect(()=>{resize();if(!pendingScroll.current)return;restoreScroll();requestAnimationFrame(()=>{restoreScroll();requestAnimationFrame(()=>{restoreScroll();pendingScroll.current=null})})},[value])
 useLayoutEffect(()=>{const sel=pendingSelection.current,el=textareaRef.current;if(!sel||!el)return;pendingSelection.current=null;el.focus({preventScroll:true});el.setSelectionRange(sel.start,sel.end)},[value])
 const selection=():Selection=>{const el=textareaRef.current;return {start:el?.selectionStart??0,end:el?.selectionEnd??0}}
 const handleInputChange=(next:string)=>{const el=textareaRef.current;const scroller=el?.closest<HTMLElement>('.note-editor')??null;pendingScroll.current={scroller,top:scroller?.scrollTop??0,pageX:window.scrollX,pageY:window.scrollY};onChange(next)}
 const commit=(next:string,nextSelection:Selection)=>{pendingSelection.current=nextSelection;onChange(next)}
 const wrap=(before:string,after=before,placeholder='文本')=>{const sel=selection();const chosen=value.slice(sel.start,sel.end)||placeholder;const replacement=before+chosen+after;commit(replaceSelection(value,sel,replacement),{start:sel.start+before.length,end:sel.start+before.length+chosen.length})}
 const prefix=(mark:string)=>{const sel=selection();const bounds=lineBounds(value,sel.start);const line=value.slice(bounds.start,bounds.end);const nextLine=line.startsWith(mark)?line.slice(mark.length):mark+line;const delta=nextLine.length-line.length;commit(value.slice(0,bounds.start)+nextLine+value.slice(bounds.end),{start:Math.max(bounds.start,sel.start+delta),end:Math.max(bounds.start,sel.end+delta)})}
 const insert=(text:string,cursorOffset=text.length)=>{const sel=selection();commit(replaceSelection(value,sel,text),{start:sel.start+cursorOffset,end:sel.start+cursorOffset})}
 const toggleTask=()=>{const sel=selection();const next=toggleMarkdownTaskAtOffset(value,sel.start);if(next!==value)commit(next,sel);else prefix('- [ ] ')}
 const heading=(level:number)=>{const sel=selection();const bounds=lineBounds(value,sel.start);const line=value.slice(bounds.start,bounds.end);const clean=line.replace(/^#{1,6}\s+/,'');const mark='#'.repeat(level)+' ';const next=value.slice(0,bounds.start)+mark+clean+value.slice(bounds.end);commit(next,{start:bounds.start+mark.length,end:bounds.start+mark.length+clean.length})}
 return <div className="zing-mobile-md-editor" data-mobile-single-layer="true">
  <div className="zing-mobile-md-toolbar-shell">
   <div className="zing-mobile-md-toolbar" role="toolbar" aria-label="Markdown 工具栏">
   <select aria-label="标题" defaultValue="" onChange={e=>{const n=Number(e.target.value);if(n)heading(n);e.currentTarget.value='' }}><option value="">H⌄</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>H{n}</option>)}</select>
   <button type="button" title="粗体" onMouseDown={e=>e.preventDefault()} onClick={()=>wrap('**')}>B</button>
   <button type="button" title="斜体" onMouseDown={e=>e.preventDefault()} onClick={()=>wrap('*')}><i>I</i></button>
   <button type="button" title="删除线" onMouseDown={e=>e.preventDefault()} onClick={()=>wrap('~~')}><s>S</s></button>
   <span className="divider"/>
   <button type="button" title="无序列表" onMouseDown={e=>e.preventDefault()} onClick={()=>prefix('- ')}>•≡</button>
   <button type="button" title="有序列表" onMouseDown={e=>e.preventDefault()} onClick={()=>prefix('1. ')}>1.</button>
   <button type="button" aria-label="插入/切换清单" title="插入/切换清单" onMouseDown={e=>e.preventDefault()} onClick={toggleTask}>☑</button>
   <button type="button" title="引用" onMouseDown={e=>e.preventDefault()} onClick={()=>prefix('> ')}>❯</button>
   <span className="divider"/>
   <button type="button" title="插入链接" onMouseDown={e=>e.preventDefault()} onClick={()=>wrap('[','](https://)','链接')}>🔗</button>
   <button type="button" title="插入表格" onMouseDown={e=>e.preventDefault()} onClick={()=>insert('| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |\n')}>▦</button>
   <span className="divider"/>
   <button type="button" title="行内代码" onMouseDown={e=>e.preventDefault()} onClick={()=>wrap('`')}>{'</>'}</button>
   <button type="button" title="代码块" onMouseDown={e=>e.preventDefault()} onClick={()=>wrap('```\n','\n```','代码')}>▣</button>
   <button type="button" title="分隔线" onMouseDown={e=>e.preventDefault()} onClick={()=>insert('\n---\n')}>—</button>
   </div>
  </div>
  <textarea ref={textareaRef} className="zing-mobile-md-textarea" aria-label="Markdown 正文" value={value} onChange={e=>handleInputChange(e.target.value)} spellCheck={false}/>
 </div>
}

export function MarkdownEditorAdapter({value,onChange,onScrollRatio}:Props){
 const rootRef=useRef<HTMLDivElement>(null)
 const [isMobile,setIsMobile]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 700px)').matches)
 useEffect(()=>{const media=window.matchMedia('(max-width: 700px)');const update=()=>setIsMobile(media.matches);update();media.addEventListener?.('change',update);return()=>media.removeEventListener?.('change',update)},[])
 useEffect(()=>{if(isMobile||!onScrollRatio)return;const root=rootRef.current;if(!root)return;const report=(event:Event)=>{const scroller=event.target as HTMLElement|null;if(!scroller||!root.contains(scroller))return;const max=scroller.scrollHeight-scroller.clientHeight;if(max>1)onScrollRatio(scroller.scrollTop/max)};root.addEventListener('scroll',report,{capture:true,passive:true});return()=>root.removeEventListener('scroll',report,{capture:true})},[isMobile,onScrollRatio])
 if(isMobile)return <MobileMarkdownEditor value={value} onChange={onChange}/>
 const toggleCurrentTask={name:'zing-toggle-task',keyCommand:'zing-toggle-task',icon:<svg className="zing-toggle-task-command" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.2 6.4 11.5 13 4.8"/></svg>,buttonProps:{'aria-label':'切换当前清单完成状态',title:'勾选/取消当前清单（先把光标放在该行）',onMouseDown:(event:any)=>event.preventDefault()},execute:()=>{const textarea=rootRef.current?.querySelector<HTMLTextAreaElement>('textarea');if(!textarea)return;const cursor=textarea.selectionStart;const root=rootRef.current;const scrollSnapshots=root?[root,...Array.from(root.querySelectorAll<HTMLElement>('*'))].filter(el=>el.scrollHeight>el.clientHeight||el.scrollWidth>el.clientWidth).map(el=>({el,top:el.scrollTop,left:el.scrollLeft})):[];const pageX=window.scrollX,pageY=window.scrollY;const next=toggleMarkdownTaskAtOffset(value,cursor);if(next===value)return;onChange(next);const restore=()=>{const nextTextarea=rootRef.current?.querySelector<HTMLTextAreaElement>('textarea');if(!nextTextarea)return;nextTextarea.focus({preventScroll:true});nextTextarea.setSelectionRange(cursor,cursor);for(const snapshot of scrollSnapshots)if(snapshot.el.isConnected){snapshot.el.scrollTop=snapshot.top;snapshot.el.scrollLeft=snapshot.left}window.scrollTo(pageX,pageY)};requestAnimationFrame(()=>{restore();requestAnimationFrame(()=>{restore();setTimeout(restore,0)})})}}
 return <div ref={rootRef} data-color-mode="light" className="zing-md-editor"><MDEditor value={value} onChange={next=>onChange(next??'')} preview="edit" height="100%" commands={[headingGroup,toolbarCommands.bold,toolbarCommands.italic,toolbarCommands.strike,commands.divider,toolbarCommands.unordered,toolbarCommands.ordered,toolbarCommands.checklist,toggleCurrentTask,toolbarCommands.quote,commands.divider,toolbarCommands.link,toolbarCommands.table,commands.divider,toolbarCommands.code,toolbarCommands.codeBlock,toolbarCommands.hr]} extraCommands={[]}/></div>
}
