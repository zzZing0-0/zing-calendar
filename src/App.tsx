import { useMemo, useState } from 'react'
import './App.css'

type CalendarView = 'tasks' | 'mood'

type CalendarDay = {
  date: Date
  inCurrentMonth: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildMonth(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return { date, inCurrentMonth: date.getMonth() === month }
  })
}

function App() {
  const today = new Date()
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [view, setView] = useState<CalendarView>('tasks')

  const days = useMemo(
    () => buildMonth(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  )

  const moveMonth = (offset: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const goToday = () => {
    const now = new Date()
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">Z</div>
          <div>
            <h1>Zing Calendar</h1>
            <p>把时间留给真正重要的事。</p>
          </div>
        </div>

        <nav className="top-actions" aria-label="主要功能">
          <button className="icon-button" type="button" aria-label="搜索" title="搜索">⌕</button>
          <button className="icon-button" type="button" aria-label="设置" title="设置">⚙</button>
        </nav>
      </header>

      <section className="calendar-card" aria-label="月历">
        <div className="calendar-toolbar">
          <div className="month-navigation">
            <button className="nav-button" type="button" onClick={() => moveMonth(-1)} aria-label="上个月">‹</button>
            <h2>{MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</h2>
            <button className="nav-button" type="button" onClick={() => moveMonth(1)} aria-label="下个月">›</button>
            <button className="today-button" type="button" onClick={goToday}>Today</button>
          </div>

          <div className="view-switch" role="group" aria-label="日历视图">
            <button
              type="button"
              className={view === 'tasks' ? 'active' : ''}
              onClick={() => setView('tasks')}
            >任务</button>
            <button
              type="button"
              className={view === 'mood' ? 'active' : ''}
              onClick={() => setView('mood')}
            >情绪</button>
          </div>
        </div>

        <div className="weekday-row">
          {WEEKDAYS.map(day => <div key={day}>{day}</div>)}
        </div>

        <div className={`calendar-grid ${view === 'mood' ? 'mood-view' : ''}`}>
          {days.map(({ date, inCurrentMonth }) => {
            const isToday = sameDay(date, today)
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
            return (
              <button
                key={key}
                type="button"
                className={`day-cell${inCurrentMonth ? '' : ' outside-month'}${isToday ? ' today' : ''}`}
                aria-label={`${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`}
              >
                <span className="day-number">{date.getDate()}</span>
                {view === 'tasks' && inCurrentMonth && <span className="day-empty-hint"> </span>}
              </button>
            )
          })}
        </div>
      </section>

      <footer className="status-line">
        <span className="status-dot" aria-hidden="true" />
        <span>Local first · 数据保存在你的设备上</span>
      </footer>
    </main>
  )
}

export default App
