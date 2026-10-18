import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { FocusSession, Tag, Task, TaskPriority, TaskStatus } from '../../types'
import { saveFocusSessions, saveTags, saveTasks } from '../../db/calendar'
import { normalizeTaskScheduling } from '../../domain/task'
import { cleanDidaContent, didaIso, forestDate, genericDate, genericHeaderIndex, parseCsvRows, parseDidaRecurrence, splitImportedTagNames, stableImportHash, zonedParts } from '../../domain/import'
import { DEFAULT_TAG_ID, GENERIC_SOURCE_TAG, GENERIC_SOURCE_TAG_ID, DIDA_APP_SOURCE_TAG, DIDA_APP_SOURCE_TAG_ID, EXTERNAL_SOURCE_TAG, EXTERNAL_SOURCE_TAG_ID, FOREST_SOURCE_TAG, FOREST_SOURCE_TAG_ID, TAG_COLORS } from '../../domain/preferences'
import { normalizedTagName } from '../../domain/tags'

export type ExternalImportStage = 'sources' | 'generic-file' | 'generic-preview' | 'dida-file' | 'dida-preview' | 'forest-file' | 'forest-preview'
export type DidaImportPreview = { fileName:string; total:number; tasks:Task[]; tags:Tag[]; duplicateCount:number; skippedNoDate:number; strippedAttachmentCount:number; ignoredChecklistCount:number }
export type ForestImportPreview = { fileName:string; total:number; sessions:FocusSession[]; tags:Tag[]; duplicateCount:number; failedCount:number; invalidCount:number; createdTagCount:number; reusedTagCount:number }

type Args = {
  tasks: Task[]; tags: Tag[]; focusSessions: FocusSession[]; defaultPriority: TaskPriority
  setTasks: Dispatch<SetStateAction<Task[]>>; setTags: Dispatch<SetStateAction<Tag[]>>; setFocusSessions: Dispatch<SetStateAction<FocusSession[]>>
}

