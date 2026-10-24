export interface Reward {
  id: string; name: string; category: string; p: number; min: number; max: number
  collect: boolean; duplicate: 'keep' | 'convert'; convertAmount: number; convertTo: string | null
  image?: string | null; redeemFrom?: string | null; redeemCost?: number | null
}
export interface Trade { id: string; from: string; cost: number; rewardIds: string[]; qty: number; repeat: boolean; to?: string }
export interface Config {
  id: string; name: string; description: string; currency: string; price: number; rate: number | null
  target: string | null; cover?: string | null; chest?: string | null; rewards: Reward[]; trades: Trade[]
}
export type Amounts = Record<string, number>
export interface DrawResult { time: number; n: number; got: Amounts; dup: Amounts; converted: Amounts; cost: number; newCollected: string[] }
export interface Pool {
  id: string; config: Config; draws: number; spent: number; counts: Amounts; collection: Record<string, boolean>
  duplicates: Amounts; converted: Amounts; tradeGained?: Amounts; redeemedSpent?: Amounts
  history: unknown[]; batchStats: Record<string, { rounds: number; hits: number }>
  versions?: { config: Config }[]; versionDraws?: unknown
}
export interface GachaState { active: string; pools: Pool[] }
export const clone = <T,>(value: T): T => structuredClone(value)
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(36).slice(2)
export const fmt = (n: number) => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
