import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import {
  anniversaryIcon, anniversaryMeta,
  calendarAnnotation,
  lunarFullLabel
} from '../../domain/calendar'
import { sortEnvironmentOptionsBuiltinsFirst } from '../../domain/environment'
import {
  ENERGIES,
  MOODS,
  normalizeJournalMessages
} from '../../domain/journal'
import type { MenstrualPrediction } from '../../domain/menstrual'
import {
  DEFAULT_TAG_ID
} from '../../domain/preferences'
import {
  dayDiff, deadlineStage,
  formatDate,
  formatFocusDuration, formatTaskRange,
  isMultiDayTask, isTaskOverdue,
  sameDay,
  toDateKey
} from '../../domain/task'
import type { Anniversary, CalendarDay, DailyEnergy, DailyEnvironment, DailyMood, EnergyLevel, EnvironmentOption, JournalEntry, MenstrualDayLog, MenstrualPeriod, MoodLevel, Tag, Task, TaskStatus } from '../../types'
import { HabitIcon } from '../habits/HabitIcons'
import type { Habit, HabitCheckIn } from '../habits/habitDomain'
import { liveCheckIns, orderedDailyHabits, progressForDate } from '../habits/habitDomain'
import { EnergyBattery, MoodFace } from '../journal/StatusIndicators'
import { MONTHS } from './calendarLabels'

export interface DayDetailProps {
  cancelDayDetailCloseTimer: () => void
  closeDayDetail: () => void
  dayDetailClosing: boolean
  dayDetailOpen: boolean
  daySectionStyle: (key: "habit" | "journal" | "calendar" | "mood" | "energy" | "period") => React.CSSProperties
  deletePeriod: (periodId: string) => void
  displayWeekdays: string[]
  endPeriod: (periodId: string, date: string) => void
  endedTasksViewToggle: (className?: string) => React.JSX.Element
  energyByDate: Map<string, DailyEnergy>
  formatUiDate: (date: Date) => string
  habitCheckIns: HabitCheckIn[]
  habits: Habit[]
  handleEnvironmentLocation: () => void
  journalDates: Set<string>
  journalThreadDates: Set<string>
  menstrualPrediction: MenstrualPrediction | null
  moodDays: CalendarDay[]
  moodMonth: Date
  moodsByDate: Map<string, DailyMood>
  openAnniversaryEditor: (anniversary?: Anniversary | undefined) => void
  openJournalEditor: () => void
  openTaskDetail: (task: Task) => void
  openTaskEditor: () => void
  periodForDate: (key: string) => MenstrualPeriod | undefined
  quickHabitCheckIn: (habit: Habit, date: string) => void
  selectedAnniversaries: { anniversary: Anniversary; occurrence: Date; }[]
  selectedDate: Date | null
  selectedEnergy: DailyEnergy | undefined
  selectedEnvironment: DailyEnvironment | undefined
  selectedFocusSeconds: number
  selectedImpactTotal: number
  selectedIsFuture: boolean
  selectedJournalEntries: JournalEntry[]
  selectedMood: DailyMood | undefined
  selectedTasks: Task[]
  setDayDetailClosing: React.Dispatch<React.SetStateAction<boolean>>
  setDayDetailOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEnergy: (level: EnergyLevel) => void
  setEnvironmentChoice: (kind: "weather" | "thermal", optionId: string) => void
  setFocusHistoryDate: React.Dispatch<React.SetStateAction<string | null>>
  setMood: (level: MoodLevel) => void
  setMoodMonth: React.Dispatch<React.SetStateAction<Date>>
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>
  setStatusCalendarMode: React.Dispatch<React.SetStateAction<"mood" | "energy">>
  setTaskStatus: (task: Task, status: TaskStatus) => void
  setViewingJournalId: React.Dispatch<React.SetStateAction<string | null>>
  setVisibleMonth: React.Dispatch<React.SetStateAction<Date>>
  startPeriod: () => void
  statusCalendarMode: "mood" | "energy"
  tags: Tag[]
  thermalOptions: EnvironmentOption[]
  today: Date
  undoHabitCheckIn: (habit: Habit, date: string) => void
  updatePeriodDayLog: (periodId: string, date: string, patch: Partial<MenstrualDayLog>) => void
  weatherOptions: EnvironmentOption[]
  weekStartsMonday: boolean
}

