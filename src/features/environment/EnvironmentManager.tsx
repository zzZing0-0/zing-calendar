import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { sortEnvironmentOptionsBuiltinsFirst } from '../../domain/environment'
import type { EnvironmentOption } from '../../types'

export interface EnvironmentManagerProps {
  addEnvironmentOption: (kind: "weather" | "thermal") => void
  deleteEnvironmentOption: (kind: "weather" | "thermal", item: EnvironmentOption) => void
  editEnvironmentEmoji: (kind: "weather" | "thermal", item: EnvironmentOption) => void
  environmentManagerKind: "weather" | "thermal" | null
  environmentOptionUsed: (kind: "weather" | "thermal", id: string) => boolean
  moveEnvironmentOption: (kind: "weather" | "thermal", item: EnvironmentOption, direction: 1 | -1) => void
  renameEnvironmentOption: (kind: "weather" | "thermal", item: EnvironmentOption) => void
  setEnvironmentManagerKind: React.Dispatch<React.SetStateAction<"weather" | "thermal" | null>>
  thermalOptions: EnvironmentOption[]
  toggleArchiveEnvironmentOption: (kind: "weather" | "thermal", item: EnvironmentOption) => void
  weatherOptions: EnvironmentOption[]
}

export function EnvironmentManager({
  addEnvironmentOption,
  deleteEnvironmentOption,
  editEnvironmentEmoji,
  environmentManagerKind,
  environmentOptionUsed,
  moveEnvironmentOption,
  renameEnvironmentOption,
  setEnvironmentManagerKind,
  thermalOptions,
  toggleArchiveEnvironmentOption,
  weatherOptions
}: EnvironmentManagerProps) {
  return <>
{environmentManagerKind && (()=> {
        const kind=environmentManagerKind
        const label=kind==='weather'?'天气':'体感'
        const rows=kind==='weather'?weatherOptions:thermalOptions
        return <div className="modal-layer environment-manager-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label={`关闭${label}管理`} onClick={()=>setEnvironmentManagerKind(null)} />
          <section className="task-editor environment-manager" role="dialog" aria-modal="true" aria-label={`管理${label}`}>
            <DialogHeader title={<>管理{label}</>} eyebrow={<>ENVIRONMENT</>} actions={<><Button className="close-button" type="button" onClick={()=>setEnvironmentManagerKind(null)}>×</Button></>} />
            <div className="editor-body environment-manager-body">
              <section className="environment-option-group">
                <div className="environment-option-heading"><div><strong>{label}</strong><small>每日单选 · 可不记录</small></div><Button variant="primary" type="button" className="save-button compact" onClick={()=>addEnvironmentOption(kind)}>＋ 添加</Button></div>
                <div className="environment-option-list">
                  {sortEnvironmentOptionsBuiltinsFirst(rows.filter(item=>!item.deletedAt)).map((item,index,shown)=><div className={`environment-option-row${item.archived?' archived':''}${item.builtin?' builtin':''}`} key={item.id}>
                    {item.builtin
                      ? <><span className="environment-option-emoji readonly">{item.emoji||'—'}</span><span className="environment-option-name readonly">{item.name}</span></>
                      : <>
                          <Button type="button" className="environment-option-emoji editable" title="修改 Emoji" onClick={()=>editEnvironmentEmoji(kind,item)}>{item.emoji||'＋'}</Button>
                          <Button type="button" className="environment-option-name editable" title="修改名称" onClick={()=>renameEnvironmentOption(kind,item)}>{item.name}</Button>
                          <div className="environment-option-actions compact">
                            <Button type="button" disabled={index===0} onClick={()=>moveEnvironmentOption(kind,item,-1)} aria-label="上移">↑</Button>
                            <Button type="button" disabled={index===shown.length-1} onClick={()=>moveEnvironmentOption(kind,item,1)} aria-label="下移">↓</Button>
                            <Button type="button" onClick={()=>toggleArchiveEnvironmentOption(kind,item)}>{item.archived?'恢复':'归档'}</Button>
                            {!environmentOptionUsed(kind,item.id)&&<Button variant="danger" type="button" className="danger-text" onClick={()=>deleteEnvironmentOption(kind,item)}>删除</Button>}
                          </div>
                        </>
                    }
                  </div>)}
                </div>
              </section>
            </div>
          </section>
        </div>
      })()}
  </>
}
