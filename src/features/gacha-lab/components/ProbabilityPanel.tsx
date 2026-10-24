import type { Pool } from '../../../domain/gacha/types'
import { fmt } from '../../../domain/gacha/types'
import { percent, probabilityRows } from '../../../domain/gacha/statistics'
export function ProbabilityPanel({ pool, open }: { pool: Pool; open: boolean }) {
  const c = pool.config
  return <aside id="probabilityAside" className={open ? 'mobile-open' : ''} aria-label="实际抽奖中奖统计">
    <strong>🎯 皮肤命中率 · 理论 vs 实际</strong><div id="probabilityContent">
      <div className="prob-values"><span>抽数 · 轮数</span><span>理论</span><span>实际</span></div>
      {probabilityRows(pool).map(r => <div className="prob-comparison" key={r.n}>
        <div className="prob-values"><span>{r.n}抽 <small>({r.rounds}轮)</small></span><span>{percent(r.theoretical)}</span><strong>{r.observed === null ? '—' : percent(r.observed)}</strong></div>
        <div className="muted small">命中 {r.hits} 轮 · 未中 {r.misses} 轮{r.observed === null ? ' · 暂无数据' : ` · 偏差 ${r.observed - r.theoretical >= 0 ? '+' : ''}${((r.observed - r.theoretical) * 100).toFixed(2)}百分点`}</div>
      </div>)}
      <div className="prob-total">累计模拟 {fmt(pool.draws)} 抽 · {fmt(pool.spent)} {c.currency}{c.rate ? ' ≈ ¥' + fmt(pool.spent / c.rate) : ''}</div>
    </div><p className="muted small">每次点击算一轮，至少获得1件收藏品即命中（含重复）。<br/>实际数据仅统计 v1.21 起的抽奖；样本少时波动可能很大。</p>
  </aside>
}
