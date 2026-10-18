import { expect,test } from '@playwright/test'
import { parseBackupEntries } from '../../src/domain/backup'

const json=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value))
const archive=()=>new Map<string,Uint8Array>([
 ['manifest.json',json({format:'zing-calendar-backup',schemaVersion:1,counts:{},attachments:[]})],
 ...['tasks','journals','moods','tags','anniversaries'].map(name=>[`data/${name}.json`,json([])] as [string,Uint8Array]),
 ['data/settings.json',json({})],
])

for(const settings of [{wordCloudIgnored:[null]},{dateFormat:'unknown'},{weatherOptions:'wrong'}, {showEndedTasks:'true'}]) {
 test(`invalid settings ${JSON.stringify(settings)} are rejected before restore`,()=>{
  const entries=archive();entries.set('data/settings.json',json(settings))
  expect(()=>parseBackupEntries(entries)).toThrow()
 })
}

test('an archive cannot restore a live or trashed attachment reference without its binary',()=>{
 const entries=archive();entries.set('data/tasks.json',json([{id:'task',trashedAt:'2026-10-18',attachments:[{storageKey:'missing'}]}]))
 expect(()=>parseBackupEntries(entries)).toThrow('缺少被引用的附件')
})

test('legacy missing optional stores still parse identically on repeated import',()=>{
 const entries=archive();entries.set('data/tasks.json',json([{id:'old',title:'旧数据'}]))
 const first=parseBackupEntries(entries),second=parseBackupEntries(entries)
 expect(second).toEqual(first)
 expect(first.notes).toEqual([]);expect(first.habits).toEqual([])
 expect(first.tasks).toEqual([{id:'old',title:'旧数据'}])
})

test('an attachment cannot point at structured JSON instead of the attachments directory',()=>{
 const entries=archive();entries.set('manifest.json',json({format:'zing-calendar-backup',schemaVersion:1,counts:{},attachments:[{storageKey:'bad',path:'data/tasks.json',mimeType:'image/png',type:'image',size:2}]}))
 expect(()=>parseBackupEntries(entries)).toThrow('路径或类型无效')
})
