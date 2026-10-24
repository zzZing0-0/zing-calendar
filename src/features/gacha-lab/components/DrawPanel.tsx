import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { fmt } from '../../../domain/gacha/types'
import type { Amounts, Config, DrawResult, GachaState, Pool } from '../../../domain/gacha/types'
function RewardSummary({ amounts, config }: { amounts: Amounts; config: Config }) {
  const entries = Object.entries(amounts).filter(([, n]) => n > 0)
  return entries.length ? entries.map(([id, n]) => <span className="pill" key={id}>{config.rewards.find(r => r.id === id)?.name || '已删除奖励'} ×{fmt(n)}</span>) : <span className="muted">无</span>
}
export function DrawPanel({ state, pool: p, result, resultConfig, onSelect, onDraw, onReset, probabilityOpen, toggleProbability }: {
  state: GachaState; pool: Pool; result: DrawResult | null; resultConfig: Config | null; onSelect: (id: string) => void; onDraw: (n: number) => void; onReset: () => void; probabilityOpen: boolean; toggleProbability: () => void
}) {
  const [custom, setCustom] = useState('500'), c = p.config, rc = resultConfig || c
  return <section className="panel"><div className="sectionhead"><Field>当前奖池<select id="poolSelect" value={p.id} onChange={e => onSelect(e.target.value)}>{state.pools.map(p => <option key={p.id} value={p.id}>{p.config.name}</option>)}</select></Field><span id="drawCount" className="pill" aria-live="polite">累计 {fmt(p.draws)} 抽</span></div>
    <div className="actions secondary-actions"><Button id="showProbability" aria-expanded={probabilityOpen} aria-controls="probabilityAside" onClick={toggleProbability}>🎯 {probabilityOpen ? '收起概率' : '查看概率'}</Button>
      <input id="customN" type="number" min="1" max="10000" value={custom} aria-label="自定义抽数" onChange={e => setCustom(e.target.value)}/><Button id="customDraw" onClick={() => onDraw(Number(custom))}>自定义抽奖</Button><Button id="resetPool" variant="danger" onClick={onReset}>🧹 清空当前奖池记录</Button></div>
    <div className="hero"><h2 id="poolTitle">{c.name}</h2><div className="result-chest"><div className="chest-lid">✦ 开箱战利品 ✦</div><div className="chest-body"><div id="results" className="result" aria-live="polite">{result ? <>
      <strong>🎉 本轮 {result.n} 抽</strong><div className="reward-chips"><RewardSummary amounts={result.got} config={rc}/></div>
      {!!Object.keys(result.dup).length && <p>🔁 重复获得：<RewardSummary amounts={result.dup} config={rc}/></p>}
      {!!Object.keys(result.converted).length && <p>💰 兑换所得：<RewardSummary amounts={result.converted} config={rc}/></p>}
      {!!result.newCollected.length && <p>✨ 新收藏：{result.newCollected.map(id => rc.rewards.find(r => r.id === id)?.name).join('、')}</p>}
      <p className="muted">本轮模拟消耗 {fmt(result.cost)} {rc.currency}{rc.rate ? ' ≈ ¥' + fmt(result.cost / rc.rate) : ''}</p>
    </> : '点击下方按钮，开启你的战利品箱！'}</div></div><div className="chest-base"/></div>
      <div id="priceLabel" className="muted">每抽 {fmt(c.price)} {c.currency}{c.rate ? ' · 约 ¥' + fmt(c.price / c.rate) : ''}</div>
      <div className="actions">{[1,10,100].map(n => <Button key={n} variant="primary" data-draw={n} onClick={() => onDraw(n)}>抽 {n} 次</Button>)}</div>
    </div>
  </section>
}
