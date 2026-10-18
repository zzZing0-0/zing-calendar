import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { SortableList } from '../../components/ui/SortableList'
import { DAY_SECTION_LABELS, DEFAULT_DAY_SECTION_ORDER, DEFAULT_SETTINGS_GROUP_ORDER, SETTINGS_GROUP_LABELS } from '../../domain/layoutPreferences'

type Props = {kind:'day'|'settings';order:readonly string[];onChange:(order:string[])=>void;onClose:()=>void}

export function LayoutOrderEditor({kind,order,onChange,onClose}:Props){
 const title = kind==='day'?'今日详情排序':'设置页面排序'
 const labels:Record<string,string> = kind==='day'?DAY_SECTION_LABELS:SETTINGS_GROUP_LABELS
 const defaults = kind==='day'?DEFAULT_DAY_SECTION_ORDER:DEFAULT_SETTINGS_GROUP_ORDER
 return <div className="modal-layer layout-order-layer" role="presentation">
  <Button className="modal-backdrop" type="button" aria-label={`关闭${title}`} onClick={onClose}/>
  <section className="task-editor module-priority-dialog unified-sort-dialog" role="dialog" aria-modal="true" aria-label={title}>
   <DialogHeader title={title} eyebrow="LAYOUT" actions={<Button className="close-button" type="button" aria-label={`关闭${title}`} onClick={onClose}>×</Button>} />
   <div className="editor-body">
    <p className="module-priority-hint">长按左侧六点手柄拖动排序；键盘可使用上下方向键。</p>
    {kind==='day'&&<div className="shared-sort-fixed">任务 <small>固定首位</small></div>}
    <SortableList items={order} label={key=>labels[key]??key} onChange={onChange}/>
    <Button type="button" className="shared-sort-restore" onClick={()=>onChange([...defaults])}>恢复默认</Button>
   </div>
  </section>
 </div>
}
