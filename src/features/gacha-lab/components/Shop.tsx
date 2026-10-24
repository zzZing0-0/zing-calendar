import { Button } from '../../../components/ui/Button'
import { balance } from '../../../domain/gacha/inventory'
import { fmt } from '../../../domain/gacha/types'
import type { Pool, Reward, Trade } from '../../../domain/gacha/types'
export function Shop({ pool: p, onTrade }: { pool: Pool; onTrade: (id: string, reward: string) => void }) {
  const c = p.config
  const action = (t: Trade, dst: Reward) => {
    const blocked = dst.collect && p.collection[dst.id] && !t.repeat, affordable = balance(p, t.from) >= t.cost
    return <Button className="shop-action" data-shop={t.id} data-reward={dst.id} disabled={blocked || !affordable} onClick={() => onTrade(t.id, dst.id)}>{blocked ? '已收藏' : !affordable ? '材料不足' : '兑换'}</Button>
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
