import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { DAY_SECTION_LABELS, DEFAULT_DAY_SECTION_ORDER, DEFAULT_SETTINGS_GROUP_ORDER, SETTINGS_GROUP_LABELS, moveLayoutItem } from '../../domain/layoutPreferences'

type Props = {kind:'day'|'settings';order:readonly string[];onChange:(order:string[])=>void;onClose:()=>void}

export function LayoutOrderEditor({kind,order,onChange,onClose}:Props){
 const activeDrag = useRef<{key:string;pointerId:number}|null>(null)
 const lastTarget = useRef<string|null>(null)
 const [dragging,setDragging] = useState<string|null>(null)
 const title = kind==='day'?'今日详情排序':'设置页面排序'
 const labels:Record<string,string> = kind==='day'?DAY_SECTION_LABELS:SETTINGS_GROUP_LABELS
 const defaults = kind==='day'?DEFAULT_DAY_SECTION_ORDER:DEFAULT_SETTINGS_GROUP_ORDER
 const endDrag = () => {activeDrag.current=null;lastTarget.current=null;setDragging(null)}
 const movePointer = (clientX:number,clientY:number) => {
  const active=activeDrag.current
  if(!active)return
  const target=document.elementFromPoint(clientX,clientY)?.closest<HTMLElement>('[data-layout-key]')?.dataset.layoutKey
  if(target===lastTarget.current)return
  lastTarget.current=target??null
  if(target&&target!==active.key&&order.includes(target))onChange(moveLayoutItem(order,active.key,target,order.indexOf(active.key)<order.indexOf(target)))
 }
 return <div className="modal-layer layout-order-layer" role="presentation">
  <Button className="modal-backdrop" type="button" aria-label={`关闭${title}`} onClick={onClose}/>
  <section className="task-editor module-priority-dialog" role="dialog" aria-modal="true" aria-label={title}>
   <DialogHeader title={<>{title}</>} eyebrow={<>LAYOUT</>} actions={<><Button className="close-button" type="button" onClick={onClose}>×</Button></>} />
   <div className="editor-body">
    <div className="module-priority-list layout-sort-list">
     {kind==='day'&&<div className="module-priority-item layout-locked-item"><strong>任务</strong></div>}
     {order.map((key,index)=><div key={key} data-layout-key={key} className={`module-priority-item${dragging===key?' layout-dragging':''}`}>
      <Button className="module-priority-handle layout-drag-handle" type="button" aria-label={`拖动${labels[key]??key}排序`} onPointerDown={event=>{
       if(event.button!==0||activeDrag.current)return
       activeDrag.current={key,pointerId:event.pointerId};lastTarget.current=key;setDragging(key)
       event.currentTarget.setPointerCapture(event.pointerId)
      }} onPointerMove={event=>{if(activeDrag.current?.pointerId===event.pointerId)movePointer(event.clientX,event.clientY)}} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>☰</Button>
      <strong>{labels[key]??key}</strong>
      <Button type="button" aria-label={`上移${labels[key]??key}`} disabled={index===0} onClick={()=>onChange(moveLayoutItem(order,key,order[index-1]))}>↑</Button>
      <Button type="button" aria-label={`下移${labels[key]??key}`} disabled={index===order.length-1} onClick={()=>onChange(moveLayoutItem(order,key,order[index+1],true))}>↓</Button>
     </div>)}
    </div>
    <Button type="button" className="ghost-button" onClick={()=>onChange([...defaults])}>恢复默认</Button>
   </div>
  </section>
 </div>
}
