import type * as React from 'react'
import { csvCell } from '../../domain/backup'
import {
  ANNIVERSARY_TYPES
} from '../../domain/calendar'
import {
  DEFAULT_TAG_ID,
  isImportSourceTag, isImportSourceTagId
} from '../../domain/preferences'
import {
  toDateKey
} from '../../domain/task'
import type { Anniversary, AnniversaryType, EmotionOption, FocusSession, JournalEntry, Tag, Task } from '../../types'
import { downloadTextFile } from './downloadTextFile'
interface Dependencies {
  activeAnniversaries: Anniversary[]
  activeJournalEntries: JournalEntry[]
  activeTasks: Task[]
  emotionOptions: EmotionOption[]
  focusSessions: FocusSession[]
  setBackupMessage: React.Dispatch<React.SetStateAction<string>>
  tags: Tag[]
}

export function createCsvExports({ activeAnniversaries, activeJournalEntries, activeTasks, emotionOptions, focusSessions, setBackupMessage, tags }: Dependencies) {
  const exportTasksCsv = () => {
    const tagName=(id:string)=>tags.find(tag=>tag.id===id)?.name ?? id
    const rows=[
      ['id','title','start_date','end_date','all_day','time','priority','status','deadline','completed_at','original_date','postpone_count','repeat_rule','tags','notes','attachment_count','created_at','updated_at'],
      ...activeTasks.map(task=>[
        task.id,task.title,task.date,task.endDate??'',task.allDay,task.time??'',`P${task.priority}`,task.status,task.deadline??'',task.completedAt??'',task.originalDate??'',
        task.postponeHistory?.length??0,task.recurrence?JSON.stringify(task.recurrence):'',(task.tagIds??[]).map(tagName).join(' | '),task.notes??'',task.attachments?.length??0,task.createdAt,task.updatedAt
      ])
    ]
    const csv=rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
    downloadTextFile(`zing-tasks-${toDateKey(new Date())}.csv`,csv,'text/csv;charset=utf-8')
    setBackupMessage(`任务 CSV 已导出 · ${activeTasks.length} 条`)
  }

  const exportJournalsCsv = () => {
    const tagName=(id:string)=>tags.find(tag=>tag.id===id)?.name ?? id
    const rows=[
      ['id','date','title','event_impact','emotions','tags','body_markdown','message_count','messages','image_count','audio_count','created_at','updated_at'],
      ...activeJournalEntries.map(entry=>[
        entry.id,entry.date,entry.title,entry.impact,(entry.emotionIds??[]).map(id=>emotionOptions.find(item=>item.id===id)?.name??id).join(' | '),(entry.tagIds??[]).map(tagName).join(' | '),entry.content??'',(entry.messages??[]).length,(entry.messages??[]).map(message=>`[${message.createdAt}] ${message.content}`).join('\n\n'),
        (entry.attachments??[]).filter(item=>item.type==='image').length,(entry.attachments??[]).filter(item=>item.type==='audio').length,entry.createdAt,entry.updatedAt
      ])
    ]
    const csv=rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
    downloadTextFile(`zing-journals-${toDateKey(new Date())}.csv`,csv,'text/csv;charset=utf-8')
    setBackupMessage(`记录 CSV 已导出 · ${activeJournalEntries.length} 条`)
  }

  const exportFocusCsv = () => {
    const tagById=(id:string)=>tags.find(tag=>tag.id===id)
    const rows=[
      ['id','start_time','end_time','duration_minutes','mode','planned_minutes','tag','source','created_at','updated_at'],
      ...focusSessions.map(session=>{
        const ordinaryTagId=(session.tagIds??[]).find(id=>id===DEFAULT_TAG_ID||!isImportSourceTagId(id)) ?? DEFAULT_TAG_ID
        const ordinaryTag=tagById(ordinaryTagId)
        const sources=(session.tagIds??[]).map(tagById).filter((tag): tag is Tag=>Boolean(tag&&isImportSourceTag(tag))).map(tag=>tag.name)
        return [
          session.id,session.startedAt,session.endedAt??'',Math.round(((session.durationSeconds??0)/60)*100)/100,session.mode,
          session.plannedSeconds==null?'':Math.round((session.plannedSeconds/60)*100)/100,ordinaryTag?.name??ordinaryTagId,sources.length?sources.join(' | '):'Zing',session.createdAt,session.updatedAt
        ]
      })
    ]
    const csv=rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
    downloadTextFile(`zing-focus-${toDateKey(new Date())}.csv`,csv,'text/csv;charset=utf-8')
    setBackupMessage(`专注 CSV 已导出 · ${focusSessions.length} 条`)
  }

  const exportAnniversariesCsv = () => {
    const typeLabel=(value:AnniversaryType)=>ANNIVERSARY_TYPES.find(item=>item.value===value)?.label ?? value
    const rows=[
      ['id','title','type','calendar','year','month','day','leap_month','repeat_yearly','notes','created_at','updated_at'],
      ...activeAnniversaries.map(anniversary=>[
        anniversary.id,anniversary.title,typeLabel(anniversary.type),anniversary.calendar,anniversary.year??'',anniversary.month,anniversary.day,
        anniversary.isLeapMonth??false,anniversary.repeatYearly,anniversary.notes??'',anniversary.createdAt,anniversary.updatedAt
      ])
    ]
    const csv=rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
    downloadTextFile(`zing-anniversaries-${toDateKey(new Date())}.csv`,csv,'text/csv;charset=utf-8')
    setBackupMessage(`纪念日 CSV 已导出 · ${activeAnniversaries.length} 条`)
  }

  return { exportAnniversariesCsv, exportFocusCsv, exportJournalsCsv, exportTasksCsv }
}
