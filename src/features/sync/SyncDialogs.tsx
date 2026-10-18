import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { Field } from '../../components/ui/Field'
import { clearGitHubDeviceCredential } from '../../db/calendar'
import { syncPreviewRowsByModule } from '../../domain/layoutPreferences'
import { syncEntityLabel } from './syncLabels'

export interface SyncDialogsProps {
  executeGithubSync: (automatic?: boolean) => Promise<void>
  githubSyncBranch: string
  githubSyncBusy: boolean
  githubSyncMessage: string
  githubSyncMessageKind: "idle" | "working" | "success" | "error"
  githubSyncOpen: boolean
  githubSyncOwner: string
  githubSyncPreview: { initializedRemote: boolean; rows: { entityType: string; localCount: number; remoteCount: number; mergedCount: number; added: number; updated: number; deleted: number; }[]; } | null
  githubSyncRepo: string
  githubSyncToken: string
  githubTokenSaved: boolean
  lastGithubSyncAt: string
  moduleOrder: ("task" | "note" | "habit" | "journal" | "anniversary" | "focus")[]
  runGithubSync: (automatic?: boolean) => Promise<void>
  setGithubSyncBranch: React.Dispatch<React.SetStateAction<string>>
  setGithubSyncMessage: React.Dispatch<React.SetStateAction<string>>
  setGithubSyncMessageKind: React.Dispatch<React.SetStateAction<"idle" | "working" | "success" | "error">>
  setGithubSyncOpen: React.Dispatch<React.SetStateAction<boolean>>
  setGithubSyncOwner: React.Dispatch<React.SetStateAction<string>>
  setGithubSyncPreview: React.Dispatch<React.SetStateAction<{ initializedRemote: boolean; rows: { entityType: string; localCount: number; remoteCount: number; mergedCount: number; added: number; updated: number; deleted: number; }[]; } | null>>
  setGithubSyncRepo: React.Dispatch<React.SetStateAction<string>>
  setGithubSyncToken: React.Dispatch<React.SetStateAction<string>>
  setGithubTokenSaved: React.Dispatch<React.SetStateAction<boolean>>
}

