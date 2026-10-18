import type { ModuleKey } from './modulePriority'
import { normalizeModuleOrder } from './modulePriority'

/** The task section is intentionally fixed at the beginning of the day detail. */
export const DEFAULT_DAY_SECTION_ORDER = ['mood','energy','calendar','journal','habit','period'] as const
export type DaySectionKey = typeof DEFAULT_DAY_SECTION_ORDER[number]
export const DAY_SECTION_LABELS:Record<DaySectionKey,string> = {mood:'心情',energy:'能量',calendar:'情绪月历',journal:'记录',habit:'习惯',period:'月经记录'}
export const DEFAULT_SETTINGS_GROUP_ORDER = ['navigation','layout','tasks','focus','random','tags','weather','encouragement','wordcloud','sync','data','links'] as const
export type SettingsGroupKey = typeof DEFAULT_SETTINGS_GROUP_ORDER[number]
export const SETTINGS_GROUP_LABELS:Record<SettingsGroupKey,string> = {navigation:'导航',layout:'排序与布局',tasks:'日历任务',focus:'专注',random:'随机选择',tags:'标签',weather:'天气与情绪',encouragement:'鼓励语',wordcloud:'词云',sync:'云同步',data:'数据',links:'友情链接'}
function normalizeOrder<T extends string>(input:unknown, defaults:readonly T[]):T[] {
 const out:T[]=[]
 if(Array.isArray(input)) for(const item of input) if(typeof item==='string'&&defaults.includes(item as T)&&!out.includes(item as T))out.push(item as T)
 return [...out,...defaults.filter(item=>!out.includes(item))]
}
export const normalizeDaySectionOrder=(input:unknown):DaySectionKey[]=>normalizeOrder(input,DEFAULT_DAY_SECTION_ORDER)
export const normalizeSettingsGroupOrder=(input:unknown):SettingsGroupKey[]=>normalizeOrder(input,DEFAULT_SETTINGS_GROUP_ORDER)
export function moveLayoutItem<T extends string>(order:readonly T[],source:T,target:T,after=false):T[] {
 const out=[...order]
 if(source===target||!out.includes(source)||!out.includes(target))return out
 out.splice(out.indexOf(source),1)
 out.splice(out.indexOf(target)+(after?1:0),0,source)
 return out
}
const ENTITY_MODULE:Record<string,ModuleKey|undefined>={task:'task',note:'note',notebook:'note',habit:'habit',habitCheckIn:'habit',journal:'journal',mood:'journal',energy:'journal',environment:'journal',period:'journal',anniversary:'anniversary',focus:'focus'}
/** Sorting is presentation-only; never change counts, merge operations, or entity ownership. */
export function syncPreviewRowsByModule<T extends {entityType:string}>(rows:readonly T[],order:readonly ModuleKey[]):T[] {
 const modules=normalizeModuleOrder(order)
 return rows.map((row,index)=>({row,index})).sort((a,b)=>{
  const rank=(type:string)=>{const module=ENTITY_MODULE[type];return module?modules.indexOf(module):modules.length}
  return rank(a.row.entityType)-rank(b.row.entityType)||a.index-b.index
 }).map(item=>item.row)
}
