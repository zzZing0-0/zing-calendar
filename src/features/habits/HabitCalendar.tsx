import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { calendarSummary, dayKeysInMonth, dayStatus, mondayOffset, yearHeatmapWeeks } from './habitCalendarDomain'
import type { Habit, HabitCheckIn } from './habitDomain'
import { liveCheckIns } from './habitDomain'

type Props = {habit:Habit;checkIns:HabitCheckIn[];tagColor?:string;formatUiDate:(d:Date)=>string;today:string;selectedDay:string|null;onSelectDay:(day:string)=>void;onEdit:(row:HabitCheckIn)=>void;onRemove:(id:string)=>void}
const weekdays=['一','二','三','四','五','六','日']
function displayDate(key:string,format:(d:Date)=>string){return format(new Date(`${key}T12:00:00`))}
export function HabitCalendar({habit,checkIns,tagColor,formatUiDate,today,selectedDay,onSelectDay,onEdit,onRemove}:Props){
 const [view,setView]=useState<'month'|'year'>('month')
 const [year,setYear]=useState(Number(today.slice(0,4)))
 const [month,setMonth]=useState(Number(today.slice(5,7)))
 const yearScroll=useRef<HTMLDivElement>(null)
 const yearWeeks=useMemo(()=>yearHeatmapWeeks(year),[year])
 const monthKeys=useMemo(()=>dayKeysInMonth(year,month),[year,month])
 const yearKeys=useMemo(()=>yearWeeks.flat().filter((k):k is string=>k!==null),[yearWeeks])
 const keys=view==='month'?monthKeys:yearKeys
 const summary=calendarSummary(habit,checkIns,keys)
 const selectedRows=selectedDay?liveCheckIns(habit.id,checkIns).filter(r=>r.occurredDate===selectedDay).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)):[]
 useEffect(()=>{if(view==='year'&&year===Number(today.slice(0,4))){const container=yearScroll.current;const active=container?.querySelector<HTMLElement>('[data-current-month="true"]');if(container&&active)container.scrollLeft=Math.max(0,active.offsetLeft-container.offsetWidth/2)}},[view,year,today])
 const changeMonth=(direction:number)=>{const d=new Date(Date.UTC(year,month-1+direction,1));setYear(d.getUTCFullYear());setMonth(d.getUTCMonth()+1)}
 const dayButton=(key:string,caption:string)=>{const future=key>today;const status=dayStatus(habit,checkIns,key);return <Button key={key} type="button" className={`habit-calendar-day status-${status}${selectedDay===key?' selected':''}`} style={{'--habit-day-color':tagColor||'#4e8967'} as CSSProperties} disabled={future} aria-label={`${displayDate(key,formatUiDate)} ${status==='empty'?'无记录':status==='partial'?'部分完成':status==='extra'?'超额打卡':status==='met'?'已打卡':'非计划日'}`} aria-pressed={selectedDay===key} onClick={()=>onSelectDay(key)}>{caption}</Button>}
 return <section className="habit-calendar" aria-label="习惯完成日历">
 <div className="habit-calendar-toolbar"><h4>完成日历</h4><div className="habit-calendar-tabs" role="group" aria-label="日历视图"><Button type="button" className={view==='month'?'active':''} aria-pressed={view==='month'} onClick={()=>setView('month')}>月历</Button><Button type="button" className={view==='year'?'active':''} aria-pressed={view==='year'} onClick={()=>setView('year')}>年历</Button></div></div>
 <div className="habit-calendar-period"><Button type="button" aria-label={view==='month'?'上个月':'上一年'} onClick={()=>view==='month'?changeMonth(-1):setYear(y=>y-1)}>‹</Button><strong>{year}年{view==='month'?`${month}月`:''}</strong><Button type="button" aria-label={view==='month'?'下个月':'下一年'} onClick={()=>view==='month'?changeMonth(1):setYear(y=>y+1)}>›</Button></div>
 {view==='month'?<div className="habit-calendar-month"><div className="habit-calendar-weekdays">{weekdays.map(w=><span key={w}>{w}</span>)}</div><div className="habit-calendar-month-grid">{Array.from({length:mondayOffset(year,month)},(_,i)=><span key={`pad-${i}`}/>)}{monthKeys.map(k=>dayButton(k,String(Number(k.slice(-2)))))}</div></div>:<div className="habit-calendar-year-scroll" ref={yearScroll} aria-label={`${year}年打卡热力图，可横向滚动`}><div className="habit-calendar-year"><div className="habit-calendar-year-months">{yearWeeks.map((week,i)=>{const first=week.find(Boolean);const current=first&&Number(first.slice(5,7))===Number(today.slice(5,7))&&year===Number(today.slice(0,4));const isFirst=i===0||yearWeeks[i-1].find(Boolean)?.slice(5,7)!==first?.slice(5,7);return <span key={i} data-current-month={current?'true':undefined}>{isFirst&&first?`${Number(first.slice(5,7))}月`:''}</span>})}</div><div className="habit-calendar-year-body"><div className="habit-calendar-year-weekdays">{weekdays.map((w,i)=><span key={i}>{i%2===0?w:''}</span>)}</div><div className="habit-calendar-year-weeks">{yearWeeks.map((week,i)=><div className="habit-calendar-year-week" key={i}>{week.map((key,d)=>key?dayButton(key,''): <span key={`empty-${d}`} />)}</div>)}</div></div></div></div>}
 <p className="habit-calendar-summary">{view==='month'?'本月':'全年'}有记录 {summary.days} 天 · 打卡 {summary.checkIns} 次 · 累计 {Number(summary.quantity.toFixed(2))} {habit.unit}</p>
 <div className="habit-calendar-legend"><span>无记录</span><i className="status-empty"/><i className="status-partial"/><i className="status-met"/><i className="status-extra"/><span>更多打卡</span></div>
 {selectedDay&&<section className="habit-calendar-selected" aria-label="所选日期打卡记录"><h4>{displayDate(selectedDay,formatUiDate)}</h4>{selectedRows.length?<>{selectedRows.map(row=><div className="habit-calendar-record" key={row.id}><span>{row.quantity} {habit.unit}</span>{!habit.archivedAt&&<div><Button type="button" onClick={()=>onEdit(row)}>修改</Button><Button type="button" onClick={()=>onRemove(row.id)}>取消</Button></div>}</div>)}<small>当天 {selectedRows.length} 次 · 合计 {Number(selectedRows.reduce((n,r)=>n+r.quantity,0).toFixed(2))} {habit.unit}</small></>:<p className="habit-calendar-empty">当天暂无记录</p>}{!habit.archivedAt&&selectedDay<=today&&<p className="habit-calendar-hint">可使用上方「补充打卡」为这一天添加记录。</p>}</section>}
 </section>
}
