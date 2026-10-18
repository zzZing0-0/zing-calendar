import { useRef } from 'react'
import { DEFAULT_DAY_SECTION_ORDER, DEFAULT_SETTINGS_GROUP_ORDER, DAY_SECTION_LABELS, SETTINGS_GROUP_LABELS, moveLayoutItem } from '../../domain/layoutPreferences'

type Props={kind:'day'|'settings';order:readonly string[];onChange:(order:string[])=>void;onClose:()=>void}
export function LayoutOrderEditor({kind,order,onChange,onClose}:Props){
 const dragRef=useRef<string|null>(null)
 const title=kind==='day'?'今日详情排序':'设置页面排序'
 const labels:Record<string,string>=kind==='day'?DAY_SECTION_LABELS:SETTINGS_GROUP_LABELS
 const defaults=kind==='day'?DEFAULT_DAY_SECTION_ORDER:DEFAULT_SETTINGS_GROUP_ORDER
 return <div className="modal-layer layout-order-layer" role="presentation">
  <button className="modal-backdrop" type="button" aria-label={`关闭${title}`} onClick={onClose}/>
  <section className="task-editor module-priority-dialog" role="dialog" aria-modal="true" aria-label={title}>
   <div className="editor-header"><div><span className="eyebrow">LAYOUT</span><h2>{title}</h2></div><button className="close-button" type="button" onClick={onClose}>×</button></div>
   <div className="editor-body">
    <p className="module-priority-hint">拖动排序，或使用上下按钮。{kind==='day'?'任务固定第一，情绪月历可独立排序。':'搜索固定在最前面，其余一级功能区块可自由排序。'}</p>
    {kind==='day'&&<div className="module-priority-item layout-fixed-row"><span className="module-priority-handle">☰</span><strong>任务</strong><small>固定第一</small></div>}
    <div className="module-priority-list">{order.map((key,index)=><div key={key} className="module-priority-item" draggable onDragStart={event=>{dragRef.current=key;event.dataTransfer.effectAllowed='move'}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(dragRef.current)onChange(moveLayoutItem(order,dragRef.current,key));dragRef.current=null}} onDragEnd={()=>{dragRef.current=null}}>
     <span className="module-priority-handle" aria-hidden="true">☰</span><strong>{labels[key]??key}</strong>
     <button type="button" aria-label={`上移${labels[key]}`} disabled={index===0} onClick={()=>onChange(moveLayoutItem(order,key,order[index-1]))}>↑</button>
     <button type="button" aria-label={`下移${labels[key]}`} disabled={index===order.length-1} onClick={()=>onChange(moveLayoutItem(order,key,order[index+1],true))}>↓</button>
    </div>)}</div>
    <button type="button" className="ghost-button" onClick={()=>onChange([...defaults])}>恢复默认</button>
   </div>
  </section>
 </div>
}
