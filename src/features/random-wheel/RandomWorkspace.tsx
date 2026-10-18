import type * as React from 'react'
import type { RandomPoolGroup, RandomPoolItem } from '../../types'
import { RandomPoolManager } from './RandomPoolManager'
import { RandomWheelPage } from './RandomWheelPage'

export interface RandomWorkspaceProps {
  mixedPoolItemIds: string[]
  randomPoolGroups: RandomPoolGroup[]
  randomPoolItems: RandomPoolItem[]
  randomPoolOpen: boolean
  randomWheelOpen: boolean
  setMixedPoolItemIds: React.Dispatch<React.SetStateAction<string[]>>
  setRandomPoolGroups: React.Dispatch<React.SetStateAction<RandomPoolGroup[]>>
  setRandomPoolItems: React.Dispatch<React.SetStateAction<RandomPoolItem[]>>
  setRandomPoolOpen: React.Dispatch<React.SetStateAction<boolean>>
  setRandomWheelOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function RandomWorkspace({
  mixedPoolItemIds,
  randomPoolGroups,
  randomPoolItems,
  randomPoolOpen,
  randomWheelOpen,
  setMixedPoolItemIds,
  setRandomPoolGroups,
  setRandomPoolItems,
  setRandomPoolOpen,
  setRandomWheelOpen
}: RandomWorkspaceProps) {
  return <>
{randomWheelOpen && (
        <div className="random-feature-overlay">
          <RandomWheelPage groups={randomPoolGroups} items={randomPoolItems} mixedPoolItemIds={mixedPoolItemIds} onClose={()=>setRandomWheelOpen(false)} />
        </div>
      )}

{randomPoolOpen && (
        <div className="random-feature-overlay">
          <RandomPoolManager groups={randomPoolGroups} items={randomPoolItems} onGroups={setRandomPoolGroups} onItems={setRandomPoolItems} mixedPoolItemIds={mixedPoolItemIds} onMixedPoolItemIds={setMixedPoolItemIds} onClose={()=>setRandomPoolOpen(false)} />
        </div>
      )}
  </>
}