export function DayDetail({
  cancelDayDetailCloseTimer,
  closeDayDetail,
  dayDetailClosing,
  dayDetailOpen,
  daySectionStyle,
  deletePeriod,
  displayWeekdays,
  endPeriod,
  endedTasksViewToggle,
  energyByDate,
  formatUiDate,
  habitCheckIns,
  habits,
  handleEnvironmentLocation,
  journalDates,
  journalThreadDates,
  menstrualPrediction,
  moodDays,
  moodMonth,
  moodsByDate,
  openAnniversaryEditor,
  openJournalEditor,
  openTaskDetail,
  openTaskEditor,
  periodForDate,
  quickHabitCheckIn,
  selectedAnniversaries,
  selectedDate,
  selectedEnergy,
  selectedEnvironment,
  selectedFocusSeconds,
  selectedImpactTotal,
  selectedIsFuture,
  selectedJournalEntries,
  selectedMood,
  selectedTasks,
  setDayDetailClosing,
  setDayDetailOpen,
  setEnergy,
  setEnvironmentChoice,
  setFocusHistoryDate,
  setMood,
  setMoodMonth,
  setSelectedDate,
  setStatusCalendarMode,
  setTaskStatus,
  setViewingJournalId,
  setVisibleMonth,
  startPeriod,
  statusCalendarMode,
  tags,
  thermalOptions,
  today,
  undoHabitCheckIn,
  updatePeriodDayLog,
  weatherOptions,
  weekStartsMonday
}: DayDetailProps) {
  return <>
{selectedDate && dayDetailOpen && (
        <>
          <Button className="drawer-backdrop" type="button" aria-label="关闭日期详情" onClick={closeDayDetail} />
          <aside className={`day-drawer${dayDetailClosing?' closing':''}`} aria-label={`${formatUiDate(selectedDate)} 日期详情`}>
            <div className="drawer-header">
              <div className="drawer-header-main">
                <div className="drawer-header-top">
                  <div>
                    <span className="eyebrow">DAY DETAIL</span>
                    <div className="drawer-date-line">
                      <h2>{formatUiDate(selectedDate)}</h2>
                      <Button className="date-action-button" type="button" onClick={() => openAnniversaryEditor()} aria-label="添加纪念日" title="添加纪念日">＋</Button>
                    </div>
                  </div>
                  <Button className="close-button" type="button" onClick={closeDayDetail} aria-label="关闭">×</Button>
                </div>
                <div className="drawer-date-meta-row">
                <span className="drawer-lunar-date">
                  农历 {lunarFullLabel(selectedDate)}
                  {(()=>{
                    const annotation=calendarAnnotation(selectedDate,weekStartsMonday)
                    return annotation && annotation.kind!=='week'
                      ? <><span className="drawer-date-separator"> · </span><span className={`drawer-calendar-annotation annotation-${annotation.kind}`}>{annotation.label}</span></>
                      : null
                  })()}
                </span>
                {!selectedIsFuture && <div className="journal-environment-strip drawer-environment-strip">
                  <Button type="button" className={`journal-location-choice${selectedEnvironment?.locationCity?' selected':''}`} onClick={handleEnvironmentLocation}>
                    {selectedEnvironment?.locationCity ? `📍 ${selectedEnvironment.locationCity}` : '地点'}
                  </Button>
                  <span className="journal-environment-separator" aria-hidden="true">｜</span>
                  <Field className={`journal-environment-choice journal-environment-text-select${selectedEnvironment?.weatherOptionId?' selected':''}`}>
                    <span className="journal-environment-visible" aria-hidden="true">{selectedEnvironment?.weatherOptionId ? (()=>{const item=weatherOptions.find(row=>row.id===selectedEnvironment.weatherOptionId);return item?`${item.emoji?`${item.emoji} `:''}${item.name}`:'天气'})() : '天气'}</span>
                    <select aria-label="天气" value={selectedEnvironment?.weatherOptionId??''} onChange={event=>setEnvironmentChoice('weather',event.target.value)}>
                      <option value="">天气</option>
                      {sortEnvironmentOptionsBuiltinsFirst(weatherOptions.filter(item=>!item.deletedAt)).map(item=><option key={item.id} value={item.id} disabled={Boolean(item.archived)&&selectedEnvironment?.weatherOptionId!==item.id}>{item.emoji?`${item.emoji} `:''}{item.name}{item.archived?'（已归档）':''}</option>)}
                    </select>
                  </Field>
                  <span className="journal-environment-separator" aria-hidden="true">｜</span>
                  <Field className={`journal-environment-choice journal-environment-text-select${selectedEnvironment?.thermalOptionId?' selected':''}`}>
                    <span className="journal-environment-visible" aria-hidden="true">{selectedEnvironment?.thermalOptionId ? (()=>{const item=thermalOptions.find(row=>row.id===selectedEnvironment.thermalOptionId);return item?`${item.emoji?`${item.emoji} `:''}${item.name}`:'体感'})() : '体感'}</span>
                    <select aria-label="体感" value={selectedEnvironment?.thermalOptionId??''} onChange={event=>setEnvironmentChoice('thermal',event.target.value)}>
                      <option value="">体感</option>
                      {sortEnvironmentOptionsBuiltinsFirst(thermalOptions.filter(item=>!item.deletedAt)).map(item=><option key={item.id} value={item.id} disabled={Boolean(item.archived)&&selectedEnvironment?.thermalOptionId!==item.id}>{item.emoji?`${item.emoji} `:''}{item.name}{item.archived?'（已归档）':''}</option>)}
                    </select>
                  </Field>
                </div>}
              </div>
              </div>
            </div>

            {selectedAnniversaries.length > 0 && (
              <section className="detail-section anniversary-section" style={{order:2}}>
                <div className="section-heading"><h3>纪念日</h3><span>{selectedAnniversaries.length}</span></div>
                <div className="anniversary-list">{selectedAnniversaries.map(({anniversary, occurrence}) => (
                  <Button key={anniversary.id} type="button" className="anniversary-row" onClick={() => openAnniversaryEditor(anniversary)}>
                    <span className="anniversary-row-icon">{anniversaryIcon(anniversary.type)}</span>
                    <span className="anniversary-row-title">{anniversary.title}</span>
                    <span className="anniversary-row-meta">{anniversaryMeta(anniversary, occurrence)}</span>
                  </Button>
                ))}</div>
              </section>
            )}

            <section className="detail-section task-section" style={{order:1}}>
              <div className="section-heading task-section-heading">
                <div className="task-heading-title"><h3>任务</h3>{selectedTasks.length > 0 && <span>{selectedTasks.length}</span>}</div>
                {endedTasksViewToggle('detail-ended-toggle')}
              </div>

              {selectedTasks.length === 0 ? (
                <p className="empty-state">这一天还没有任务。</p>
              ) : (
                <div className="task-list">
                  {selectedTasks.map(task => (
                    <article
                      key={task.id}
                      className={`task-item priority-${task.priority} status-${task.status} ${deadlineStage(task)}${isTaskOverdue(task) ? ' task-overdue' : ''}`}
                      onClick={() => openTaskDetail(task)}
                    >
                      <span className="task-priority-bar" />
                      <Button
                        type="button"
                        className="task-checkbox"
                        aria-label={task.status === 'completed' ? `取消完成 ${task.title}` : task.status === 'abandoned' ? `恢复 ${task.title}` : `完成 ${task.title}`}
                        onClick={event => {
                          event.stopPropagation()
                          setTaskStatus(task, task.status === 'todo' ? 'completed' : 'todo')
                        }}
                      >
                        {task.status === 'completed' ? '✓' : task.status === 'abandoned' ? '×' : ''}
                      </Button>
                      <strong className="task-title">{task.title}</strong>
                      {isMultiDayTask(task) && <span className="task-range">{formatTaskRange(task)}</span>}
                      {!task.allDay && task.time && <span className="task-card-time">{task.time}</span>}
                    </article>
                  ))}
                </div>
              )}

              <Button className="add-button" type="button" onClick={openTaskEditor}>＋ 添加任务</Button>
              {selectedDate && toDateKey(selectedDate) <= toDateKey(today) && <Button className="day-focus-time day-focus-button" type="button" onClick={()=>setFocusHistoryDate(toDateKey(selectedDate))}>{sameDay(selectedDate,today) ? '今日专注' : '当日专注'} · {formatFocusDuration(selectedFocusSeconds)}<span>›</span></Button>}
            </section>

            {!selectedIsFuture && <>
            <section className="detail-section mood-section" style={daySectionStyle("mood")}>
              <div className="section-heading"><h3>今日心情</h3></div>
              <div className="mood-picker" aria-label="今日心情">
                {MOODS.slice().reverse().map(mood => (
                  <Button key={mood.value} type="button" className={`mood-choice mood-${mood.value}${selectedMood?.level === mood.value ? ' active' : ''}`} onClick={() => setMood(mood.value)}>
                    <MoodFace level={mood.value} />
                    <span>{mood.label}</span>
                  </Button>
                ))}
              </div>
            </section>

            <section className="detail-section energy-section" style={daySectionStyle("energy")}>
              <div className="section-heading"><h3>身体能量</h3></div>
              <div className="energy-picker" aria-label="今日身体能量">
                {ENERGIES.slice().reverse().map(item => (
                  <Button key={item.value} type="button" className={`energy-choice energy-${item.value}${selectedEnergy?.level===item.value?' active':''}`} onClick={()=>setEnergy(item.value)}>
                    <EnergyBattery level={item.value}/><span>{item.label}</span>
                  </Button>
                ))}
              </div>
            </section>

                        </>}

            <section className="detail-section mood-calendar-section" style={daySectionStyle("calendar")}>
              <div className="mini-calendar-header">
                <div>
                  <span className="eyebrow">STATUS CALENDAR</span>
                  <div className="status-calendar-title"><h3>{statusCalendarMode==='mood'?'心情月历':'能量月历'}</h3><div className="status-mode-toggle"><Button className={statusCalendarMode==='mood'?'active':''} onClick={()=>setStatusCalendarMode('mood')}>心情</Button><Button className={statusCalendarMode==='energy'?'active':''} onClick={()=>setStatusCalendarMode('energy')}>能量</Button></div></div>
                </div>
                <div className="mini-month-navigation">
                  <Button type="button" aria-label="上个月" onClick={() => setMoodMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</Button>
                  <strong>{MONTHS[moodMonth.getMonth()]} {moodMonth.getFullYear()}</strong>
                  <Button type="button" aria-label="下个月" onClick={() => setMoodMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</Button>
                </div>
              </div>
              <div className="mini-weekdays">{displayWeekdays.map(day => <span key={day}>{day.slice(0, 1)}</span>)}</div>
              <div className="mood-mini-grid">
                {moodDays.map(({ date, inCurrentMonth }, index) => {
                  const key = toDateKey(date)
                  const mood = moodsByDate.get(key)
                  const energy = energyByDate.get(key)
                  const status = statusCalendarMode==='mood' ? mood : energy
                  const column = index % 7
                  const prevKey=index>0?toDateKey(moodDays[index-1].date):''
                  const nextKey=index<moodDays.length-1?toDateKey(moodDays[index+1].date):''
                  const prev = statusCalendarMode==='mood' ? moodsByDate.get(prevKey) : energyByDate.get(prevKey)
                  const next = statusCalendarMode==='mood' ? moodsByDate.get(nextKey) : energyByDate.get(nextKey)
                  const joinLeft = Boolean(status && column > 0 && prev?.level === status.level && moodDays[index - 1].inCurrentMonth)
                  const joinRight = Boolean(status && column < 6 && next?.level === status.level && moodDays[index + 1].inCurrentMonth)
                  return (
                    <Button
                      key={key}
                      type="button"
                      className={`mood-mini-day${inCurrentMonth ? '' : ' outside'}${sameDay(date, today) ? ' today' : ''}`}
                      disabled={key > toDateKey(today)}
                      onClick={() => {
                        if (key > toDateKey(today)) return
                        const nextDate = new Date(date)
                        const nextMonth = new Date(date.getFullYear(), date.getMonth(), 1)
                        cancelDayDetailCloseTimer()
                        setDayDetailClosing(false)
                        setSelectedDate(nextDate)
                        setDayDetailOpen(true)
                        setMoodMonth(nextMonth)
                        setVisibleMonth(nextMonth)
                      }}
                      aria-label={`${formatDate(date)}${status ? `，${statusCalendarMode==='mood' ? MOODS.find(item=>item.value===status.level)?.label : ENERGIES.find(item=>item.value===status.level)?.label}` : `，尚未记录${statusCalendarMode==='mood'?'心情':'能量'}`}`}
                    >
                      {status && inCurrentMonth && <span className={`mood-run mood-${status.level}${joinLeft ? ' join-left' : ''}${joinRight ? ' join-right' : ''}`} />}
                      <span className="mini-day-number">{date.getDate()}</span>
                      {inCurrentMonth && journalDates.has(key) && (journalThreadDates.has(key)
                        ? <span className="mini-journal-thread-dot" aria-label="当天记录有后续" />
                        : <span className="mini-journal-dot" aria-label="当天有记录" />)}
                    </Button>
                  )
                })}
              </div>
            </section>

            {!selectedIsFuture && <>
            <section className="detail-section journal-section" style={daySectionStyle("journal")}>
              <div className="section-heading journal-heading">
                <h3>记录</h3>

                {selectedJournalEntries.length > 0 && <span>{selectedJournalEntries.length}</span>}
                {selectedJournalEntries.length > 0 && <strong className={`impact-total ${selectedImpactTotal > 0 ? 'positive' : selectedImpactTotal < 0 ? 'negative' : ''}`}>事件合计 {selectedImpactTotal > 0 ? '+' : ''}{selectedImpactTotal}</strong>}
              </div>
              {selectedJournalEntries.length === 0 ? <p className="empty-state">暂无记录</p> : (
                <div className="journal-list">
                  {selectedJournalEntries.map(entry => {
                    const entryTagIds = (entry.tagIds ?? [DEFAULT_TAG_ID]).filter(id => id !== DEFAULT_TAG_ID)
                    const visibleTags = entryTagIds.slice(0, 3)
                    const extraTags = Math.max(0, entryTagIds.length - visibleTags.length)
                    const images = (entry.attachments ?? []).filter(a => a.type === 'image').length
                    const hasAudio = (entry.attachments ?? []).some(a => a.type === 'audio')
                    return <Button key={entry.id} type="button" className="journal-entry journal-card-v067" onClick={() => setViewingJournalId(entry.id)}>
                      <span className="journal-meta">{new Date(entry.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                      <strong className="journal-title">{entry.title || '记录'}</strong>
                      <span className={`impact-badge impact-${entry.impact}`}>{entry.impact > 0 ? '+' : ''}{entry.impact}</span>
                      <span className="journal-card-bottom">
                        <span className="entry-tags">{visibleTags.map(id => { const tag = tags.find(item => item.id === id); return tag ? <span key={id} className="mini-tag" style={{ '--tag-color': tag.color } as any}>#{tag.name}</span> : null })}{extraTags > 0 && <span className="extra-tags">+{extraTags}</span>}</span>
                        <span className="journal-markers">{entry.content && <span title="有正文" aria-label="有正文">≡</span>}{normalizeJournalMessages(entry.messages).length > 0 && <span className="journal-thread-list-marker" title="有后续" aria-label="有后续">■</span>}{images > 0 && <span title="有图片" aria-label="有图片">▧</span>}{hasAudio && <span title="有录音" aria-label="有录音">●</span>}</span>
                      </span>
                    </Button>
                  })}
                </div>
              )}
              <Button className="add-button" type="button" onClick={openJournalEditor}>＋ 添加记录</Button>
            </section>

            {selectedDate && orderedDailyHabits(habits,habitCheckIns,toDateKey(selectedDate),toDateKey(today)).length>0 && <section className="detail-section habit-daily-section" style={daySectionStyle("habit")}><div className="section-heading"><h3>习惯</h3></div>{orderedDailyHabits(habits,habitCheckIns,toDateKey(selectedDate),toDateKey(today)).map(habit=>{const rows=liveCheckIns(habit.id,habitCheckIns).filter(row=>row.occurredDate===toDateKey(selectedDate));const progress=progressForDate(habit,habitCheckIns,toDateKey(selectedDate));const done=progress.met;const hasLog=rows.length>0;return <div className="habit-daily-row" key={habit.id}><span className="habit-daily-name"><HabitIcon name={habit.icon} color={tags.find(t=>t.id===habit.tagId)?.color} />{habit.name}</span>{habit.archivedAt?<span className="habit-daily-archived">{done?'✓ 已达标 · 已归档':hasLog?'已打卡 · 已归档':'已归档'}</span>:<Button type="button" onClick={()=>hasLog?undoHabitCheckIn(habit,toDateKey(selectedDate)):quickHabitCheckIn(habit,toDateKey(selectedDate))}>{done?'✓ 已达标':hasLog?`已打卡 ${progress.done}/${progress.target??'-'} · 撤销`:'○ 打卡'}</Button>}</div>})}</section>}
            <section className="detail-section menstrual-section" style={daySectionStyle("period")}>
              <div className="section-heading">
                <h3>{selectedIsFuture ? '预计经期' : '月经记录'}</h3>
                {menstrualPrediction && <small>预计下次约 {menstrualPrediction.start.slice(5).replace('-','/')} · ±1天</small>}
              </div>
              {selectedDate && (() => {
                const key=toDateKey(selectedDate)
                if (selectedIsFuture) {
                  if (!menstrualPrediction || key < menstrualPrediction.windowStart || key > menstrualPrediction.windowEnd) return null
                  return <div className="menstrual-prediction-card">预计日期，仅作任务安排参考；实际开始后再记录。</div>
                }
                const period=periodForDate(key)
                if(!period) return <Button variant="secondary" className="secondary-button" type="button" onClick={startPeriod}>＋ 月经开始</Button>
                const log=period.dayLogs.find(row=>row.date===key)
                return <div className="menstrual-editor">
                  <div className="menstrual-summary"><strong>🩸 第 {dayDiff(period.startDate,key)+1} 天</strong><span>{period.startDate}{period.endDate?` → ${period.endDate}`:' · 进行中'}</span></div>
                  {!period.endDate && dayDiff(period.startDate,key)+1 > 7 && <div className="menstrual-duration-warning">本次记录已超过 7 天，请确认是否忘记标记结束；如果仍在持续，可以继续记录。</div>}
                  <Field className="menstrual-note"><span>备注</span><input value={log?.notes??''} placeholder="可选，例如腹痛、量多、状态变化…" onChange={e=>updatePeriodDayLog(period.id,key,{notes:e.target.value})}/></Field>
                  {!period.endDate && key>=period.startDate && <Button variant="secondary" className="secondary-button" type="button" onClick={()=>endPeriod(period.id,key)}>月经在今天结束</Button>}
                  <Button className="menstrual-delete-button" type="button" onClick={()=>deletePeriod(period.id)}>删除这次月经记录</Button>
                </div>
              })()}
            </section>

            </>}

            {selectedIsFuture && selectedDate && menstrualPrediction && toDateKey(selectedDate)>=menstrualPrediction.windowStart && toDateKey(selectedDate)<=menstrualPrediction.windowEnd && (
              <section className="detail-section menstrual-section" style={daySectionStyle("period")}>
                <div className="section-heading"><h3>预计经期</h3><small>预计约 {menstrualPrediction.start.slice(5).replace('-','/')} · ±1天</small></div>
                <div className="menstrual-prediction-card">预计日期，仅作任务安排参考；实际开始后再记录。</div>
              </section>
            )}

                      </aside>
        </>
      )}
  </>
}
