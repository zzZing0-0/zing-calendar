import { clone, uid } from '../../domain/gacha/types'
import type { Config, GachaState } from '../../domain/gacha/types'
import { makePool, sample } from '../../domain/gacha/defaults'
import { validate } from '../../domain/gacha/validation'
export const KEY = 'zing-gacha-v1'
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Normalize a private copy only. Never discard historical or unrecognized fields. */
export function normalizeConfig(value: unknown): Config {
  if (!object(value) || !Array.isArray(value.rewards) || value.rewards.some(r => !object(r))) throw Error('奖池配置缺失')
  const c = clone(value) as Config
  if (c.trades !== undefined && c.trades !== null && !Array.isArray(c.trades)) throw Error('兑换规则数据无效')
  if (!Array.isArray(c.trades)) c.trades = c.rewards.filter(r => r.redeemFrom && Number(r.redeemCost) > 0 && c.rewards.some(x => x.id === r.redeemFrom && !x.collect))
    .map(r => ({ id: uid(), from: r.redeemFrom!, cost: Number(r.redeemCost), rewardIds: [r.id], qty: 1, repeat: false }))
  for (const t of c.trades) {
    if (!object(t)) throw Error('兑换规则无效')
    if (!Array.isArray(t.rewardIds)) t.rewardIds = t.to ? [t.to] : []
  }
  return c
}
export function normalizeState(value: unknown, forImport = false): GachaState {
  if (!object(value) || !Array.isArray(value.pools) || !value.pools.length) throw Error('奖池数据无效')
  const state = clone(value) as GachaState, ids = new Set<string>()
  for (const p of state.pools) {
    if (!object(p) || typeof p.id !== 'string' || !p.id || ids.has(p.id)) throw Error('奖池ID缺失或重复')
    ids.add(p.id)
    p.config = normalizeConfig(p.config || p.versions?.at(-1)?.config)
    if (forImport) { const error = validate(p.config); if (error) throw Error(error) }
    for (const k of ['draws', 'spent'] as const) if (!Number.isFinite(p[k]) || p[k] < 0) throw Error('累计数据无效')
    for (const k of ['counts','duplicates','converted','tradeGained','redeemedSpent'] as const) {
      if (p[k] === undefined && (k === 'tradeGained' || k === 'redeemedSpent')) continue
      if (!object(p[k]) || Object.values(p[k]).some(n => !Number.isFinite(n) || n < 0)) throw Error('库存数据无效')
    }
    if (!object(p.collection) || Object.values(p.collection).some(v => typeof v !== 'boolean')) throw Error('收藏数据无效')
    if (p.batchStats === undefined) p.batchStats = {}
    if (!object(p.batchStats) || Object.values(p.batchStats).some(s => !object(s) || !Number.isFinite(s.rounds) || !Number.isFinite(s.hits) || s.rounds < 0 || s.hits < 0 || s.hits > s.rounds)) throw Error('统计数据无效')
    if (p.history !== undefined && !Array.isArray(p.history)) throw Error('历史数据无效')
  }
  if (typeof state.active !== 'string' || !ids.has(state.active)) {
    if (!forImport) throw Error('当前奖池指向无效')
    state.active = state.pools[0].id
  }
  return state
}
export function readState(storage: Pick<Storage, 'getItem'> = localStorage) {
  const raw = storage.getItem(KEY)
  if (raw === null) { const p = makePool(sample()); return { raw, state: { active: p.id, pools: [p] } } }
  return { raw, state: normalizeState(JSON.parse(raw)) }
}
export function writeState(state: GachaState, expectedRaw: string | null, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
  if (storage.getItem(KEY) !== expectedRaw) throw Error('其他页面已修改奖池，请重新加载后再操作，避免覆盖数据。')
  const raw = JSON.stringify(state)
  storage.setItem(KEY, raw)
  return raw
}
export function configExport(config: Config) { return { type: 'zing-gacha-config', schema: 1, config: clone(config) } }
export function backupExport(state: GachaState) { return { type: 'zing-gacha-backup', schema: 1, state: clone(state) } }
export function parseImport(value: unknown): { kind: 'config'; config: Config } | { kind: 'backup'; state: GachaState } {
  if (!object(value)) throw Error('无效文件')
  if (value.type === 'zing-gacha-config') {
    const config = normalizeConfig(value.config), error = validate(config)
    if (error) throw Error(error)
    return { kind: 'config', config }
  }
  if (value.type === 'zing-gacha-backup') return { kind: 'backup', state: normalizeState(value.state, true) }
  throw Error('不支持的文件格式')
}
export function download(name: string, value: unknown, raw = false) {
  const blob = new Blob([raw ? String(value) : JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = name; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
