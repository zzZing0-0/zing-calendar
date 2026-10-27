import type { Pool } from './types'
import { balance } from './inventory'
import { validate } from './validation'
export function redeem(p: Pool, tradeId: string, rewardId: string, times = 1) {
  const error = validate(p.config)
  if (error) throw Error('奖池配置无效：' + error)
  const t = p.config.trades.find(t => t.id === tradeId)
  const dst = p.config.rewards.find(r => r.id === rewardId)
  if (!t || !dst || !t.rewardIds.includes(rewardId)) throw Error('兑换规则不存在')
  if (!Number.isSafeInteger(times) || times < 1) throw Error('兑换次数必须为正整数')
  if (!Number.isSafeInteger(t.cost * times) || !Number.isSafeInteger(t.qty * times)) throw Error('兑换数量超出安全范围')
  if (balance(p, t.from) < t.cost * times) throw Error('材料不足')
  if (dst.collect && !t.repeat && (p.collection[dst.id] || times > 1)) throw Error('该收藏品每次仅可兑换一次')
  p.redeemedSpent ||= {}; p.tradeGained ||= {}
  p.redeemedSpent[t.from] = (p.redeemedSpent[t.from] || 0) + t.cost * times
  if (dst.collect) {
    const extras = p.collection[dst.id] ? t.qty * times : t.qty * times - 1
    p.collection[dst.id] = true
    if (extras > 0) p.duplicates[dst.id] = (p.duplicates[dst.id] || 0) + extras
  } else p.tradeGained[dst.id] = (p.tradeGained[dst.id] || 0) + t.qty * times
  // v2.15.22 shop duplicates deliberately do not use draw conversion rules.
}
