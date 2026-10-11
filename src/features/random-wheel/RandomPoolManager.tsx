import { useState } from 'react'
import type { RandomPoolGroup, RandomPoolItem } from '../../types'

type Props = {
  groups: RandomPoolGroup[]
  items: RandomPoolItem[]
  onGroups: (value: RandomPoolGroup[]) => void
  onItems: (value: RandomPoolItem[]) => void
  mixedPoolItemIds: string[]
  onMixedPoolItemIds: (value: string[]) => void
  onClose: () => void
}

export function RandomPoolManager({ groups, items, onGroups, onItems, mixedPoolItemIds, onMixedPoolItemIds, onClose }: Props) {
  const [name, setName] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map(group => [group.id, true])))
  const [mixedCollapsed, setMixedCollapsed] = useState(true)
  const now = () => new Date().toISOString()
  const updateItem = (id: string, patch: Partial<RandomPoolItem>) => onItems(items.map(item => item.id === id ? { ...item, ...patch, updatedAt: now() } : item))
  const addGroup = () => {
    const nextName = name.trim()
    if (!nextName) return
    const timestamp = now()
    const id = crypto.randomUUID()
    onGroups([...groups, { id, name: nextName, createdAt: timestamp, updatedAt: timestamp }])
    setCollapsed(current => ({ ...current, [id]: false }))
    setName('')
  }
  const addItem = (groupId: string) => {
    const timestamp = now()
    onItems([...items, { id: crypto.randomUUID(), groupId, name: '新项目', weight: 1, enabled: true, createdAt: timestamp, updatedAt: timestamp }])
  }
  const toggleMixedItem = (id: string, checked: boolean) => onMixedPoolItemIds(checked ? [...new Set([...mixedPoolItemIds, id])] : mixedPoolItemIds.filter(current => current !== id))
  const toggleMixedGroup = (groupItems: RandomPoolItem[], checked: boolean) => {
    const ids = new Set(groupItems.map(item => item.id))
    onMixedPoolItemIds(checked ? [...new Set([...mixedPoolItemIds, ...ids])] : mixedPoolItemIds.filter(id => !ids.has(id)))
  }
  const toggleGroup = (groupId: string) => setCollapsed(current => ({ ...current, [groupId]: !current[groupId] }))

  return <div className="random-pool-page">
    <div className="random-wheel-top"><button onClick={onClose}>‹ 返回</button><div><span>RANDOM POOLS</span><h2>幸运池</h2></div><i/></div>
    <section className={`random-mixed-pool${mixedCollapsed?' is-collapsed':''}`}><button className="random-mixed-pool-head" type="button" onClick={()=>setMixedCollapsed(value=>!value)} aria-expanded={!mixedCollapsed}><div><strong>混合池</strong><small>跨组选项目，抽奖时直接继承原项目权重。</small></div><span>{mixedPoolItemIds.filter(id=>items.some(item=>item.id===id)).length} 项　{mixedCollapsed?'⌄':'⌃'}</span></button>{!mixedCollapsed&&(groups.length===0?<p>先创建普通分组和项目，再来这里自由混搭。</p>:groups.map(group=>{const groupItems=items.filter(item=>item.groupId===group.id);if(!groupItems.length)return null;const selectedCount=groupItems.filter(item=>mixedPoolItemIds.includes(item.id)).length;const allSelected=selectedCount===groupItems.length;const partiallySelected=selectedCount>0&&!allSelected;return <div className="random-mixed-group" key={group.id}><label className={`random-mixed-group-select${partiallySelected?' is-partial':''}`}><input type="checkbox" checked={allSelected} aria-checked={partiallySelected?'mixed':allSelected} onChange={event=>toggleMixedGroup(groupItems,event.target.checked)}/><span className="random-checkbox" aria-hidden="true">{partiallySelected?'−':'✓'}</span><b>{group.name}</b><em>{selectedCount}/{groupItems.length}</em></label><div>{groupItems.map(item=><label key={item.id} className="random-mixed-item"><input type="checkbox" checked={mixedPoolItemIds.includes(item.id)} onChange={event=>toggleMixedItem(item.id,event.target.checked)}/><span className="random-checkbox" aria-hidden="true">✓</span><span>{item.name}</span><em>权重 {item.weight}</em></label>)}</div></div>}))}</section>
    <div className="random-pool-add"><input value={name} onChange={event => setName(event.target.value)} placeholder="新分组名称"/><button onClick={addGroup}>＋ 添加分组</button></div>
    {groups.length === 0 && <div className="random-wheel-empty">这里现在是空的。你可以创建任何分组，不预置「娱乐」或「学习」。</div>}
    {groups.map(group => {
      const groupItems = items.filter(item => item.groupId === group.id)
      const isCollapsed = Boolean(collapsed[group.id])
      return <section className={`random-pool-group${isCollapsed ? ' is-collapsed' : ''}`} key={group.id}>
        <header className="random-pool-group-header">
          <button className="random-pool-collapse" type="button" onClick={() => toggleGroup(group.id)} aria-expanded={!isCollapsed} aria-label={isCollapsed ? '展开分组' : '折叠分组'}>{isCollapsed ? '›' : '⌄'}</button>
          <input value={group.name} onChange={event => onGroups(groups.map(current => current.id === group.id ? { ...current, name: event.target.value, updatedAt: now() } : current))}/>
          <span className="random-pool-count">{groupItems.length} 项</span>
          <button className="random-delete-group" onClick={() => { onGroups(groups.filter(current => current.id !== group.id)); onItems(items.filter(item => item.groupId !== group.id)); onMixedPoolItemIds(mixedPoolItemIds.filter(id => !groupItems.some(item => item.id === id))) }}>删除分组</button>
        </header>
        {!isCollapsed && <div className="random-pool-group-body">
          {groupItems.map(item => <div className="random-pool-item" key={item.id}>
            <div className="random-pool-item-main">
              <label className="random-enabled" title="参与本次抽奖"><input type="checkbox" checked={item.enabled} onChange={event => updateItem(item.id, { enabled: event.target.checked })}/><span className="random-checkbox" aria-hidden="true">✓</span><span>参与</span></label>
              <input className="random-name" aria-label="项目名称" value={item.name} onChange={event => updateItem(item.id, { name: event.target.value })}/>
              <button className="random-delete-item" aria-label={`删除 ${item.name}`} onClick={() => { onItems(items.filter(current => current.id !== item.id)); onMixedPoolItemIds(mixedPoolItemIds.filter(id => id !== item.id)) }}>×</button>
            </div>
            <div className="random-pool-item-details">
              <label><span>数量</span><input type="number" min="0" step="any" placeholder="可选" value={item.amount ?? ''} onChange={event => updateItem(item.id, { amount: event.target.value === '' ? undefined : Number(event.target.value) })}/></label>
              <label><span>单位</span><input placeholder="可选" value={item.unit ?? ''} onChange={event => updateItem(item.id, { unit: event.target.value })}/></label>
              <label><span>权重</span><input type="number" min="0" step="any" value={item.weight} onFocus={event => event.currentTarget.select()} onChange={event => updateItem(item.id, { weight: event.target.value === '' ? 0 : Number(event.target.value) })}/></label>
            </div>
          </div>)}
          <button className="random-add-item" onClick={() => addItem(group.id)}>＋ 添加项目</button>
        </div>}
      </section>
    })}
  </div>
}
