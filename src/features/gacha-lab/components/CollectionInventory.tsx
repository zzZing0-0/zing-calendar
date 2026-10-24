import { fmt } from '../../../domain/gacha/types'
import type { Pool } from '../../../domain/gacha/types'
import { inventory } from '../../../domain/gacha/inventory'
export function CollectionInventory({ pool: p }: { pool: Pool }) {
  const items = inventory(p), collect = p.config.rewards.filter(r => r.collect)
  return <>
    <section className="panel compact-panel"><div className="sectionhead"><h2>🎒 累计物品</h2><span className="muted small">包含直接抽中与重复兑换</span></div>
      <div id="inventory" className="items">{items.length ? items.map(({ r, total, direct, exchange, spent }) => <div className="item" key={r.id}>
        <span className="inventory-dot">●</span><strong>{r.name} ×{fmt(total)}</strong><div className="muted small">{exchange ? `抽中 ${fmt(direct)} · 兑换 ${fmt(exchange)}` : r.category}{spent ? ' · 已使用 ' + fmt(spent) : ''}</div>
      </div>) : <p className="muted">还没有获得非收藏物品</p>}</div>
    </section>
    <section className="panel compact-panel"><div className="sectionhead"><h2>🏆 收藏图鉴</h2><span id="collectionProgress" className="pill">已收藏 {collect.filter(r => p.collection[r.id]).length}/{collect.length}</span></div>
      <div id="collection" className="items">{collect.length ? collect.map(r => <div className="item" key={r.id}>
        <span className="collection-mark">{p.collection[r.id] ? '✓' : '○'}</span><strong>{r.name}</strong><div className="muted small">{p.collection[r.id] ? '已获得' : '未获得'}{p.duplicates[r.id] ? ' · 重复 ' + fmt(p.duplicates[r.id]) : ''}</div>
      </div>) : <p className="muted">此奖池没有可收藏奖励</p>}</div>
    </section>
  </>
}
