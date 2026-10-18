import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { MONTHS } from './calendarLabels'

export interface MonthPickerProps {
  chooseMonth: (monthIndex: number) => void
  isMobileCalendar: boolean
  mobileActiveMonth: Date
  monthPickerTarget: "calendar" | "mood" | null
  monthPickerYear: number
  moodMonth: Date
  setMonthPickerTarget: React.Dispatch<React.SetStateAction<"calendar" | "mood" | null>>
  setMonthPickerYear: React.Dispatch<React.SetStateAction<number>>
  today: Date
  visibleMonth: Date
}

export function MonthPicker({
  chooseMonth,
  isMobileCalendar,
  mobileActiveMonth,
  monthPickerTarget,
  monthPickerYear,
  moodMonth,
  setMonthPickerTarget,
  setMonthPickerYear,
  today,
  visibleMonth
}: MonthPickerProps) {
  return <>
{monthPickerTarget && (
        <div className="modal-layer month-picker-layer" role="presentation">
          <Button className="modal-backdrop" type="button" aria-label="关闭年月选择" onClick={()=>setMonthPickerTarget(null)} />
          <section className="month-picker-panel" role="dialog" aria-modal="true" aria-label="选择年月">
            <div className="month-picker-year">
              <Button type="button" onClick={()=>setMonthPickerYear(y=>y-1)} aria-label="上一年">‹</Button>
              <strong>{monthPickerYear}</strong>
              <Button type="button" onClick={()=>setMonthPickerYear(y=>y+1)} aria-label="下一年">›</Button>
            </div>
            <div className="month-picker-grid">
              {MONTHS.map((name,index)=><Button key={name} type="button" className={(monthPickerTarget==='calendar'?(isMobileCalendar?mobileActiveMonth:visibleMonth):moodMonth).getFullYear()===monthPickerYear && (monthPickerTarget==='calendar'?(isMobileCalendar?mobileActiveMonth:visibleMonth):moodMonth).getMonth()===index?'active':''} onClick={()=>chooseMonth(index)}>{name}</Button>)}
            </div>
            <Button className="month-picker-today" type="button" onClick={()=>{setMonthPickerYear(today.getFullYear());chooseMonth(today.getMonth())}}>今年本月</Button>
          </section>
        </div>
      )}
  </>
}
