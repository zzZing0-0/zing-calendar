import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import type { BackupPreview } from '../../types'

export interface BackupDialogsProps {
  backupPreview: BackupPreview | null
  backupRestoring: boolean
  exportAnniversariesCsv: () => void
  exportFocusCsv: () => void
  exportJournalsCsv: () => void
  exportTasksCsv: () => void
  plainExportOpen: boolean
  resetAllUserData: () => Promise<void>
  resetDataConfirm: boolean
  resettingData: boolean
  restoreBackup: () => Promise<void>
  setBackupPreview: React.Dispatch<React.SetStateAction<BackupPreview | null>>
  setPlainExportOpen: React.Dispatch<React.SetStateAction<boolean>>
  setResetDataConfirm: React.Dispatch<React.SetStateAction<boolean>>
}

export function BackupDialogs({
  backupPreview,
  backupRestoring,
  exportAnniversariesCsv,
  exportFocusCsv,
  exportJournalsCsv,
  exportTasksCsv,
  plainExportOpen,
  resetAllUserData,
  resetDataConfirm,
  resettingData,
  restoreBackup,
  setBackupPreview,
  setPlainExportOpen,
  setResetDataConfirm
}: BackupDialogsProps) {
  return <>
{plainExportOpen && (
        <div className="modal-layer plain-export-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭通用导出" onClick={()=>setPlainExportOpen(false)} />
          <section className="task-editor plain-export-modal" role="dialog" aria-modal="true" aria-label="通用导出">
            <DialogHeader title={<>通用导出</>} eyebrow={<>EXPORT</>} actions={<><Button className="close-button" type="button" onClick={()=>setPlainExportOpen(false)}>×</Button></>} />
            <div className="editor-body">
              <p className="external-import-intro">选择要单独导出的重要数据。CSV 便于用 Numbers、Excel 等查看；完整保存与恢复仍请使用“备份”。</p>
              <div className="plain-export-actions plain-export-modal-actions">
                <Button type="button" onClick={exportTasksCsv}><span>任务 CSV</span><b>↓</b></Button>
                <Button type="button" onClick={exportJournalsCsv}><span>记录 CSV</span><b>↓</b></Button>
                <Button type="button" onClick={exportFocusCsv}><span>专注 CSV</span><b>↓</b></Button>
                <Button type="button" onClick={exportAnniversariesCsv}><span>纪念日 CSV</span><b>↓</b></Button>
              </div>
            </div>
          </section>
        </div>
      )}

{resetDataConfirm && (
        <div className="backup-restore-backdrop" role="presentation">
          <section className="backup-restore-modal reset-data-modal" role="dialog" aria-modal="true" aria-label="确认清空所有数据">
            <span className="eyebrow">RESET DATA</span><h2>清空所有数据？</h2>
            <p className="backup-restore-warning">任务、记录、笔记、Daily Mood、精力、经期、纪念日、专注记录、自建标签和附件都会被永久清空；应用设置与系统默认标签保留。删除会在下次 GitHub 同步传播到其他设备。此操作不可撤销，建议先导出完整备份。</p>
            <div className="backup-restore-actions">
              <Button type="button" onClick={()=>setResetDataConfirm(false)} disabled={resettingData}>取消</Button>
              <Button className="danger-confirm" type="button" onClick={()=>void resetAllUserData()} disabled={resettingData}>{resettingData?'正在清空…':'确认清空'}</Button>
            </div>
          </section>
        </div>
      )}

{backupPreview && (
        <div className="backup-restore-backdrop" role="presentation">
          <section className="backup-restore-modal" role="dialog" aria-modal="true" aria-label="确认恢复备份">
            <h2>Zing Backup</h2>
            <p className="backup-restore-date">{new Date(backupPreview.manifest.exportedAt).toLocaleString()}</p>
            <div className="backup-summary-grid">
              <span>任务 <b>{backupPreview.tasks.length}</b></span><span>记录 <b>{backupPreview.journals.length}</b></span>
              <span>心情 <b>{backupPreview.moods.length}</b></span><span>精力 <b>{backupPreview.energies.length}</b></span><span>天气/体感 <b>{backupPreview.environments.length}</b></span>
              <span>经期 <b>{backupPreview.periods.length}</b></span><span>标签 <b>{backupPreview.tags.length}</b></span>
              <span>纪念日 <b>{backupPreview.anniversaries.length}</b></span><span>专注 <b>{backupPreview.focusSessions.length}</b></span>
              <span>附件 <b>{backupPreview.attachments.length}</b></span>
            </div>
            <p className="backup-restore-warning">恢复后将替换当前设备中的 Zing Calendar 数据。请确认当前数据已经另行备份。</p>
            <div className="backup-restore-actions">
              <Button type="button" onClick={()=>setBackupPreview(null)} disabled={backupRestoring}>取消</Button>
              <Button variant="primary" className="primary" type="button" onClick={()=>void restoreBackup()} disabled={backupRestoring}>{backupRestoring?'正在恢复…':'恢复此备份'}</Button>
            </div>
          </section>
        </div>
      )}
  </>
}
