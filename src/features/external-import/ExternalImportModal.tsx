import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import type { ExternalImportController } from './useExternalImport'

type Props = { controller: ExternalImportController }

export function ExternalImportModal({controller}:Props) {
  const { externalImportOpen, externalImportStage, didaImportPreview, forestImportPreview, externalImportBusy, externalImportMessage, externalImportInputRef, closeExternalImport, setExternalImportStage, setDidaImportPreview, setForestImportPreview, setExternalImportMessage, inspectGenericCsv, inspectDidaCsv, inspectForestCsv, importForestCsv, importDidaCsv } = controller
  if (!externalImportOpen) return null
  return (
<div className="modal-layer external-import-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭外部导入" onClick={closeExternalImport} />
          <section className="task-editor external-import-modal" role="dialog" aria-modal="true" aria-label="从外部导入">
            <DialogHeader title={<>从外部导入</>} eyebrow={<>IMPORT</>} actions={<><Button className="close-button" type="button" onClick={closeExternalImport} disabled={externalImportBusy}>×</Button></>} />
            <div className="editor-body">
              {externalImportStage==='sources' && <>
                <p className="external-import-intro">外部数据会适配 Zing 的数据模型；Zing 没有的字段不会强行保存，需要时请回原 App 查看。</p>
                <Button className="import-source-card" type="button" onClick={()=>{setExternalImportStage('generic-file');setExternalImportMessage('')}}>
                  <span className="import-source-icon">CSV</span><span><strong>通用导入 CSV</strong><small>自动识别常见任务字段；兼容滴答清单等 CSV 导出</small></span><b>›</b>
                </Button>
                <Button className="import-source-card" type="button" onClick={()=>{setExternalImportStage('dida-file');setExternalImportMessage('')}}>
                  <span className="import-source-icon">滴</span><span><strong>滴答清单</strong><small>导入历史任务</small></span><b>›</b>
                </Button>
                <Button className="import-source-card" type="button" onClick={()=>{setExternalImportStage('forest-file');setExternalImportMessage('')}}>
                  <span className="import-source-icon">F</span><span><strong>Forest</strong><small>导入历史专注时间与标签</small></span><b>›</b>
                </Button>
                <div className="import-source-placeholder"><strong>其他来源</strong><small>以后可以继续添加 Todoist、Microsoft To Do 或其他格式，不需要改动这个入口。</small></div>
              </>}
              {externalImportStage==='generic-file' && <>
                <Button className="import-back-link" type="button" onClick={()=>setExternalImportStage('sources')}>‹ 返回来源</Button>
                <div className="import-file-panel">
                  <strong>通用 CSV</strong>
                  <p>自动识别标题、日期、完成状态、描述/备注、子任务、分类/标签、优先级和时间等常见中英文列名。无法映射的列会忽略。</p>
                  <Button variant="primary" className="save-button" type="button" disabled={externalImportBusy} onClick={()=>externalImportInputRef.current?.click()}>{externalImportBusy?'正在解析…':'选择 CSV 文件'}</Button>
                  <input ref={externalImportInputRef} className="backup-file-input" type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)void inspectGenericCsv(file)}} />
                </div>
              </>}
              {externalImportStage==='generic-preview' && didaImportPreview && <>
                <Button className="import-back-link" type="button" onClick={()=>{setExternalImportStage('generic-file');setDidaImportPreview(null)}}>‹ 重新选择</Button>
                <div className="import-preview-header"><strong>{didaImportPreview.fileName}</strong><small>字段识别完成，确认后才写入 Zing。</small></div>
                <div className="import-preview-grid">
                  <span>识别记录<b>{didaImportPreview.total}</b></span>
                  <span>将导入<b>{didaImportPreview.tasks.length}</b></span>
                  <span>重复跳过<b>{didaImportPreview.duplicateCount}</b></span>
                  <span>无日期跳过<b>{didaImportPreview.skippedNoDate}</b></span>
                </div>
                <div className="import-rule-note">
                  <strong>通用映射</strong>
                  <p>标题和日期为必需字段；完成状态、备注/描述、子任务、分类/标签、优先级和时间会在存在时自动迁入。无法识别的列直接忽略。历史完成任务若没有独立完成时间，则以任务日期作为完成日期。通用导入任务会带系统来源标签「从外部导入」和「通用」。</p>
                </div>
                <div className="backup-restore-actions">
                  <Button type="button" onClick={closeExternalImport} disabled={externalImportBusy}>取消</Button>
                  <Button variant="primary" className="primary" type="button" onClick={()=>void importDidaCsv()} disabled={externalImportBusy||!didaImportPreview.tasks.length}>{externalImportBusy?'正在导入…':`导入 ${didaImportPreview.tasks.length} 条`}</Button>
                </div>
              </>}
              {externalImportStage==='forest-file' && <>
                <Button className="import-back-link" type="button" onClick={()=>setExternalImportStage('sources')}>‹ 返回来源</Button>
                <div className="import-file-panel">
                  <strong>Forest CSV</strong>
                  <p>导入 Forest 历史专注。保留开始时间、结束时间和标签；「未设置」归入默认标签，不存在的标签会自动创建为专注标签；已有同名的其他专属标签会扩展为共享标签。</p>
                  <Button variant="primary" className="save-button" type="button" disabled={externalImportBusy} onClick={()=>externalImportInputRef.current?.click()}>{externalImportBusy?'正在解析…':'选择 Forest CSV'}</Button>
                  <input ref={externalImportInputRef} className="backup-file-input" type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)void inspectForestCsv(file)}} />
                </div>
              </>}
              {externalImportStage==='forest-preview' && forestImportPreview && <>
                <Button className="import-back-link" type="button" onClick={()=>{setExternalImportStage('forest-file');setForestImportPreview(null)}}>‹ 重新选择</Button>
                <div className="import-preview-header"><strong>{forestImportPreview.fileName}</strong><small>解析完成，确认后才会写入 Zing 专注记录。</small></div>
                <div className="import-preview-grid">
                  <span>识别记录<b>{forestImportPreview.total}</b></span>
                  <span>将导入<b>{forestImportPreview.sessions.length}</b></span>
                  <span>重复跳过<b>{forestImportPreview.duplicateCount}</b></span>
                  <span>失败跳过<b>{forestImportPreview.failedCount}</b></span>
                  <span>无效时间<b>{forestImportPreview.invalidCount}</b></span>
                  <span>新建标签<b>{forestImportPreview.createdTagCount}</b></span>
                  <span>复用标签<b>{forestImportPreview.reusedTagCount}</b></span>
                </div>
                <div className="import-rule-note">
                  <strong>Forest 映射</strong>
                  <p>仅导入 Is Success=True 的记录；False 直接跳过。Start Time / End Time 转为实际专注时间，Forest Tag 保留；「未设置」使用默认标签。不存在的普通标签自动创建为专注标签；已有同名的其他专属标签自动扩展为共享标签。每条记录附加系统来源标签「从外部导入」和「Forest」。Tree Type 与 Note 不迁移。同一条 Forest 记录重复导入会自动跳过。</p>
                </div>
                <div className="backup-restore-actions">
                  <Button type="button" onClick={closeExternalImport} disabled={externalImportBusy}>取消</Button>
                  <Button variant="primary" className="primary" type="button" onClick={()=>void importForestCsv()} disabled={externalImportBusy||!forestImportPreview.sessions.length}>{externalImportBusy?'正在导入…':`导入 ${forestImportPreview.sessions.length} 条`}</Button>
                </div>
              </>}
              {externalImportStage==='dida-file' && <>
                <Button className="import-back-link" type="button" onClick={()=>setExternalImportStage('sources')}>‹ 返回来源</Button>
                <div className="import-file-panel">
                  <strong>滴答清单 CSV</strong>
                  <p>只导入 Zing 能表达的任务字段。滴答内部附件路径会被丢弃，不占用备注；导入记录会自动带系统来源标签「从外部导入」和「滴答清单」。</p>
                  <Button variant="primary" className="save-button" type="button" disabled={externalImportBusy} onClick={()=>externalImportInputRef.current?.click()}>{externalImportBusy?'正在解析…':'选择 CSV 文件'}</Button>
                  <input ref={externalImportInputRef} className="backup-file-input" type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)void inspectDidaCsv(file)}} />
                </div>
              </>}
              {externalImportStage==='dida-preview' && didaImportPreview && <>
                <Button className="import-back-link" type="button" onClick={()=>{setExternalImportStage('dida-file');setDidaImportPreview(null)}}>‹ 重新选择</Button>
                <div className="import-preview-header"><strong>{didaImportPreview.fileName}</strong><small>解析完成，确认后才会写入 Zing。</small></div>
                <div className="import-preview-grid">
                  <span>识别记录<b>{didaImportPreview.total}</b></span>
                  <span>将导入<b>{didaImportPreview.tasks.length}</b></span>
                  <span>重复跳过<b>{didaImportPreview.duplicateCount}</b></span>
                  <span>无日期跳过<b>{didaImportPreview.skippedNoDate}</b></span>
                  <span>附件路径丢弃<b>{didaImportPreview.strippedAttachmentCount}</b></span>
                  <span>清单型任务<b>{didaImportPreview.ignoredChecklistCount}</b></span>
                </div>
                <div className="import-rule-note">
                  <strong>本次规则</strong>
                  <p>标题、日期/时间、优先级、状态、完成时间、备注、重复规则与可识别标签会迁入；Zing 不支持的字段直接忽略。清单型任务保留文字内容，但不保留滴答的清单结构。系统来源标签由程序维护；滴答导入任务会标记「从外部导入」和「滴答清单」，普通任务不会出现这些来源标签。</p>
                </div>
                <div className="backup-restore-actions">
                  <Button type="button" onClick={closeExternalImport} disabled={externalImportBusy}>取消</Button>
                  <Button variant="primary" className="primary" type="button" onClick={()=>void importDidaCsv()} disabled={externalImportBusy || didaImportPreview.tasks.length===0}>{externalImportBusy?'正在导入…':`导入 ${didaImportPreview.tasks.length} 条`}</Button>
                </div>
              </>}
              {externalImportMessage && <div className="backup-status" role="status">{externalImportMessage}</div>}
            </div>
          </section>
        </div>
  )
}
