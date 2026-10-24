import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { fmt, uid } from '../../../domain/gacha/types'
import type { Config, Reward } from '../../../domain/gacha/types'
export function RewardEditor({ config: c, onChange }: { config: Config; onChange: (c: Config) => void }) {
  const patch = (id: string, values: Partial<Reward>) => onChange({ ...c, rewards: c.rewards.map(r => r.id === id ? { ...r, ...values } : r) })
  const remove = (id: string) => onChange({ ...c, target: c.target === id ? null : c.target,
    rewards: c.rewards.filter(r => r.id !== id).map(r => ({ ...r, convertTo: r.convertTo === id ? null : r.convertTo, ...(r.redeemFrom === id ? { redeemFrom: null, redeemCost: null } : {}) })),
    trades: c.trades.filter(t => t.from !== id).map(t => ({ ...t, rewardIds: t.rewardIds.filter(x => x !== id) })),
  })
  const move = (i: number, dir: number) => { const rewards = [...c.rewards]; [rewards[i], rewards[i+dir]] = [rewards[i+dir], rewards[i]]; onChange({ ...c, rewards }) }
  return <><div className="sectionhead"><h2>🧩 奖励配置</h2><Button id="addReward" onClick={() => onChange({ ...c, rewards: [...c.rewards, { id: uid(), name: '新奖励', category: '其他', p: 0, min: 1, max: 1, collect: false, duplicate: 'keep', convertAmount: 0, convertTo: null, image: null }] })}>＋ 添加奖励</Button></div>
    <p className="muted small">数量采用整数均匀分布；概率支持小数百分比。重复兑换目标可选择其他奖励。</p><div id="rewardRows" className="reward-table">
      <div className="reward-head"><span>奖励名称</span><span>概率 %</span><span>数量范围</span><span>收藏</span><span>重复兑换</span><span>操作</span></div>
      {c.rewards.map((r, i) => <div className="reward-entry" data-reward-row={r.id} key={r.id}><div className="reward-main">
        <input aria-label="奖励名称" data-id={r.id} data-key="name" value={r.name} onChange={e => patch(r.id, { name: e.target.value })}/>
        <input aria-label="概率百分比" type="number" step="0.000001" min="0" value={Number.isNaN(r.p) ? '' : r.p} onChange={e => patch(r.id, { p: e.target.value === '' ? NaN : Number(e.target.value) })}/>
        <div className="reward-range"><input aria-label="最小数量" type="number" min="1" value={Number.isNaN(r.min) ? '' : r.min} onChange={e => patch(r.id, { min: e.target.value === '' ? NaN : Number(e.target.value) })}/><span>–</span><input aria-label="最大数量" type="number" min="1" value={Number.isNaN(r.max) ? '' : r.max} onChange={e => patch(r.id, { max: e.target.value === '' ? NaN : Number(e.target.value) })}/></div>
        <select aria-label="是否收藏" value={String(r.collect)} onChange={e => patch(r.id, { collect: e.target.value === 'true' })}><option value="false">否</option><option value="true">是</option></select>
        <span className="reward-duplicate">{r.collect && r.duplicate === 'convert' && c.rewards.some(x => x.id === r.convertTo) ? `${c.rewards.find(x => x.id === r.convertTo)!.name} ×${fmt(r.convertAmount)}` : '—'}</span>
        <div className="reward-ops"><Button title="填充剩余概率" aria-label={'将剩余概率填入' + r.name} onClick={() => patch(r.id, { p: (100000000 - c.rewards.reduce((s, x) => s + (x.id === r.id ? 0 : Math.round((Number(x.p) || 0) * 1000000)), 0)) / 1000000 })}>%</Button>
          <Button title="上移" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button><Button title="下移" disabled={i === c.rewards.length-1} onClick={() => move(i, 1)}>↓</Button><Button variant="danger" aria-label={'删除' + r.name} onClick={() => remove(r.id)}>×</Button></div>
      </div><details className="reward-more"><summary>高级设置 · {r.category || '其他'}</summary><div className="reward-advanced">
        <Field>类别<input value={r.category || ''} onChange={e => patch(r.id, { category: e.target.value })}/></Field>
        <Field>重复处理<select value={r.duplicate} onChange={e => patch(r.id, { duplicate: e.target.value as Reward['duplicate'] })}><option value="keep">保留</option><option value="convert">兑换</option></select></Field>
        <Field>重复兑换目标<select value={r.convertTo || ''} onChange={e => patch(r.id, { convertTo: e.target.value || null })}><option value="">不设置</option>{c.rewards.filter(x => x.id !== r.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field>每件重复兑换数量<input type="number" min="0" value={Number.isNaN(r.convertAmount) ? '' : r.convertAmount || 0} onChange={e => patch(r.id, { convertAmount: e.target.value === '' ? NaN : Number(e.target.value) })}/></Field>
      </div></details></div>)}
    </div></>
}
