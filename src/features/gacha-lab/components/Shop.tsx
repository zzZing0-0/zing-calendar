import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { balance } from '../../../domain/gacha/inventory'
import { fmt } from '../../../domain/gacha/types'
import type { Pool, Reward, Trade } from '../../../domain/gacha/types'
export function Shop({ pool: p, onTrade }: { pool: Pool; onTrade: (id: string, reward: string, times: number) => void }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const c = p.config
  const action = (t: Trade, dst: Reward) => {
    const blocked = dst.collect && !!p.collection[dst.id] && !t.repeat
    const available = Math.floor(balance(p, t.from) / t.cost)
    const safeMax = Math.floor(Number.MAX_SAFE_INTEGER / Math.max(t.cost, t.qty))
    const max = Math.min(available, safeMax, dst.collect && !t.repeat ? 1 : Number.MAX_SAFE_INTEGER)
    const key = `${t.id}:${dst.id}`
    const raw = quantities[key] ?? '1'
    const times = Number(raw)
    const valid = /^\d+$/.test(raw) && Number.isSafeInteger(times) && times >= 1 && times <= max
    return <div className="shop-exchange-controls">
      <label className="shop-quantity-label">兑换次数<input aria-label={`兑换次数：${dst.name}`} type="number" inputMode="numeric" min="1" max={Math.max(1, max)} step="1" value={raw} onChange={e => setQuantities(prev => ({ ...prev, [key]: e.target.value }))}/></label>
      <Button className="shop-action" data-shop={t.id} data-reward={dst.id} disabled={blocked || !valid} onClick={() => onTrade(t.id, dst.id, times)}>{blocked ? '已收藏' : max < 1 ? '材料不足' : !valid ? '数量无效' : '兑换'}</Button>
      <small className="shop-exchange-total">最多 {fmt(max)} 次 · 消耗 {valid ? fmt(t.cost * times) : '—'} · 获得 {valid ? fmt(t.qty * times) : '—'}</small>
    </div>
  }
  return <section className="panel compact-panel"><h2>🛒 兑换商店</h2><div id="shop">
    {c.trades.length ? <div className="shop-table"><div className="shop-head"><span>消耗</span><span>可兑换奖励</span><span>操作</span></div>{c.trades.map(t => {
      const src = c.rewards.find(r => r.id === t.from), options = t.rewardIds.map(id => c.rewards.find(r => r.id === id)).filter((r): r is Reward => !!r)
      if (!src || !options.length) return null
      return <div className="shop-row" key={t.id}><div className="shop-cost"><strong>{fmt(t.cost)} {src.name}</strong><small>余额 {fmt(balance(p, t.from))}</small></div>
        <div>{options.length === 1 ? `${options[0].name} ×${fmt(t.qty)}` : `${options[0].name}等（${options.length}项） · 每次×${fmt(t.qty)}`}</div>
        <div className="shop-operation">{options.length === 1 ? action(t, options[0]) : <details className="shop-picker"><summary>选择兑换 ▾</summary><div className="shop-picker-menu">{options.map(dst => <div className="shop-choice" key={dst.id}><span>{dst.name} ×{fmt(t.qty)}</span>{action(t, dst)}</div>)}</div></details>}</div>
      </div>
    })}</div> : <p className="muted small">尚未配置兑换规则，可在设置中添加。</p>}
  </div></section>
}
