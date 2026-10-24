import type { Pool } from './types'
export function balance(p: Pool, id: string) {
  return Math.max(0, (p.counts[id] || 0) + (p.converted[id] || 0) + (p.tradeGained?.[id] || 0) - (p.redeemedSpent?.[id] || 0))
}
export function inventory(p: Pool) {
  return p.config.rewards.filter(r => !r.collect).map(r => ({ r, direct: p.counts[r.id] || 0,
    exchange: (p.converted[r.id] || 0) + (p.tradeGained?.[r.id] || 0), total: balance(p, r.id), spent: p.redeemedSpent?.[r.id] || 0,
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)
}