export function SyncDialogs({
  executeGithubSync,
  githubSyncBranch,
  githubSyncBusy,
  githubSyncMessage,
  githubSyncMessageKind,
  githubSyncOpen,
  githubSyncOwner,
  githubSyncPreview,
  githubSyncRepo,
  githubSyncToken,
  githubTokenSaved,
  lastGithubSyncAt,
  moduleOrder,
  runGithubSync,
  setGithubSyncBranch,
  setGithubSyncMessage,
  setGithubSyncMessageKind,
  setGithubSyncOpen,
  setGithubSyncOwner,
  setGithubSyncPreview,
  setGithubSyncRepo,
  setGithubSyncToken,
  setGithubTokenSaved
}: SyncDialogsProps) {
  return <>
{githubSyncOpen && (
        <div className="modal-layer github-sync-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭 GitHub Sync" onClick={()=>setGithubSyncOpen(false)} />
          <section className="task-editor github-sync-modal" role="dialog" aria-modal="true" aria-label="GitHub Sync">
            <DialogHeader title={<>GitHub Sync</>} eyebrow={<>SYNC</>} actions={<><Button className="close-button" type="button" onClick={()=>setGithubSyncOpen(false)}>×</Button></>} />
            <div className="editor-body github-sync-body">
              <p className="github-sync-intro">Zing 仍以本地数据为主。同步时会先合并 Private Repository 中的数据，再写回云端。</p>
              <Field><span>GitHub 用户名</span><input value={githubSyncOwner} onChange={e=>setGithubSyncOwner(e.target.value)} autoCapitalize="none" /></Field>
              <Field><span>数据仓库</span><input value={githubSyncRepo} onChange={e=>setGithubSyncRepo(e.target.value)} autoCapitalize="none" /></Field>
              <Field><span>分支</span><input value={githubSyncBranch} onChange={e=>setGithubSyncBranch(e.target.value)} autoCapitalize="none" /></Field>
              <Field><span>Fine-grained Token</span><input type="password" value={githubSyncToken} onChange={e=>{setGithubSyncToken(e.target.value);setGithubTokenSaved(false)}} autoComplete="off" placeholder="github_pat_…" /></Field>
              <div className="github-sync-security">🔐 {githubTokenSaved?'此设备已保存 Token。它只保存在本设备 IndexedDB 的同步凭据区，不进入备份或 GitHub 数据仓库。':'同步成功后会将 Token 保存到本设备，下次打开无需重新输入。'}</div>
              {githubTokenSaved && <Button className="github-sync-credential-remove" type="button" onClick={()=>void clearGitHubDeviceCredential().then(()=>{setGithubSyncToken('');setGithubTokenSaved(false);setGithubSyncMessage('已移除此设备保存的 Token');setGithubSyncMessageKind('idle')})}>移除此设备 Token</Button>}
              {githubSyncMessage && <div className={`github-sync-status ${githubSyncMessageKind}`} role="status" aria-live="polite">{githubSyncMessage}</div>}
              <Button variant="primary" className="github-sync-now" type="button" disabled={githubSyncBusy} onClick={()=>void runGithubSync()}>{githubSyncBusy?'正在同步…':'立即同步'}</Button>
              {lastGithubSyncAt && <small className="github-sync-last">上次成功：{new Date(lastGithubSyncAt).toLocaleString()}</small>}
            </div>
          </section>
        </div>
      )}

{githubSyncPreview && (
        <div className="modal-layer github-sync-summary-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="取消同步" onClick={()=>setGithubSyncPreview(null)} />
          <section className="task-editor github-sync-summary-modal" role="dialog" aria-modal="true" aria-label="确认同步">
            <DialogHeader title={<>确认同步</>} eyebrow={<>SYNC PREVIEW</>} actions={<><Button className="close-button" type="button" onClick={()=>setGithubSyncPreview(null)}>×</Button></>} />
            <div className="editor-body">
              <p className="sync-summary-time">{githubSyncPreview.initializedRemote?'服务器还没有同步数据；确认后将以本机数据初始化。':'以下只显示本次存在变化的数据。确认后才会合并并写回。'}</p>
              {(() => {
                const changedRows=syncPreviewRowsByModule(githubSyncPreview.rows.filter(row=>row.added||row.updated||row.deleted||row.localCount!==row.remoteCount||row.localCount!==row.mergedCount||row.remoteCount!==row.mergedCount),moduleOrder)
                return changedRows.length ? <>
                  <div className="sync-summary-grid">
                    {changedRows.map(row=><div className="sync-summary-row sync-preview-count-row" key={row.entityType}><b>{syncEntityLabel(row.entityType)}</b><span>本机 {row.localCount}</span><span>服务器 {row.remoteCount}</span><span>合并后 {row.mergedCount}</span></div>)}
                  </div>
                  <div className="sync-change-summary">
                    <b>本次变化</b>
                    {changedRows.map(row=>{
                      const changes=[row.added?`增加 ${row.added}`:'',row.updated?`更新 ${row.updated}`:'',row.deleted?`删除 ${row.deleted}`:''].filter(Boolean)
                      return changes.length?<div className="sync-change-row" key={row.entityType}><span>{syncEntityLabel(row.entityType)}</span><span>{changes.join('　')}</span></div>:null
                    })}
                  </div>
                </> : <div className="sync-summary-empty"><b>两端数据一致，无需合并</b></div>
              })()}
              <div className="editor-actions sync-preview-actions">
                <Button variant="secondary" type="button" className="secondary-button" onClick={()=>setGithubSyncPreview(null)}>取消</Button>
                <Button variant="primary" type="button" className="github-sync-now" onClick={()=>{setGithubSyncPreview(null);void executeGithubSync(false)}}>确认同步</Button>
              </div>
            </div>
          </section>
        </div>
      )}
  </>
}
