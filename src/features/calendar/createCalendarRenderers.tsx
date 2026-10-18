import type * as React from 'react'
import type { CSSProperties } from 'react'
import { Button } from '../../components/ui/Button'
import {
  anniversaryIcon,
  anniversaryOccurrence,
  calendarAnnotation,
  lunarCalendarLabel
} from '../../domain/calendar'
import {
  applyRecurringDisplayMode, buildMonth, buildMultiDaySegments,
  expandTasks, formatDate,
  isMultiDayTask,
  sameDay,
  taskEndDate,
  taskSort, toDateKey
} from '../../domain/task'
import type {
  Anniversary,
  CalendarDay,
  Task
} from '../../types'
interface Dependencies {
  activeAnniversaries: Anniversary[]
  activeTasks: Task[]
  menstrualVisualForDate: (key: string) => "" | "actual" | "predicted"
  openDay: (date: Date) => void
  openDayRef: React.RefObject<(date: Date) => void>
  selectedDate: Date | null
  showAllRecurringTasks: boolean
  showEndedTasks: boolean
  today: Date
  weekStartsMonday: boolean
}

export function createCalendarRenderers({ activeAnniversaries, activeTasks, menstrualVisualForDate, openDay, openDayRef, selectedDate, showAllRecurringTasks, showEndedTasks, today, weekStartsMonday }: Dependencies) {
  const renderCalendarMonthGrid = (month: Date) => {
    const monthDays = buildMonth(month.getFullYear(), month.getMonth(), weekStartsMonday)
    const rangeStart = toDateKey(monthDays[0].date), rangeEnd = toDateKey(monthDays[monthDays.length-1].date)
    const monthDisplayTasks = (() => {
      const expanded=applyRecurringDisplayMode(expandTasks(activeTasks,rangeStart,rangeEnd),activeTasks,showAllRecurringTasks)
      return showEndedTasks ? expanded : expanded.filter(task=>task.status==='todo')
    })()
    const monthTasksByDate = new Map<string,Task[]>()
    monthDisplayTasks.filter(task=>!isMultiDayTask(task)).forEach(task=>{
      if (!task.date) return; const current=monthTasksByDate.get(task.date)??[]; current.push(task); current.sort(taskSort); monthTasksByDate.set(task.date,current)
    })
    const monthSegments=buildMultiDaySegments(monthDisplayTasks,monthDays)
    const monthOccupied=monthDays.map((_,dayIndex)=>{
      const week=Math.floor(dayIndex/7), column=dayIndex%7
      return new Set(monthSegments.filter(segment=>segment.week===week && column>=segment.startColumn && column<segment.startColumn+segment.span).map(segment=>segment.lane).filter(lane=>lane>=0&&lane<5))
    })
    const monthAnniversaries=new Map<string,{anniversary:Anniversary;occurrence:Date}[]>()
    const years=Array.from(new Set(monthDays.map(day=>day.date.getFullYear())))
    activeAnniversaries.forEach(anniversary=>years.forEach(year=>{
      const occurrence=anniversaryOccurrence(anniversary,year); if(!occurrence)return
      const key=toDateKey(occurrence), rows=monthAnniversaries.get(key)??[]; rows.push({anniversary,occurrence}); monthAnniversaries.set(key,rows)
    }))
    return <div className="calendar-grid">
      {monthDays.map(({date,inCurrentMonth},dayIndex)=>{
        const isToday=sameDay(date,today), isSelected=selectedDate?sameDay(date,selectedDate):false, key=toDateKey(date)
        const dayTasks=monthTasksByDate.get(key)??[], occupiedLanes=monthOccupied[dayIndex]
        const freeSlots=[0,1,2,3,4].filter(slot=>!occupiedLanes.has(slot))
        const visibleCapacity=dayTasks.length<=freeSlots.length?freeSlots.length:Math.max(0,freeSlots.length-1)
        const visibleDayTasks=dayTasks.slice(0,visibleCapacity), visibleTaskSlots=freeSlots.slice(0,visibleDayTasks.length)
        const hiddenDayTaskCount=Math.max(0,dayTasks.length-visibleDayTasks.length), overflowSlot=hiddenDayTaskCount>0?freeSlots[visibleDayTasks.length]:undefined
        const anns=monthAnniversaries.get(key)??[]
        return <Button key={key} type="button" className={`day-cell${inCurrentMonth?'':' outside-month'}${isToday?' today':''}${isSelected?' selected':''}`} aria-label={formatDate(date)} data-date-key={key} onClick={()=>openDay(date)}>
          <span className={`day-number${menstrualVisualForDate(key) ? ` menstrual-${menstrualVisualForDate(key)}` : ""}`} data-month-key={date.getDate()===1?`${date.getFullYear()}-${date.getMonth()}`:undefined}>{date.getDate()}</span>
          {(()=>{const annotation=calendarAnnotation(date,weekStartsMonday);return <span className={`lunar-day-label${annotation?` calendar-annotation annotation-${annotation.kind}`:''}`}>{annotation?.label??lunarCalendarLabel(date)}</span>})()}
          {anns.length>0&&<span className="anniversary-cell-icons">{anns.slice(0,anns.length>3?2:3).map(({anniversary})=><span key={anniversary.id} title={anniversary.title}>{anniversaryIcon(anniversary.type)}</span>)}{anns.length>3&&<span className="anniversary-overflow">+{anns.length-2}</span>}</span>}
          {dayTasks.length>0&&<span className="task-preview-list">{visibleDayTasks.map((task,visibleIndex)=><span key={task.id} className={`task-preview priority-${task.priority} status-${task.status}`} style={{'--calendar-slot':visibleTaskSlots[visibleIndex]} as any}>{task.status==='todo'?<span className="priority-dot"/>:<span className="calendar-status-mark" aria-label={task.status==='completed'?'已完成':'已放弃'}>{task.status==='completed'?'✓':'×'}</span>}<span className="task-preview-title">{task.title}</span>{!task.allDay&&task.time&&<span className="task-preview-time">{task.time}</span>}</span>)}{hiddenDayTaskCount>0&&overflowSlot!==undefined&&<span className="more-tasks" style={{'--calendar-slot':overflowSlot} as any}>+{hiddenDayTaskCount}</span>}</span>}
        </Button>
      })}
      <div className="multi-day-layer">{monthSegments.map(segment=><Button key={`${segment.task.id}-${segment.week}`} type="button" className={`multi-day-bar priority-${segment.task.priority} status-${segment.task.status}`} style={{gridColumn:`${segment.startColumn+1} / span ${segment.span}`,gridRow:segment.week+1,'--lane-offset':`${segment.lane*26}px`} as CSSProperties} onClick={event=>{
        event.stopPropagation(); const rect=event.currentTarget.getBoundingClientRect(); const relativeX=Math.max(0,Math.min(rect.width-.001,event.clientX-rect.left)); const columnOffset=Math.min(segment.span-1,Math.floor(relativeX/(rect.width/segment.span))); const dayIndex=segment.week*7+segment.startColumn+columnOffset; const clickedDay=monthDays[dayIndex]?.date; if(clickedDay)openDayRef.current(clickedDay)
      }} title={`${segment.task.title} · ${segment.task.date} → ${taskEndDate(segment.task)}`}>{segment.task.status==='todo'?<span className="priority-dot"/>:<span className="calendar-status-mark" aria-label={segment.task.status==='completed'?'已完成':'已放弃'}>{segment.task.status==='completed'?'✓':'×'}</span>}<span className="multi-day-title">{segment.task.title}</span></Button>)}</div>
    </div>
  }

  // v1.2.0: mobile continuous calendar is a single stream of unique weeks.
  // A cross-month week exists exactly once; month labels are markers, not separate grids.
  const renderCalendarWeek = (weekDays: CalendarDay[], preparedTasks?: Task[], preparedAnniversaries?: Map<string,{anniversary:Anniversary;occurrence:Date}[]>) => {
    const rangeStart=toDateKey(weekDays[0].date), rangeEnd=toDateKey(weekDays[6].date)
    // The continuous mobile calendar prepares recurring tasks once for its whole
    // loaded window. A single-week fallback is retained for non-prepared callers.
    const displayTasks=preparedTasks
      ? preparedTasks.filter(task=>Boolean(task.date)&&task.date!<=rangeEnd&&taskEndDate(task)>=rangeStart)
      : (()=>{const expanded=applyRecurringDisplayMode(expandTasks(activeTasks,rangeStart,rangeEnd),activeTasks,showAllRecurringTasks);return showEndedTasks?expanded:expanded.filter(task=>task.status==='todo')})()
    const tasksByDate=new Map<string,Task[]>()
    displayTasks.filter(task=>Boolean(task.date)&&!isMultiDayTask(task)).forEach(task=>{const key=task.date!;const current=tasksByDate.get(key)??[];current.push(task);current.sort(taskSort);tasksByDate.set(key,current)})
    const segments=buildMultiDaySegments(displayTasks,weekDays)
    const occupied=weekDays.map((_,column)=>new Set(segments.filter(segment=>segment.week===0&&column>=segment.startColumn&&column<segment.startColumn+segment.span).map(segment=>segment.lane).filter(lane=>lane>=0&&lane<5)))
    const anniversaryMap=preparedAnniversaries ?? new Map<string,{anniversary:Anniversary;occurrence:Date}[]>()
    if (!preparedAnniversaries) {
      const years=Array.from(new Set(weekDays.map(day=>day.date.getFullYear())))
      activeAnniversaries.forEach(anniversary=>years.forEach(year=>{const occurrence=anniversaryOccurrence(anniversary,year);if(!occurrence)return;const key=toDateKey(occurrence);if(key<rangeStart||key>rangeEnd)return;const rows=anniversaryMap.get(key)??[];rows.push({anniversary,occurrence});anniversaryMap.set(key,rows)}))
    }
    return <div className="calendar-grid continuous-week-grid">
      {weekDays.map(({date},dayIndex)=>{
        const isToday=sameDay(date,today), isSelected=selectedDate?sameDay(date,selectedDate):false, key=toDateKey(date), dayTasks=tasksByDate.get(key)??[], occupiedLanes=occupied[dayIndex]
        const freeSlots=[0,1,2,3,4].filter(slot=>!occupiedLanes.has(slot)), visibleCapacity=dayTasks.length<=freeSlots.length?freeSlots.length:Math.max(0,freeSlots.length-1)
        const visibleDayTasks=dayTasks.slice(0,visibleCapacity), visibleTaskSlots=freeSlots.slice(0,visibleDayTasks.length), hiddenDayTaskCount=Math.max(0,dayTasks.length-visibleDayTasks.length), overflowSlot=hiddenDayTaskCount>0?freeSlots[visibleDayTasks.length]:undefined
        const anns=anniversaryMap.get(key)??[]
        return <Button key={key} type="button" className={`day-cell${isToday?' today':''}${isSelected?' selected':''}`} aria-label={formatDate(date)} data-date-key={key} onClick={()=>openDay(date)}>
          <span className={`day-number${menstrualVisualForDate(key) ? ` menstrual-${menstrualVisualForDate(key)}` : ""}`} data-month-key={date.getDate()===1?`${date.getFullYear()}-${date.getMonth()}`:undefined}>{date.getDate()===1?`${date.getMonth()+1}月`:date.getDate()}</span>
          {(()=>{const annotation=calendarAnnotation(date,weekStartsMonday);return <span className={`lunar-day-label${annotation?` calendar-annotation annotation-${annotation.kind}`:''}`}>{annotation?.label??lunarCalendarLabel(date)}</span>})()}
          {anns.length>0&&<span className="anniversary-cell-icons">{anns.slice(0,anns.length>3?2:3).map(({anniversary})=><span key={anniversary.id} title={anniversary.title}>{anniversaryIcon(anniversary.type)}</span>)}{anns.length>3&&<span className="anniversary-overflow">+{anns.length-2}</span>}</span>}
          {dayTasks.length>0&&<span className="task-preview-list">{visibleDayTasks.map((task,visibleIndex)=><span key={task.id} className={`task-preview priority-${task.priority} status-${task.status}`} style={{'--calendar-slot':visibleTaskSlots[visibleIndex]} as any}>{task.status==='todo'?<span className="priority-dot"/>:<span className="calendar-status-mark" aria-label={task.status==='completed'?'已完成':'已放弃'}>{task.status==='completed'?'✓':'×'}</span>}<span className="task-preview-title">{task.title}</span>{!task.allDay&&task.time&&<span className="task-preview-time">{task.time}</span>}</span>)}{hiddenDayTaskCount>0&&overflowSlot!==undefined&&<span className="more-tasks" style={{'--calendar-slot':overflowSlot} as any}>+{hiddenDayTaskCount}</span>}</span>}
        </Button>
      })}
      <div className="multi-day-layer">{segments.filter(segment=>segment.week===0).map(segment=><Button key={`${segment.task.id}-${rangeStart}`} type="button" className={`multi-day-bar priority-${segment.task.priority} status-${segment.task.status}`} style={{gridColumn:`${segment.startColumn+1} / span ${segment.span}`,gridRow:1,'--lane-offset':`${segment.lane*19}px`} as CSSProperties} onClick={event=>{event.stopPropagation();const rect=event.currentTarget.getBoundingClientRect();const relativeX=Math.max(0,Math.min(rect.width-.001,event.clientX-rect.left));const columnOffset=Math.min(segment.span-1,Math.floor(relativeX/(rect.width/segment.span)));const clickedDay=weekDays[segment.startColumn+columnOffset]?.date;if(clickedDay)openDayRef.current(clickedDay)}} title={`${segment.task.title} · ${segment.task.date} → ${taskEndDate(segment.task)}`}>{segment.task.status==='todo'?<span className="priority-dot"/>:<span className="calendar-status-mark" aria-label={segment.task.status==='completed'?'已完成':'已放弃'}>{segment.task.status==='completed'?'✓':'×'}</span>}<span className="multi-day-title">{segment.task.title}</span></Button>)}</div>
    </div>
  }

  return { renderCalendarMonthGrid, renderCalendarWeek }
}
