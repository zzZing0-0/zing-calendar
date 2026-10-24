import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { uid } from '../../../domain/gacha/types'
import type { Config, Trade } from '../../../domain/gacha/types'
export function TradeEditor({ config: c, onChange, onMessage }: { config: Config; onChange: (c: Config) => void; onMessage: (s: string) => void }) {
  const patch = (id: string, values: Partial<Trade>) => onChange({ ...c, trades: c.trades.map(t => t.id === id ? { ...t, ...values } : t) })
  return <><div className="sectionhead trade-sectionhead"><h2>🛒 兑换商店规则</h2><Button id="addTrade" onClick={() => {
    const source = c.rewards.find(r => !r.collect), target = c.rewards.find(r => r.id !== source?.id)
    if (!source || !target) return onMessage('至少需要一个非收藏材料和另一个奖励')
    onChange({ ...c, trades: [...c.trades, { id: uid(), from: source.id, cost: 100, rewardIds: [target.id], qty: 1, repeat: false }] })
  }}>＋ 添加兑换规则</Button></div><p className="muted small">一条规则可以设置多个可选奖励；兑换时只选择其中一种，不会一次发放全部奖励。</p>
    <div id="tradeRows"><div className="trade-header"><span>消耗材料</span><span>消耗数量</span><span>可兑换奖励</span><span>获得数量</span><span>已收藏后</span><span/></div>
      {c.trades.map((t, i) => {
        const chosen = c.rewards.filter(r => t.rewardIds.includes(r.id)), missing = t.rewardIds.some(id => !c.rewards.some(r => r.id === id))
        return <div className="trade-row" key={t.id}>
          <Field className="trade-field"><span className="mobile-label">消耗材料</span><select aria-label="消耗材料" value={t.from} onChange={e => patch(t.id, { from: e.target.value, rewardIds: t.rewardIds.filter(id => id !== e.target.value) })}>{c.rewards.filter(r => !r.collect).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
          <Field className="trade-field"><span className="mobile-label">消耗数量</span><input aria-label="消耗数量" type="number" min="1" value={Number.isNaN(t.cost) ? '' : t.cost} onChange={e => patch(t.id, { cost: e.target.value === '' ? NaN : Number(e.target.value) })}/></Field>
          <details className="trade-picker"><summary><span className="mobile-label">可兑换奖励 · </span><span className="trade-selected">{missing ? '⚠ 存在已删除的兑换目标' : chosen.length ? chosen.slice(0, 2).map(r => r.name).join('、') + (chosen.length > 2 ? ` 等（${chosen.length}项）` : '') : '请选择奖励'}</span> ▾</summary>
            <div className="trade-picker-content"><div className="trade-targets">{c.rewards.filter(r => r.id !== t.from).map(r => <Field key={r.id}><input type="checkbox" checked={t.rewardIds.includes(r.id)} onChange={e => patch(t.id, { rewardIds: e.target.checked ? [...t.rewardIds, r.id] : t.rewardIds.filter(id => id !== r.id) })}/>{r.name}</Field>)}</div><Button onClick={e => { e.currentTarget.closest('details')!.open = false }}>完成</Button></div>
          </details>
          <Field className="trade-field"><span className="mobile-label">获得数量</span><input aria-label="获得数量" type="number" min="1" value={Number.isNaN(t.qty) ? '' : t.qty} onChange={e => patch(t.id, { qty: e.target.value === '' ? NaN : Number(e.target.value) })}/></Field>
          <Field className="trade-field"><span className="mobile-label">已收藏后</span><select aria-label="已收藏后" value={String(t.repeat)} onChange={e => patch(t.id, { repeat: e.target.value === 'true' })}><option value="false">禁止再次兑换</option><option value="true">允许再次兑换</option></select></Field>
          <Button className="trade-remove" variant="danger" aria-label={`删除第${i+1}条兑换规则`} onClick={() => onChange({ ...c, trades: c.trades.filter(x => x.id !== t.id) })}>✕</Button>
        </div>
      })}</div><p className="muted small" id="tradeHelp">兑换目标根据当前奖励配置实时更新；新增或改名后无需先保存。</p></>
}
