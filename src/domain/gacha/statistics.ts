import type { Pool } from './types'
export function probabilityRows(p: Pool) {
  const stats = p.batchStats || {}
  const perDraw = Math.min(1, Math.max(0, p.config.rewards.filter(r => r.collect).reduce((s, r) => s + (Number(r.p) || 0) / 100, 0)))
  const sizes = [...new Set([1, 10, 100, ...Object.keys(stats).map(Number).filter(n => Number.isSafeInteger(n) && n >= 1 && n <= 10000 && Number(stats[n]?.rounds) > 0)])].sort((a,b) => a-b)
  return sizes.map(n => {
    const stat = stats[n] || { rounds: 0, hits: 0 }
    const rounds = Math.max(0, Number(stat.rounds) || 0), hits = Math.max(0, Number(stat.hits) || 0)
    const theoretical = -Math.expm1(n * Math.log1p(-perDraw))
    return { n, rounds, hits, theoretical, observed: rounds ? hits / rounds : null, misses: Math.max(0, rounds - hits) }
  })
}
export const percent = (n: number) => (n * 100).toFixed(2) + '%'
