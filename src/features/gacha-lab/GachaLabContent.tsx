import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useGachaLab } from './useGachaLab'
import { DrawPanel } from './components/DrawPanel'
import { ProbabilityPanel } from './components/ProbabilityPanel'
import { CollectionInventory } from './components/CollectionInventory'
import { Shop } from './components/Shop'
import { PoolEditor } from './components/PoolEditor'
export function GachaLabContent() {
  const lab = useGachaLab(), [editing, setEditing] = useState(false), [probability, setProbability] = useState(false)
  return <div className="gacha-lab-native"><header className="top"><nav className="tabs" aria-label="抽奖模块"><Button id="playTab" aria-pressed={!editing} onClick={() => { setEditing(false); lab.setMessage('') }}>🎲 抽奖</Button><Button id="editTab" aria-pressed={editing} onClick={() => { setEditing(true); lab.setMessage('') }}>⚙️ 设置</Button></nav></header>
    <div id="message" className="toast" role="status">{lab.message}</div>
    {editing ? <PoolEditor key={lab.revision} state={lab.state} onSelect={lab.select} onAdd={lab.add} onRemove={lab.remove} onSave={lab.save} onImport={lab.importJSON} onMessage={lab.setMessage} message={lab.message}/> : <>
      <ProbabilityPanel pool={lab.pool} open={probability}/><main id="play"><DrawPanel state={lab.state} pool={lab.pool} result={lab.result} resultConfig={lab.resultConfig} onSelect={lab.select} onDraw={lab.draw} onReset={lab.reset} probabilityOpen={probability} toggleProbability={() => setProbability(!probability)}/><CollectionInventory pool={lab.pool}/><Shop pool={lab.pool} onTrade={lab.trade}/></main>
    </>}
  </div>
}
