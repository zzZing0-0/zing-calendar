import type { EmotionGroup, EmotionOption, JournalImpact } from '../types'

export const EMOTION_OPTIONS_AT = '2026-10-06T00:00:00.000Z'
const names: Record<EmotionGroup, string[]> = {
  negative: ['愤怒','烦躁','委屈','伤心','难过','孤独','焦虑','紧张','害怕','担忧','失望','沮丧','无助','压力','厌恶','嫉妒','尴尬','内疚','后悔','挫败'],
  neutral: ['平静','无聊','惊讶','困惑','麻木'],
  positive: ['开心','满足','放松','安心','期待','兴奋','归属感','感动','自豪','感激','好奇'],
}
export const EMOTION_GROUP_LABEL: Record<EmotionGroup,string> = { negative:'负向', neutral:'中性', positive:'正向' }
export const DEFAULT_EMOTION_OPTIONS: EmotionOption[] = (Object.keys(names) as EmotionGroup[]).flatMap(group => names[group].map((name,index)=>({
  id:`emotion:${group}:${index}`, name, group, order:index, builtin:true, updatedAt:EMOTION_OPTIONS_AT,
})))

export function normalizeEmotionOptions(rows: EmotionOption[] | undefined): EmotionOption[] {
  if (!Array.isArray(rows) || !rows.length) return DEFAULT_EMOTION_OPTIONS.map(item=>({...item}))
  const builtins = DEFAULT_EMOTION_OPTIONS.map(base => {
    const existing=rows.find(item=>item.id===base.id)
    return existing ? {...base, archived:existing.archived, updatedAt:existing.updatedAt||base.updatedAt} : {...base}
  })
  const custom=rows.filter(item=>!item.builtin&&!DEFAULT_EMOTION_OPTIONS.some(base=>base.id===item.id))
    .filter(item=>item && item.id && item.name && ['negative','neutral','positive'].includes(item.group))
  return [...builtins,...custom]
}
export function sortEmotionOptionsBuiltinsFirst(rows: EmotionOption[]) {
  return [...rows].sort((a,b)=>Number(Boolean(b.builtin))-Number(Boolean(a.builtin))||a.order-b.order)
}

export function emotionGroupOrder(impact: JournalImpact): EmotionGroup[] {
  return impact < 0 ? ['negative','neutral','positive'] : impact > 0 ? ['positive','neutral','negative'] : ['neutral','positive','negative']
}
export function toggleEmotionId(ids:string[], id:string, max=3): string[] {
  if (ids.includes(id)) return ids.filter(item=>item!==id)
  return ids.length >= max ? ids : [...ids,id]
}
export function sanitizeEmotionIds(ids: unknown, options: EmotionOption[], max=3): string[] {
  if (!Array.isArray(ids)) return []
  const valid=new Set(options.filter(item=>!item.deletedAt).map(item=>item.id))
  return [...new Set(ids.filter((id):id is string=>typeof id==='string'&&valid.has(id)))].slice(0,max)
}
export function emotionNameTaken(rows:EmotionOption[], name:string, exceptId?:string) {
  const key=name.trim().toLocaleLowerCase(); return rows.some(item=>item.id!==exceptId&&!item.deletedAt&&item.name.trim().toLocaleLowerCase()===key)
}
export function createEmotionOption(rows:EmotionOption[], id:string, name:string, group:EmotionGroup, updatedAt:string) {
  if(!name.trim()||emotionNameTaken(rows,name)) return rows
  const order=Math.max(-1,...rows.filter(x=>x.group===group&&!x.deletedAt).map(x=>x.order))+1
  return [...rows,{id,name:name.trim(),group,order,updatedAt}]
}
export function updateEmotionOption(rows:EmotionOption[], id:string, patch:Partial<Pick<EmotionOption,'name'|'group'|'archived'>>, updatedAt:string) {
  return rows.map(item=>item.id===id?{...item,...patch,updatedAt}:item)
}

export function deleteEmotionOption(rows:EmotionOption[], id:string, updatedAt:string) { return rows.map(item=>item.id===id?{...item,deletedAt:updatedAt,updatedAt}:item) }
