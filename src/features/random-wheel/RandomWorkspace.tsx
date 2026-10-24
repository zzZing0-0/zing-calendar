import type * as React from 'react'
import type { RandomPoolGroup, RandomPoolItem } from '../../types'
import { RandomPoolManager } from './RandomPoolManager'
import { RandomWheelPage } from './RandomWheelPage'
import { GachaLabPage } from '../gacha-lab/GachaLabPage'

export interface RandomWorkspaceProps {
  mixedPoolItemIds: string[]
  randomPoolGroups: RandomPoolGroup[]
  randomPoolItems: RandomPoolItem[]
  randomPoolOpen: boolean
  randomWheelOpen: boolean
  gachaLabOpen: boolean
  setMixedPoolItemIds: React.Dispatch<React.SetStateAction<string[]>>
  setRandomPoolGroups: React.Dispatch<React.SetStateAction<RandomPoolGroup[]>>
  setRandomPoolItems: React.Dispatch<React.SetStateAction<RandomPoolItem[]>>
  setRandomPoolOpen: React.Dispatch<React.SetStateAction<boolean>>
  setRandomWheelOpen: React.Dispatch<React.SetStateAction<boolean>>
  setGachaLabOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function RandomWorkspace({
  mixedPoolItemIds,
  randomPoolGroups,
  randomPoolItems,
  randomPoolOpen,
  randomWheelOpen,
  gachaLabOpen,
  setMixedPoolItemIds,
  setRandomPoolGroups,
  setRandomPoolItems,
  setRandomPoolOpen,
  setRandomWheelOpen,
  setGachaLabOpen
}: RandomWorkspaceProps) {
  return <>
{gachaLabOpen && <GachaLabPage onClose={()=>setGachaLabOpen(false)} />}
{randomWheelOpen && (
        <div className="random-feature-overlay">
          <RandomWheelPage groups={randomPoolGroups} items={randomPoolItems} mixedPoolItemIds={mixedPoolItemIds} onClose={()=>setRandomWheelOpen(false)} onSettings={()=>setRandomPoolOpen(true)} />
        </div>
      )}

{randomPoolOpen && (
        <div className="random-feature-overlay">
          <RandomPoolManager groups={randomPoolGroups} items={randomPoolItems} onGroups={setRandomPoolGroups} onItems={setRandomPoolItems} mixedPoolItemIds={mixedPoolItemIds} onMixedPoolItemIds={setMixedPoolItemIds} onClose={()=>setRandomPoolOpen(false)} />
        </div>
      )}
  </>
}
