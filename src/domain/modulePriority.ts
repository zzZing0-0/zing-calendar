/** Global module priority affects category tabs only, never result ordering. */
export const DEFAULT_MODULE_ORDER = ['task','note','habit','journal','anniversary','focus'] as const
export type ModuleKey = typeof DEFAULT_MODULE_ORDER[number]
export function normalizeModuleOrder(input:unknown):ModuleKey[] {
 const valid = new Set<string>(DEFAULT_MODULE_ORDER)
 const unique:ModuleKey[]=[]
 if(Array.isArray(input)) for(const item of input) if(typeof item==='string'&&valid.has(item)&&!unique.includes(item as ModuleKey))unique.push(item as ModuleKey)
 return [...unique,...DEFAULT_MODULE_ORDER.filter(key=>!unique.includes(key))]
}
export function moveModule(order:readonly ModuleKey[],source:ModuleKey,target:ModuleKey,after=false):ModuleKey[] {
 const next=normalizeModuleOrder(order)
 if(source===target||!next.includes(source)||!next.includes(target))return next
 next.splice(next.indexOf(source),1)
 next.splice(next.indexOf(target)+(after?1:0),0,source)
 return next
}
export function orderedCategories<T extends readonly (readonly [string,string])[]>(categories:T,order:readonly ModuleKey[]):Array<T[number]> {
 const ranking=normalizeModuleOrder(order)
 return [...categories].sort((a,b)=>{
  const rank=(key:string)=>key==='all'||key==='both'?-1:ranking.indexOf(key as ModuleKey)<0?999:ranking.indexOf(key as ModuleKey)
  return rank(a[0])-rank(b[0])
 })
}
