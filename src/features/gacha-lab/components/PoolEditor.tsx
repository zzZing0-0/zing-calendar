import { useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { clone, fmt } from '../../../domain/gacha/types'
import type { Config, GachaState, Trade } from '../../../domain/gacha/types'
import { backupExport, configExport, download } from '../storage'
import { RewardEditor } from './RewardEditor'
import { TradeEditor } from './TradeEditor'
function draftFor(config: Config) {
  const c = clone(config), grouped = new Map<string, Trade>()
  for (const t of c.trades) {
    const key = [t.from, t.cost, t.qty, !!t.repeat].join('|'), existing = grouped.get(key)
    if (existing) existing.rewardIds = [...new Set([...existing.rewardIds, ...t.rewardIds])]
    else grouped.set(key, t)
  }
  c.trades = [...grouped.values()]; return c
}
export function PoolEditor({ state, onSelect, onAdd, onRemove, onSave, onImport, onMessage, message }: {
  state: GachaState; onSelect: (id: string) => void; onAdd: (copy: boolean) => void; onRemove: (id: string) => void
  onSave: (c: Config) => boolean; onImport: (v: unknown) => void; onMessage: (s: string) => void; message: string
}) {
  const pool = state.pools.find(p => p.id === state.active)!, [c, setConfig] = useState(() => draftFor(pool.config))
  const file = useRef<HTMLInputElement>(null)
  const sum = c.rewards.reduce((s, r) => s + Math.round((Number(r.p) || 0) * 1000000), 0) / 1000000
  return <main id="editor"><section className="panel"><h2>🗂️ 奖池管理</h2><p className="muted small">点击下方奖池即可切换并编辑；复制的奖池也会出现在这里。删除按钮只删除对应奖池。</p>
    <div id="poolManagerList" className="pool-manager-list">{state.pools.map(p => <div key={p.id} className={'pool-manager-entry' + (p.id === state.active ? ' current' : '')}><div><strong>{p.config.name}</strong><div className="muted small">{p.id === state.active ? '✓ 当前奖池 · ' : ''}{fmt(p.draws)} 抽</div></div><div className="toolbar"><Button onClick={() => { onSelect(p.id); setConfig(draftFor(p.config)); onMessage('') }}>{p.id === state.active ? '正在编辑' : '切换/编辑'}</Button><Button variant="danger" disabled={state.pools.length === 1} onClick={() => onRemove(p.id)}>删除</Button></div></div>)}</div>
    <div className="toolbar"><Button id="newPool" onClick={() => onAdd(false)}>＋ 新建</Button><Button id="copyPool" onClick={() => onAdd(true)}>复制当前配置</Button><Button id="deletePool" variant="danger" onClick={() => onRemove(pool.id)}>删除当前奖池</Button>
      <Button id="exportConfig" onClick={() => download('gacha-v1.22-pool-config.json', configExport(pool.config))}>导出配置</Button><Button id="exportBackup" onClick={() => download('gacha-v1.22-full-backup.json', backupExport(state))}>完整备份</Button><Button id="importBtn" onClick={() => file.current?.click()}>导入 JSON</Button>
      <input id="importFile" ref={file} hidden type="file" accept=".json,application/json" onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { onImport(JSON.parse(await f.text())) } catch (err) { onMessage('导入失败：' + (err instanceof Error ? err.message : '无效文件')) } }}/>
    </div><p className="muted small">修改配置后直接覆盖当前配置，不保留旧配置版本。编辑表单内容在保存前不会生效。</p></section>
    <section className="panel"><h2>⚙️ 奖池基本设置</h2><div className="formgrid">
      <Field>奖池名称<input id="fName" value={c.name} onChange={e => setConfig({ ...c, name: e.target.value })}/></Field>
      <Field>描述<input id="fDesc" value={c.description || ''} onChange={e => setConfig({ ...c, description: e.target.value })}/></Field>
      <Field>货币名称<input id="fCurrency" value={c.currency} onChange={e => setConfig({ ...c, currency: e.target.value })}/></Field>
      <Field>单抽价格<input id="fPrice" type="number" min="0" step="any" value={Number.isNaN(c.price) ? '' : c.price} onChange={e => setConfig({ ...c, price: Number(e.target.value) })}/></Field>
      <Field>每多少货币 = 1元（留空不换算）<input id="fRate" type="number" min="0" step="any" value={c.rate ?? ''} onChange={e => setConfig({ ...c, rate: e.target.value ? Number(e.target.value) : null })}/></Field>
      <Field>重点奖励<select id="fTarget" value={c.target || ''} onChange={e => setConfig({ ...c, target: e.target.value || null })}><option value="">不设置</option>{c.rewards.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select></Field>
    </div></section><section className="panel"><RewardEditor config={c} onChange={setConfig}/><TradeEditor config={c} onChange={setConfig} onMessage={onMessage}/>
      <p id="probStatus" className={Math.abs(sum-100)<1e-9 ? 'ok' : 'warning'}>概率合计 {sum.toFixed(6)}% · {Math.abs(sum-100)<1e-9 ? '✓ 可用' : '差额 ' + (100-sum).toFixed(6) + '%'}</p>
      <div className="toolbar"><Button id="savePool" variant="primary" onClick={() => { if (onSave(c)) setConfig(draftFor(c)) }}>💾 保存并启用配置</Button><Button id="cancelEdit" onClick={() => { setConfig(draftFor(pool.config)); onMessage('') }}>放弃未保存修改</Button></div>
      {message && <div id="saveFeedback" role="status" className={'save-feedback' + (/无效|失败|无法|不足|错误/.test(message) ? ' warning' : '')}>{message}</div>}
    </section></main>
}
