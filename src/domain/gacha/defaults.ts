import { clone, uid } from './types'
import type { Config, Pool, Reward } from './types'

export function sample(): Config {
  const skins: [string, number, number][] = [
    ['女巫', .02, 5000], ['狼王', .02, 5000], ['猎人', .02, 5000],
    ['预言家', .12, 1000], ['孤独少女', .12, 1000], ['魔镜', .12, 1000], ['觉醒隐狼', .12, 1000], ['守卫', .12, 1000],
  ]
  const rewards: Reward[] = skins.map(([name, p, convertAmount]) => ({
    id: uid(), name, category: '永久皮肤', p, min: 1, max: 1, collect: true,
    duplicate: 'convert', convertAmount, convertTo: null, image: null,
  }))
  const badge: Reward = {
    id: uid(), name: '徽章', category: '货币', p: 88.84, min: 1, max: 16,
    collect: false, duplicate: 'keep', convertAmount: 0, convertTo: null, image: null,
  }
  rewards.forEach(r => r.convertTo = badge.id)
  for (const name of ['女巫碎片', '猎人碎片', '狼王碎片']) rewards.push({
    id: uid(), name, category: '碎片', p: 3.5, min: 1, max: 3,
    collect: false, duplicate: 'keep', convertAmount: 0, convertTo: null, image: null,
  })
  rewards.push(badge)
  return {
    trades: [], id: uid(), name: '网易狼人杀·五日谈', description: '示例概率与自定义重复兑换规则，仅供模拟',
    currency: '点券', price: 60, rate: 10, target: rewards[6].id, cover: null, chest: null, rewards,
  }
}

export function makePool(c: Config): Pool {
  const id = uid(), config = clone(c)
  config.id = id
  return { id, config, draws: 0, counts: {}, collection: {}, duplicates: {}, converted: {}, tradeGained: {}, redeemedSpent: {}, spent: 0, history: [], batchStats: {} }
}
