import { useEffect, useRef, useState } from 'react'
import { clone } from '../../domain/gacha/types'
import type { Config, DrawResult, GachaState } from '../../domain/gacha/types'
import { makePool, sample } from '../../domain/gacha/defaults'
import { performDraw } from '../../domain/gacha/draw'
import { redeem } from '../../domain/gacha/trades'
import { validate } from '../../domain/gacha/validation'
import { parseImport, readState, writeState } from './storage'
import { useDrawSound } from './useDrawSound'
export function useGachaLab() {
  const [{ state: initialState, raw: initialRaw }] = useState(readState)
  const [state, setState] = useState(initialState), rawRef = useRef(initialRaw)
  const snapshotRef = useRef(initialState)
  const [message, setMessage] = useState(''), [result, setResult] = useState<DrawResult | null>(null)
  const [resultConfig, setResultConfig] = useState<Config | null>(null)
  const [revision, setRevision] = useState(0)
  const playSound = useDrawSound()
  useEffect(() => { if (!message) return; const id = window.setTimeout(() => setMessage(''), 3500); return () => clearTimeout(id) }, [message])
  const pool = state.pools.find(p => p.id === state.active)!
  const commit = (change: (next: GachaState) => void) => {
    try {
      const next = clone(snapshotRef.current); change(next)
      rawRef.current = writeState(next, rawRef.current)
      snapshotRef.current = next
      setState(next); setRevision(r => r + 1); return true
    } catch (error) { setMessage('操作失败，原始数据已保留：' + (error instanceof Error ? error.message : '浏览器存储空间可能不足，请先导出备份。')); return false }
  }
  const current = (s: GachaState) => s.pools.find(p => p.id === s.active)!
  const select = (id: string) => { if (commit(s => { if (!s.pools.some(p => p.id === id)) throw Error('奖池不存在'); s.active = id })) setResult(null) }
  const draw = (n: number) => {
    let record: DrawResult
    if (commit(s => { record = performDraw(current(s), n) })) { setResult(record!); setResultConfig(clone(current(snapshotRef.current).config)); playSound() }
  }
  const trade = (id: string, rewardId: string, times = 1) => {
    const t = pool.config.trades.find(t => t.id === id)!, src = pool.config.rewards.find(r => r.id === t.from)!, dst = pool.config.rewards.find(r => r.id === rewardId)!
    if (!confirm(`消耗 ${t.cost * times} ${src.name}，兑换 ${t.qty * times} ${dst.name}（${times}次）？`)) return
    if (commit(s => redeem(current(s), id, rewardId, times))) { setMessage('兑换成功：' + dst.name + ' ×' + (t.qty * times)); playSound() }
  }
  const add = (copy: boolean) => {
    const c = copy ? clone(pool.config) : sample()
    c.name = copy ? c.name + '（副本）' : '我的新奖池'
    if (!copy) c.description = '请在此配置奖励与概率'
    if (commit(s => { const p = makePool(c); s.pools.push(p); s.active = p.id })) { setResult(null); setMessage(copy ? '奖池已复制' : '新奖池已创建') }
  }
  const remove = (id: string) => {
    if (state.pools.length <= 1) return setMessage('至少保留一个奖池')
    const p = state.pools.find(p => p.id === id)!
    if (!confirm('确定永久删除奖池「' + p.config.name + '」及其全部记录？此操作无法撤销。')) return
    if (commit(s => { s.pools = s.pools.filter(p => p.id !== id); if (s.active === id) s.active = s.pools[0].id })) setResult(null)
  }
  const reset = () => {
    if (!confirm('确定清空当前奖池的抽奖、收藏、统计和历史记录？当前配置将保留。')) return
    if (commit(s => { const p = current(s), empty = makePool(p.config); Object.assign(p, empty, { id: p.id, config: p.config }) })) { setResult(null); setMessage('已清空当前奖池的抽奖、收藏、统计和历史记录') }
  }
  const save = (config: Config) => {
    const c = clone(config); c.name = c.name.trim(); c.currency = c.currency.trim() || '代币'
    for (const r of c.rewards) if (!r.redeemFrom) r.redeemCost = null
    const error = validate(c)
    if (error) { setMessage('无法保存：' + error); return false }
    if (!commit(s => { current(s).config = c })) return false
    setMessage('配置已保存'); return true
  }
  const importJSON = (value: unknown) => {
    try {
      const data = parseImport(value)
      if (data.kind === 'backup') {
        if (!confirm('完整备份将替换当前所有本地奖池与记录。建议先导出当前备份。确定继续？')) return
        if (!commit(s => { Object.keys(s).forEach(k => Reflect.deleteProperty(s, k)); Object.assign(s, data.state) })) return
      } else {
        const exists = snapshotRef.current.pools.find(p => p.id === data.config.id)
        const overwrite = exists && confirm('发现相同奖池ID。确定覆盖当前奖池配置并清空该奖池记录？取消则另存为新奖池。')
        if (!commit(s => {
          const p = makePool(data.config)
          if (overwrite) { p.id = exists.id; p.config.id = exists.id; s.pools[s.pools.findIndex(p => p.id === exists.id)] = p } else s.pools.push(p)
          s.active = p.id
        })) return
      }
      setResult(null); setMessage('导入成功')
    } catch (error) { setMessage('导入失败：' + (error instanceof Error ? error.message : '无效文件')) }
  }
  return { state, revision, pool, message, setMessage, result, resultConfig, select, draw, trade, add, remove, reset, save, importJSON }
}
