import type { Amounts, Config, DrawResult, Pool } from './types'
import { validate } from './validation'

/** v2.15.22: 100 million integer slots; then uniform integer quantity, inclusive. */
export function drawOne(c: Config, rng: () => number = Math.random) {
  const x = Math.floor(rng() * 100000000)
  let sum = 0
  for (const reward of c.rewards) {
    sum += Math.round(reward.p * 1000000)
    if (x < sum) return { reward, qty: reward.min + Math.floor(rng() * (reward.max - reward.min + 1)) }
  }
  return null
}

/** Mutates only the caller-owned candidate, never durable state. */
export function performDraw(p: Pool, n: number, rng: () => number = Math.random): DrawResult {
  if (!Number.isInteger(n) || n < 1 || n > 10000) throw Error('抽奖次数须在1—10000之间')
  const c = p.config, error = validate(c)
  if (error) throw Error('奖池配置无效：' + error)
  const got: Amounts = {}, dup: Amounts = {}, converted: Amounts = {}, newCollected: string[] = []
  let hitCollectible = false
  for (let i = 0; i < n; i++) {
    const result = drawOne(c, rng)
    if (!result) throw Error('概率抽取失败')
    const { reward: r, qty } = result
    got[r.id] = (got[r.id] || 0) + qty
    p.counts[r.id] = (p.counts[r.id] || 0) + qty
    if (r.collect) {
      hitCollectible = true
      const first = p.collection[r.id] ? 0 : 1
      if (first) { p.collection[r.id] = true; newCollected.push(r.id) }
      const extra = qty - first
      if (extra > 0) {
        dup[r.id] = (dup[r.id] || 0) + extra
        p.duplicates[r.id] = (p.duplicates[r.id] || 0) + extra
        if (r.duplicate === 'convert') {
          const amount = extra * r.convertAmount, target = r.convertTo!
          converted[target] = (converted[target] || 0) + amount
          p.converted[target] = (p.converted[target] || 0) + amount
        }
      }
    }
  }
  p.draws += n
  p.batchStats ||= {}
  const stat = p.batchStats[n] || (p.batchStats[n] = { rounds: 0, hits: 0 })
  stat.rounds++
  if (hitCollectible) stat.hits++
  const cost = n * c.price
  p.spent += cost
  // The released implementation does not append a history row; preserve that behavior.
  return { time: Date.now(), n, got, dup, converted, cost, newCollected }
}
