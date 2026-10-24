import type { Config } from './types'

/** Keep v2.15.22 precision, quantity limits and trade constraints. */
export function validate(c: Config): string | null {
  if (!c.name?.trim()) return '请输入奖池名称'
  if (!Array.isArray(c.rewards) || !c.rewards.length) return '至少需要一项奖励'
  if (!Number.isFinite(c.price) || c.price < 0) return '抽奖价格无效'
  if (c.rate !== null && (!Number.isFinite(c.rate) || c.rate <= 0)) return '货币换算比例必须大于0'
  const ids = new Set<string>()
  let sum = 0
  for (const r of c.rewards) {
    if (!r.name?.trim()) return '奖励名称不能为空'
    if (ids.has(r.id)) return '奖励ID重复'
    ids.add(r.id)
    if (!Number.isFinite(r.p) || r.p < 0 || !Number.isInteger(Math.round(r.p * 1000000)) || Math.abs(r.p * 1000000 - Math.round(r.p * 1000000)) > 1e-6) return '概率精度最多6位小数（百分比）'
    if (!Number.isInteger(r.min) || !Number.isInteger(r.max) || r.min < 1 || r.max < r.min || r.max > 100000) return '奖励数量必须为1至100000的有效整数范围'
    if (r.collect && r.duplicate === 'convert' && (!Number.isSafeInteger(r.convertAmount) || r.convertAmount < 0 || !c.rewards.some(x => x.id === r.convertTo))) return '重复兑换目标或数量无效'
    sum += Math.round(r.p * 1000000)
  }
  for (const [i, t] of (c.trades || []).entries()) {
    let error = ''
    if (!ids.has(t.from)) error = '消耗材料不存在'
    else if (!Array.isArray(t.rewardIds) || !t.rewardIds.length) error = '请选择至少一个兑换奖励'
    else if (t.rewardIds.some(id => !ids.has(id))) error = '兑换奖励不存在'
    else if (t.rewardIds.includes(t.from)) error = '不能用物品兑换自身'
    else if (!Number.isSafeInteger(t.cost) || t.cost < 1) error = '消耗数量必须为正整数'
    else if (!Number.isSafeInteger(t.qty) || t.qty < 1 || t.qty > 100000) error = '获得数量必须为1至100000的整数'
    if (error) return `兑换规则第${i + 1}条无效：${error}`
    if (c.rewards.find(r => r.id === t.from)?.collect) return `兑换规则第${i + 1}条：消耗材料不能是收藏品`
  }
  if (sum !== 100000000) return `概率总和 ${sum / 1000000}%，与100%相差 ${((100000000 - sum) / 1000000).toFixed(6)}%`
  return null
}
