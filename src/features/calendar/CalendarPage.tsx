import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import {
  compactCount
} from '../../domain/task'
import type { FocusSession, Note, Task } from '../../types'
import type { Habit } from '../habits/habitDomain'
import type { MainView } from '../navigation/navigationTypes'
import { MONTHS } from './calendarLabels'

export interface CalendarPageProps {
  openFocus: () => void
  activeFocusElapsed: number
  activeFocusHabit: Habit | null
  activeFocusNote: Note | null
  activeFocusRemaining: number
  activeFocusSession: FocusSession | null
  activeTimerTask: Task | null
  continuousCalendarContent: React.JSX.Element[] | null
  continuousCalendarRef: React.RefObject<HTMLDivElement | null>
  dayDetailOpen: boolean
  displayWeekdays: string[]
  endedTasksViewToggle: (className?: string) => React.JSX.Element
  formatClock: (seconds: number) => string
  goToday: () => void
  inboxCount: number
  isMobileCalendar: boolean
  mainView: MainView
  mobileActiveMonth: Date
  moveMonth: (offset: number) => void
  openMonthPicker: (target: "calendar" | "mood") => void
  overdueCount: number
  programRefreshBusy: boolean
  refreshProgram: () => Promise<void>
  renderCalendarMonthGrid: (month: Date) => React.JSX.Element
  setInboxOpen: React.Dispatch<React.SetStateAction<boolean>>
  setOverdueInboxOpen: React.Dispatch<React.SetStateAction<boolean>>
  setTrashOpen: React.Dispatch<React.SetStateAction<boolean>>
  trashCount: number
  visibleMonth: Date
}

export function CalendarPage({
  openFocus,
  activeFocusElapsed,
  activeFocusHabit,
  activeFocusNote,
  activeFocusRemaining,
  activeFocusSession,
  activeTimerTask,
  continuousCalendarContent,
  continuousCalendarRef,
  dayDetailOpen,
  displayWeekdays,
  endedTasksViewToggle,
  formatClock,
  goToday,
  inboxCount,
  isMobileCalendar,
  mainView,
  mobileActiveMonth,
  moveMonth,
  openMonthPicker,
  overdueCount,
  programRefreshBusy,
  refreshProgram,
  renderCalendarMonthGrid,
  setInboxOpen,
  setOverdueInboxOpen,
  setTrashOpen,
  trashCount,
  visibleMonth
}: CalendarPageProps) {
  return <>
{mainView === 'calendar' && <section className={`calendar-card${isMobileCalendar && dayDetailOpen ? ' day-detail-open' : ''}`} aria-label="月历">
        <div className="calendar-sticky-header">
        <div className="calendar-toolbar">
          <div className="month-navigation">
            <Button className="nav-button" type="button" onClick={() => moveMonth(-1)} aria-label="上个月">‹</Button>
            <Button className="month-title-button" type="button" onClick={()=>openMonthPicker('calendar')} aria-label="快速选择年月">{MONTHS[(isMobileCalendar?mobileActiveMonth:visibleMonth).getMonth()]} {(isMobileCalendar?mobileActiveMonth:visibleMonth).getFullYear()} <span>⌄</span></Button>
            <Button className="nav-button" type="button" onClick={() => moveMonth(1)} aria-label="下个月">›</Button>
            <Button className="today-button" type="button" onClick={goToday}>今天</Button>
            <Button className={`focus-trigger${activeFocusSession?' running':''}`} type="button" onClick={openFocus}>{activeTimerTask?`任务专注 ${formatClock(activeFocusElapsed)}`:activeFocusNote?`笔记专注 ${formatClock(activeFocusElapsed)}`:activeFocusHabit?`习惯专注 ${formatClock(activeFocusElapsed)}`:activeFocusSession?`专注 ${formatClock(activeFocusSession.mode==='countdown'?activeFocusRemaining:activeFocusElapsed)}`:'开始专注'}</Button>
          </div>
          <div className="calendar-status-controls">
            <Button className="trash-inbox-trigger inbox-trigger" type="button" onClick={()=>setInboxOpen(true)} aria-label={`打开收集箱，共 ${inboxCount} 条`}><svg className="inbox-trigger-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15l1.5 11.5a2 2 0 0 1-2 2.3H5a2 2 0 0 1-2-2.3L4.5 5.5Z"/><path d="M4 14h4.2l1.4 2h4.8l1.4-2H20"/></svg><span>收集箱{inboxCount?` ${compactCount(inboxCount)}`:''}</span></Button>
            <Button className="trash-inbox-trigger" type="button" onClick={()=>setTrashOpen(true)} aria-label={trashCount?`打开回收站，共 ${trashCount} 条`:'打开回收站，当前为空'}><svg className="trash-trigger-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" /></svg><span>回收站</span></Button>
            {overdueCount>0 && <Button className={`overdue-inbox-trigger${overdueCount>=5?' urgent':''}`} type="button" onClick={()=>setOverdueInboxOpen(true)} aria-label={`打开已逾期任务，共 ${overdueCount} 条`}><span>⚠</span> 已逾期 {compactCount(overdueCount)}</Button>}
            {endedTasksViewToggle('calendar-ended-toggle')}
            <Button className="program-refresh-button" type="button" onClick={()=>void refreshProgram()} disabled={programRefreshBusy} aria-label="检查并刷新程序" title="检查并刷新程序">{programRefreshBusy?'…':'↻'}</Button>
          </div>
        </div>

        <div className="weekday-row">
          {displayWeekdays.map(day => <div key={day}>{day}</div>)}
        </div>
        </div>

        {isMobileCalendar ? <>
          <div className="continuous-calendar" ref={continuousCalendarRef}>
            {continuousCalendarContent}
          </div>
        </> : renderCalendarMonthGrid(visibleMonth)}
      </section>}
  </>
}
