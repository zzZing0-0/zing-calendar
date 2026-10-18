import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { Field } from '../../components/ui/Field'
import {
  ANNIVERSARY_TYPES, anniversaryDayLimit
} from '../../domain/calendar'
import type { AnniversaryDraft } from '../../types'

export interface AnniversaryEditorProps {
  anniversaryDraft: AnniversaryDraft
  anniversaryEditorOpen: boolean
  deleteAnniversary: () => void
  editingAnniversaryId: string | null
  saveAnniversary: () => void
  setAnniversaryDraft: React.Dispatch<React.SetStateAction<AnniversaryDraft>>
  setAnniversaryEditorOpen: React.Dispatch<React.SetStateAction<boolean>>
  today: Date
}

export function AnniversaryEditor({
  anniversaryDraft,
  anniversaryEditorOpen,
  deleteAnniversary,
  editingAnniversaryId,
  saveAnniversary,
  setAnniversaryDraft,
  setAnniversaryEditorOpen,
  today
}: AnniversaryEditorProps) {
  return <>
{anniversaryEditorOpen && (
        <div className="modal-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭纪念日编辑" onClick={() => setAnniversaryEditorOpen(false)} />
          <section className="task-editor anniversary-editor" role="dialog" aria-modal="true" aria-labelledby="anniversary-editor-title">
            <DialogHeader titleId="anniversary-editor-title" title={<>{editingAnniversaryId ? '编辑纪念日' : '新建纪念日'}</>} eyebrow={<>ANNIVERSARY</>} actions={<><Button className="close-button" type="button" onClick={() => setAnniversaryEditorOpen(false)}>×</Button></>} />
            <div className="editor-body">
              <Field className="field"><span>名称</span><input value={anniversaryDraft.title} onChange={e=>setAnniversaryDraft(d=>({...d,title:e.target.value}))} placeholder="例如：小A生日" autoFocus /></Field>
              <div className="anniversary-type-grid">{ANNIVERSARY_TYPES.map(item=><Button key={item.value} type="button" className={`anniversary-type-button${anniversaryDraft.type===item.value?' selected':''}`} onClick={()=>setAnniversaryDraft(d=>({...d,type:item.value,repeatYearly:item.value==='birthday'?true:d.repeatYearly,year:item.value!=='birthday'&&!d.year?String(today.getFullYear()):d.year}))}><span>{item.icon}</span>{item.label}</Button>)}</div>
              <div className="segmented-control"><Button type="button" className={anniversaryDraft.calendar==='solar'?'active':''} onClick={()=>setAnniversaryDraft(d=>({...d,calendar:'solar',isLeapMonth:false}))}>公历</Button><Button type="button" className={anniversaryDraft.calendar==='lunar'?'active':''} onClick={()=>setAnniversaryDraft(d=>({...d,calendar:'lunar'}))}>农历</Button></div>
              <div className="anniversary-date-grid">
                <Field className="field"><span>年份{anniversaryDraft.type==='birthday'?'（可选）':''}</span><select value={anniversaryDraft.year} onChange={e=>setAnniversaryDraft(d=>({...d,year:e.target.value}))}>{anniversaryDraft.type==='birthday'&&<option value="">——</option>}{Array.from({length:today.getFullYear()+20-1900+1},(_,i)=>today.getFullYear()+20-i).map(year=><option key={year} value={year}>{year}年</option>)}</select></Field>
                <Field className="field"><span>月</span><select value={anniversaryDraft.month} onChange={e=>setAnniversaryDraft(d=>({...d,month:Number(e.target.value)}))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}月</option>)}</select></Field>
                <Field className="field"><span>日</span><select value={anniversaryDraft.day} onChange={e=>setAnniversaryDraft(d=>({...d,day:Number(e.target.value)}))}>{Array.from({length:anniversaryDayLimit(anniversaryDraft.calendar,anniversaryDraft.month,anniversaryDraft.year?Number(anniversaryDraft.year):undefined)},(_,i)=><option key={i+1} value={i+1}>{i+1}日</option>)}</select></Field>
              </div>
              {anniversaryDraft.calendar==='lunar' && <Field className="anniversary-check"><input type="checkbox" checked={anniversaryDraft.isLeapMonth} onChange={e=>setAnniversaryDraft(d=>({...d,isLeapMonth:e.target.checked}))} /> 闰月</Field>}
              {anniversaryDraft.type!=='birthday' && <Field className="anniversary-check"><input type="checkbox" checked={anniversaryDraft.repeatYearly} onChange={e=>setAnniversaryDraft(d=>({...d,repeatYearly:e.target.checked}))} /> 每年重复</Field>}
              <Field className="field"><span>备注</span><textarea rows={3} value={anniversaryDraft.notes} onChange={e=>setAnniversaryDraft(d=>({...d,notes:e.target.value}))} placeholder="可选" /></Field>
            </div>
            <div className="editor-actions">{editingAnniversaryId && <Button className="danger-button" type="button" onClick={deleteAnniversary}>删除</Button>}<Button className="ghost-button" type="button" onClick={()=>setAnniversaryEditorOpen(false)}>取消</Button><Button variant="primary" className="save-button" type="button" onClick={saveAnniversary} disabled={!anniversaryDraft.title.trim() || (anniversaryDraft.type!=='birthday' && !anniversaryDraft.year)}>保存</Button></div>
          </section>
        </div>
      )}
  </>
}