export function useExternalImport({tasks,tags,focusSessions,defaultPriority,setTasks,setTags,setFocusSessions}:Args) {
  const [externalImportOpen, setExternalImportOpen] = useState(false)
  const [externalImportStage, setExternalImportStage] = useState<ExternalImportStage>('sources')
  const [didaImportPreview, setDidaImportPreview] = useState<DidaImportPreview|null>(null)
  const [forestImportPreview, setForestImportPreview] = useState<ForestImportPreview|null>(null)
  const [externalImportBusy, setExternalImportBusy] = useState(false)
  const [externalImportMessage, setExternalImportMessage] = useState('')
  const externalImportInputRef = useRef<HTMLInputElement|null>(null)
  const openExternalImport = () => {
    setExternalImportOpen(true); setExternalImportStage('sources'); setDidaImportPreview(null); setForestImportPreview(null); setExternalImportMessage('')
  }
  const closeExternalImport = () => {
    if(externalImportBusy) return
    setExternalImportOpen(false); setExternalImportStage('sources'); setDidaImportPreview(null); setForestImportPreview(null); setExternalImportMessage('')
    if(externalImportInputRef.current) externalImportInputRef.current.value=''
  }
  const inspectGenericCsv = async (file:File) => {
    setExternalImportBusy(true); setExternalImportMessage('正在识别通用 CSV…')
    try {
      const text=await file.text(), rows=parseCsvRows(text)
      if(rows.length<2) throw new Error('CSV 中没有可导入的数据')
      const headerIndex=rows.findIndex(row=>{
        const title=genericHeaderIndex(row,['标题','任务','任务名称','title','task','name'])
        const date=genericHeaderIndex(row,['日期','开始日期','任务日期','date','startdate','start'])
        return title>=0 && date>=0
      })
      if(headerIndex<0) throw new Error('至少需要“标题”和“日期”两列')
      const header=rows[headerIndex], sourceRows=rows.slice(headerIndex+1).filter(row=>row.some(cell=>cell.trim()))
      const col={
        id:genericHeaderIndex(header,['taskid','id','任务id']),
        date:genericHeaderIndex(header,['日期','开始日期','任务日期','date','startdate','start']),
        end:genericHeaderIndex(header,['结束日期','enddate','end']),
        title:genericHeaderIndex(header,['标题','任务','任务名称','title','task','name']),
        notes:genericHeaderIndex(header,['描述','备注','笔记','notes','note','description','content']),
        subtask:genericHeaderIndex(header,['子任务','checklist','subtask','subtasks']),
        status:genericHeaderIndex(header,['是否完成','完成','状态','completed','done','status']),
        category:genericHeaderIndex(header,['分类','标签','tags','tag','category','list']),
        priority:genericHeaderIndex(header,['优先级','priority']),
        time:genericHeaderIndex(header,['时间','开始时间','time','starttime']),
      }
      const existingIds=new Set(tasks.map(task=>task.id))
      const tagByName=new Map<string,Tag>(tags.map(tag=>[normalizedTagName(tag.name),tag] as [string,Tag]))
      const importedTags:Tag[]=[]
      let duplicateCount=0, skippedNoDate=0
      const converted:Task[]=[]
      sourceRows.forEach((row,rowIndex)=>{
        const cell=(index:number)=>index>=0?(row[index]??'').trim():''
        const title=cell(col.title); if(!title) return
        const date=genericDate(cell(col.date)); if(!date){skippedNoDate++;return}
        const sourceId=cell(col.id)||`${date}:${title}:${rowIndex+1}`
        const id=`import:generic:${sourceId}`
        if(existingIds.has(id)){duplicateCount++;return}
        existingIds.add(id)
        const category=cell(col.category)
        const ordinaryTagIds:string[]=[]
        category.split(/[;,，、|]/).map(v=>v.trim()).filter(Boolean).forEach(name=>{
          const key=name.toLowerCase(); let tag=tagByName.get(key)
          if(!tag){
            tag={id:`import:generic:tag:${crypto.randomUUID()}`,name,color:TAG_COLORS[(tagByName.size+importedTags.length)%TAG_COLORS.length],scope:'task',updatedAt:new Date().toISOString()}
            tagByName.set(key,tag); importedTags.push(tag)
          }
          ordinaryTagIds.push(tag.id)
        })
        const tagIds=ordinaryTagIds.length?[ordinaryTagIds[0],EXTERNAL_SOURCE_TAG_ID,GENERIC_SOURCE_TAG_ID]:[DEFAULT_TAG_ID,EXTERNAL_SOURCE_TAG_ID,GENERIC_SOURCE_TAG_ID]
        const statusText=cell(col.status).toLowerCase()
        const completed=['yes','y','true','1','完成','已完成','done','completed'].includes(statusText)
        const abandoned=['放弃','已放弃','abandoned','cancelled','canceled'].includes(statusText)
        const status:TaskStatus=completed?'completed':abandoned?'abandoned':'todo'
        const priorityText=cell(col.priority)
        const p=Number.parseInt(priorityText,10)
        const priority:TaskPriority=Number.isFinite(p)&&p>=0&&p<=3?p as TaskPriority:defaultPriority
        const noteParts=[cell(col.notes),cell(col.subtask)].filter(Boolean)
        const timeRaw=cell(col.time).match(/(\d{1,2}):(\d{2})/)
        const time=timeRaw?`${timeRaw[1].padStart(2,'0')}:${timeRaw[2]}`:undefined
        const endDate=genericDate(cell(col.end))
        const createdAt=`${date}T12:00:00`
        converted.push({
          id,title,date,...(endDate&&endDate!==date?{endDate}:{}),priority,status,allDay:!time,...(time?{time}:{}),
          ...(noteParts.length?{notes:noteParts.join('\n\n')}:{}),
          createdAt,updatedAt:new Date().toISOString(),
          ...(status==='completed'?{completedAt:`${date}T12:00:00`}:{}),
          tagIds
        })
      })
      const requiredSystemTags=[EXTERNAL_SOURCE_TAG,GENERIC_SOURCE_TAG].filter(required=>!tags.some(tag=>tag.id===required.id))
      const finalTags=[...requiredSystemTags,...importedTags]
      setDidaImportPreview({fileName:file.name,total:sourceRows.length,tasks:converted,tags:finalTags,duplicateCount,skippedNoDate,strippedAttachmentCount:0,ignoredChecklistCount:0})
      setExternalImportStage('generic-preview'); setExternalImportMessage('')
    } catch(error) {
      console.error('Failed to inspect generic CSV',error)
      setDidaImportPreview(null); setExternalImportMessage(error instanceof Error?`无法读取：${error.message}`:'无法读取这个文件')
    } finally {
      setExternalImportBusy(false)
      if(externalImportInputRef.current) externalImportInputRef.current.value=''
    }
  }
  const inspectDidaCsv = async (file:File) => {
    setExternalImportBusy(true); setExternalImportMessage('正在解析滴答清单…')
    try {
      const text=await file.text(), rows=parseCsvRows(text)
      const headerIndex=rows.findIndex(row=>row[0]==='Folder Name' && row.includes('Title') && row.includes('taskId'))
      if(headerIndex<0) throw new Error('没有找到滴答清单 CSV 表头')
      const header=rows[headerIndex]
      const sourceRows=rows.slice(headerIndex+1).filter(row=>row.some(cell=>cell.trim()))
      const existingIds=new Set(tasks.map(task=>task.id))
      const tagByName=new Map<string,Tag>(tags.map(tag=>[normalizedTagName(tag.name),tag] as [string,Tag]))
      const importedTags:Tag[]=[]
      let duplicateCount=0, skippedNoDate=0, strippedAttachmentCount=0, ignoredChecklistCount=0
      const converted:Task[]=[]
      sourceRows.forEach((row,rowIndex)=>{
        const get=(name:string)=>row[header.indexOf(name)] ?? ''
        const taskId=get('taskId').trim() || `row-${rowIndex+1}`
        const id=`import:dida:${taskId}`
        if(existingIds.has(id)){ duplicateCount++; return }
        existingIds.add(id)
        const timezone=get('Timezone') || 'Asia/Shanghai'
        const start=zonedParts(get('Start Date'),timezone), due=zonedParts(get('Due Date'),timezone)
        const base=start ?? due
        if(!base){ skippedNoDate++; return }
        const allDay=get('Is All Day').toLowerCase()==='true'
        const content=cleanDidaContent(get('Content')); strippedAttachmentCount+=content.removed
        if(get('Kind')==='CHECKLIST' || get('Is Check list')==='Y') ignoredChecklistCount++
        const ordinaryTagIds:string[]=[]
        splitImportedTagNames(get('Tags')).forEach(name=>{
          const key=name.toLowerCase()
          let tag=tagByName.get(key)
          if(!tag){
            tag={id:`import:dida:tag:${crypto.randomUUID()}`,name,color:TAG_COLORS[(tagByName.size+importedTags.length)%TAG_COLORS.length],scope:'task',updatedAt:new Date().toISOString()}
            tagByName.set(key,tag); importedTags.push(tag)
          }
          ordinaryTagIds.push(tag.id)
        })
        const tagIds=ordinaryTagIds.length ? [ordinaryTagIds[0],EXTERNAL_SOURCE_TAG_ID,DIDA_APP_SOURCE_TAG_ID] : [DEFAULT_TAG_ID,EXTERNAL_SOURCE_TAG_ID,DIDA_APP_SOURCE_TAG_ID]
        const statusRaw=get('Status')
        const status:TaskStatus=statusRaw==='2'?'completed':statusRaw==='-1'?'abandoned':'todo'
        const priorityRaw=Number.parseInt(get('Priority')||'0',10)
        const priority:TaskPriority=priorityRaw>=5?3:priorityRaw>=3?2:priorityRaw>=1?1:0
        const createdRaw=didaIso(get('Created Time'))
        const completedRaw=didaIso(get('Completed Time'))
        const recurrence=parseDidaRecurrence(get('Repeat'))
        const endDate=due && due.date!==base.date ? due.date : undefined
        converted.push({
          id,title:get('Title').trim() || '未命名任务',date:base.date,...(endDate?{endDate}:{}),priority,status,allDay,
          ...(!allDay?{time:base.time}:{}),
          ...(content.text?{notes:content.text}:{}),
          createdAt:createdRaw && !Number.isNaN(new Date(createdRaw).getTime()) ? new Date(createdRaw).toISOString() : new Date().toISOString(),
          updatedAt:new Date().toISOString(),
          ...(status==='completed' && completedRaw && !Number.isNaN(new Date(completedRaw).getTime())?{completedAt:new Date(completedRaw).toISOString()}:{}),
          tagIds,...(recurrence?{recurrence}:{})
        })
      })
      const requiredSystemTags=[EXTERNAL_SOURCE_TAG,DIDA_APP_SOURCE_TAG].filter(required=>!tags.some(tag=>tag.id===required.id))
      const finalTags=[...requiredSystemTags,...importedTags]
      setDidaImportPreview({fileName:file.name,total:sourceRows.length,tasks:converted,tags:finalTags,duplicateCount,skippedNoDate,strippedAttachmentCount,ignoredChecklistCount})
      setExternalImportStage('dida-preview'); setExternalImportMessage('')
    } catch(error) {
      console.error('Failed to inspect Dida CSV',error)
      setDidaImportPreview(null); setExternalImportMessage(error instanceof Error?`无法读取：${error.message}`:'无法读取这个文件')
    } finally {
      setExternalImportBusy(false)
      if(externalImportInputRef.current) externalImportInputRef.current.value=''
    }
  }
  const inspectForestCsv = async (file:File) => {
    setExternalImportBusy(true); setExternalImportMessage('正在解析 Forest…')
    try {
      const text=await file.text(), rows=parseCsvRows(text)
      const headerIndex=rows.findIndex(row=>row.includes('Start Time')&&row.includes('End Time')&&row.includes('Tag')&&row.includes('Is Success'))
      if(headerIndex<0) throw new Error('没有找到 Forest CSV 表头')
      const header=rows[headerIndex], sourceRows=rows.slice(headerIndex+1).filter(row=>row.some(cell=>cell.trim()))
      const startCol=header.indexOf('Start Time'), endCol=header.indexOf('End Time'), tagCol=header.indexOf('Tag'), successCol=header.indexOf('Is Success')
      const existingIds=new Set(focusSessions.map(session=>session.id))
      const tagByName=new Map<string,Tag>(tags.map(tag=>[normalizedTagName(tag.name),tag] as [string,Tag]))
      const importedTags:Tag[]=[]; const reusedNames=new Set<string>()
      let duplicateCount=0, failedCount=0, invalidCount=0
      const sessions:FocusSession[]=[]
      sourceRows.forEach(row=>{
        const success=(row[successCol]??'').trim().toLowerCase()
        if(success!=='true'){ failedCount++; return }
        const startRaw=(row[startCol]??'').trim(), endRaw=(row[endCol]??'').trim(), forestTag=(row[tagCol]??'').trim()
        const start=forestDate(startRaw), end=forestDate(endRaw)
        if(!start||!end||end.getTime()<start.getTime()){ invalidCount++; return }
        const normalizedForestTag=forestTag&&forestTag!=='未设置'?forestTag:'默认'
        const identity=`${startRaw}|${endRaw}|${forestTag}`
        const id=`import:forest:${stableImportHash(identity)}`
        if(existingIds.has(id)){ duplicateCount++; return }
        existingIds.add(id)
        let ordinaryTag=tagByName.get(normalizedForestTag.toLowerCase())
        if(!ordinaryTag){
          ordinaryTag={id:`import:forest:tag:${stableImportHash(normalizedForestTag.toLowerCase())}`,name:normalizedForestTag,color:TAG_COLORS[(tagByName.size+importedTags.length)%TAG_COLORS.length],scope:'focus',updatedAt:new Date().toISOString()}
          tagByName.set(normalizedForestTag.toLowerCase(),ordinaryTag); importedTags.push(ordinaryTag)
        } else if(ordinaryTag.id!==DEFAULT_TAG_ID) {
          reusedNames.add(ordinaryTag.id)
          if(ordinaryTag.scope!=='both'&&ordinaryTag.scope!=='focus'){
            ordinaryTag={...ordinaryTag,scope:'both',updatedAt:new Date().toISOString()}
            tagByName.set(normalizedForestTag.toLowerCase(),ordinaryTag)
            const index=importedTags.findIndex(tag=>tag.id===ordinaryTag!.id)
            if(index>=0) importedTags[index]=ordinaryTag
            else importedTags.push(ordinaryTag)
          }
        }
        const startedAt=start.toISOString(), endedAt=end.toISOString()
        sessions.push({id,tagIds:[...new Set([ordinaryTag.id,EXTERNAL_SOURCE_TAG_ID,FOREST_SOURCE_TAG_ID])],mode:'stopwatch',startedAt,endedAt,durationSeconds:Math.max(0,Math.round((end.getTime()-start.getTime())/1000)),createdAt:startedAt,updatedAt:new Date().toISOString()})
      })
      const requiredSystemTags=[EXTERNAL_SOURCE_TAG,FOREST_SOURCE_TAG].filter(required=>!tags.some(tag=>tag.id===required.id))
      setForestImportPreview({fileName:file.name,total:sourceRows.length,sessions,tags:[...requiredSystemTags,...importedTags],duplicateCount,failedCount,invalidCount,createdTagCount:importedTags.filter(tag=>!tags.some(existing=>existing.id===tag.id)).length,reusedTagCount:reusedNames.size})
      setExternalImportStage('forest-preview'); setExternalImportMessage('')
    } catch(error) {
      console.error('Failed to inspect Forest CSV',error)
      setForestImportPreview(null); setExternalImportMessage(error instanceof Error?`无法读取：${error.message}`:'无法读取这个文件')
    } finally {
      setExternalImportBusy(false)
      if(externalImportInputRef.current) externalImportInputRef.current.value=''
    }
  }
  const importForestCsv = async () => {
    if(!forestImportPreview || externalImportBusy) return
    setExternalImportBusy(true); setExternalImportMessage('正在导入 Forest 专注记录…')
    try {
      const mergedSessions=[...focusSessions,...forestImportPreview.sessions]
      const importedTagById=new Map(forestImportPreview.tags.map(tag=>[tag.id,tag] as const))
      const mergedTags=[...tags.map(tag=>importedTagById.get(tag.id)??tag),...forestImportPreview.tags.filter(tag=>!tags.some(existing=>existing.id===tag.id))]
      await Promise.all([saveFocusSessions(mergedSessions),saveTags(mergedTags)])
      setFocusSessions(mergedSessions); setTags(mergedTags)
      const imported=forestImportPreview.sessions.length
      setForestImportPreview(null); setExternalImportMessage(`已导入 ${imported} 条 Forest 专注记录`)
      setExternalImportStage('sources')
    } catch(error) {
      console.error('Failed to import Forest CSV',error)
      setExternalImportMessage(error instanceof Error?`导入失败：${error.message}`:'导入失败')
    } finally { setExternalImportBusy(false) }
  }
  const importDidaCsv = async () => {
    if(!didaImportPreview || externalImportBusy) return
    setExternalImportBusy(true); setExternalImportMessage('正在导入…')
    try {
      const mergedTasks=[...tasks,...didaImportPreview.tasks].map(normalizeTaskScheduling)
      const existingTagIds=new Set(tags.map(tag=>tag.id))
      const mergedTags=[...tags,...didaImportPreview.tags.filter(tag=>!existingTagIds.has(tag.id))]
      await Promise.all([saveTasks(mergedTasks),saveTags(mergedTags)])
      setTasks(mergedTasks); setTags(mergedTags)
      const imported=didaImportPreview.tasks.length
      setDidaImportPreview(null); setExternalImportMessage(`已导入 ${imported} 条任务`)
      setExternalImportStage('sources')
    } catch(error) {
      console.error('Failed to import Dida CSV',error)
      setExternalImportMessage(error instanceof Error?`导入失败：${error.message}`:'导入失败')
    } finally { setExternalImportBusy(false) }
  }


  return { externalImportOpen, externalImportStage, didaImportPreview, forestImportPreview, externalImportBusy, externalImportMessage, externalImportInputRef, openExternalImport, closeExternalImport, setExternalImportStage, setDidaImportPreview, setForestImportPreview, setExternalImportMessage, inspectGenericCsv, inspectDidaCsv, inspectForestCsv, importForestCsv, importDidaCsv }
}

export type ExternalImportController = ReturnType<typeof useExternalImport>
