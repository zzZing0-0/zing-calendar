import type { Habit, HabitCheckIn } from './habitDomain'
import { liveCheckIns } from './habitDomain'

export type HabitDayStatus = 'empty' | 'partial' | 'met' | 'extra' | 'off'
export function dateKey(year:number, month:number, day:number):string {return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
export function dayKeysInMonth(year:number, month:number):string[] {const count=new Date(Date.UTC(year,month,0)).getUTCDate();return Array.from({length:count},(_,i)=>dateKey(year,month,i+1))}
export function mondayOffset(year:number, month:number):number {return (new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7}
export function yearHeatmapWeeks(year:number):Array<Array<string|null>> {
 const first=new Date(Date.UTC(year,0,1));const offset=(first.getUTCDay()+6)%7
 const count=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000
 const cells:Array<string|null>=[...Array(offset).fill(null),...Array.from({length:count},(_,i)=>{const d=new Date(Date.UTC(year,0,i+1));return dateKey(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate())})]
 while(cells.length%7)cells.push(null)
 return Array.from({length:cells.length/7},(_,w)=>cells.slice(w*7,w*7+7))
}
export function dayStatus(habit:Habit, checkIns:HabitCheckIn[], key:string):HabitDayStatus {
 const rows=liveCheckIns(habit.id,checkIns).filter(r=>r.occurredDate===key)
 if(!rows.length){if(habit.schedule.kind==='fixed'&&!habit.schedule.weekdays.includes(new Date(`${key}T12:00:00Z`).getUTCDay()))return 'off';return 'empty'}
 const qualifying=rows.filter(r=>r.quantity>=habit.quantityTarget).length
 if(!qualifying)return 'partial'
 if(habit.schedule.kind==='flexible'&&habit.schedule.period==='day')return qualifying>habit.schedule.times?'extra':qualifying>=habit.schedule.times?'met':'partial'
 if(habit.schedule.kind==='fixed')return qualifying>1?'extra':'met'
 // Weekly/monthly goals are evaluated over the period, not attributed to individual days.
 return qualifying>1?'extra':'met'
}
export function calendarSummary(habit:Habit, checkIns:HabitCheckIn[], keys:string[]) {
 const rows=liveCheckIns(habit.id,checkIns).filter(r=>keys.includes(r.occurredDate))
 return {days:new Set(rows.map(r=>r.occurredDate)).size,checkIns:rows.length,quantity:rows.reduce((n,r)=>n+r.quantity,0)}
}
