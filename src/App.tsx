import { useEffect, useMemo, useState } from 'react'
import { loadTasks, saveTasks } from './db/tasks'
import './App.css'

type CalendarView = 'tasks' | 'mood'
type TaskPriority = 0 | 1 | 2 | 3
type TaskStatus = 'todo' | 'completed' | 'abandoned'

type CalendarDay = {
  date: Date
  inCurrentMonth: boolean
}

type Task = {
  id: string
  title: string
  date: string
  priority: TaskPriority
  status: TaskStatus
  allDay: boolean
  time?: string
  deadline?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

type TaskDraft = {
  title: string
  date: string
  priority: TaskPriority
  allDay: boolean
  time: string
  deadline: string
  notes: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PRIORITIES: { value: TaskPriority; label: string; hint: string }[] = [
  { value: 0, label: 'P0', hint: '从容' },
  { value: 1, label: 'P1', hint: '普通' },
  { value: 2, label: 'P2', hint: '较高' },
  { value: 3, label: 'P3', hint: '紧急' },
]

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date: Date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
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

function emptyDraft(date: Date): TaskDraft {
  return {
    title: '',
    date: toDateKey(date),
    priority: 1,
    allDay: true,
    time: '',
    deadline: '',
    notes: '',
  }
}


function taskSort(a: Task, b: Task) {
  const statusRank = (task: Task) => task.status === 'todo' ? 0 : task.status === 'completed' ? 1 : 2
  const statusDifference = statusRank(a) - statusRank(b)
  if (statusDifference !== 0) return statusDifference

  if (a.status === 'todo' && b.status === 'todo') {
    const aHasTime = !a.allDay && Boolean(a.time)
    const bHasTime = !b.allDay && Boolean(b.time)
    if (aHasTime !== bHasTime) return aHasTime ? -1 : 1
    if (aHasTime && bHasTime && a.time !== b.time) return (a.time ?? '').localeCompare(b.time ?? '')
    if (!aHasTime && !bHasTime && a.priority !== b.priority) return b.priority - a.priority
  }

  return a.createdAt.localeCompare(b.createdAt)
}

function deadlineStage(task: Task, now = new Date()) {
  if (!task.deadline || task.status !== 'todo') return 'deadline-normal'
  const created = new Date(task.createdAt)
  const deadline = fromDateKey(task.deadline)
  deadline.setHours(23, 59, 59, 999)

  if (now > deadline) return 'deadline-overdue'
  const total = deadline.getTime() - created.getTime()
  if (total <= 0) return 'deadline-overdue'
  const progress = (now.getTime() - created.getTime()) / total
  if (progress >= 0.75) return 'deadline-red'
  if (progress >= 0.5) return 'deadline-yellow'
  return 'deadline-normal'
}

function App() {
  const today = new Date()
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [view, setView] = useState<CalendarView>('tasks')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksHydrated, setTasksHydrated] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TaskDraft>(() => emptyDraft(today))

  useEffect(() => {
    let active = true
    loadTasks<Task>().then(storedTasks => {
      if (!active) return
      setTasks(storedTasks)
      setTasksHydrated(true)
    }).catch(error => {
      console.error('Failed to load tasks from IndexedDB', error)
      if (active) setTasksHydrated(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!tasksHydrated) return
    saveTasks(tasks).catch(error => console.error('Failed to save tasks to IndexedDB', error))
  }, [tasks, tasksHydrated])

  const days = useMemo(
    () => buildMonth(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  )

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return []
    const key = toDateKey(selectedDate)
    return tasks.filter(task => task.date === key).sort(taskSort)
  }, [selectedDate, tasks])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach(task => {
      const current = map.get(task.date) ?? []
      current.push(task)
      current.sort(taskSort)
      map.set(task.date, current)
    })
    return map
  }, [tasks])

  const moveMonth = (offset: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const goToday = () => {
    const now = new Date()
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  const openDay = (date: Date) => {
    setSelectedDate(date)
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const openTaskEditor = () => {
    const date = selectedDate ?? today
    setEditingTaskId(null)
    setDraft(emptyDraft(date))
    setEditorOpen(true)
  }

  const editTask = (task: Task) => {
    setEditingTaskId(task.id)
    setDraft({
      title: task.title,
      date: task.date,
      priority: task.priority,
      allDay: task.allDay,
      time: task.time ?? '',
      deadline: task.deadline ?? '',
      notes: task.notes ?? '',
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingTaskId(null)
  }

  const saveTask = () => {
    const title = draft.title.trim()
    if (!title) return

    if (editingTaskId) {
      setTasks(current => current.map(task => task.id === editingTaskId ? {
        ...task,
        title,
        date: draft.date,
        priority: draft.priority,
        allDay: draft.allDay,
        time: draft.allDay ? undefined : draft.time || undefined,
        deadline: draft.deadline || undefined,
        notes: draft.notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      } : task))
    } else {
      const task: Task = {
        id: crypto.randomUUID(),
        title,
        date: draft.date,
        priority: draft.priority,
        status: 'todo',
        allDay: draft.allDay,
        time: draft.allDay ? undefined : draft.time || undefined,
        deadline: draft.deadline || undefined,
        notes: draft.notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setTasks(current => [...current, task])
    }

    const taskDate = fromDateKey(draft.date)
    setSelectedDate(taskDate)
    setVisibleMonth(new Date(taskDate.getFullYear(), taskDate.getMonth(), 1))
    closeEditor()
  }

  const setTaskStatus = (id: string, status: TaskStatus) => {
    setTasks(current => current.map(task => task.id === id ? { ...task, status, updatedAt: new Date().toISOString() } : task))
  }

  const deleteTask = (id: string) => {
    setTasks(current => current.filter(task => task.id !== id))
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
            <button type="button" className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}>任务</button>
            <button type="button" className={view === 'mood' ? 'active' : ''} onClick={() => setView('mood')}>情绪</button>
          </div>
        </div>

        <div className="weekday-row">
          {WEEKDAYS.map(day => <div key={day}>{day}</div>)}
        </div>

        <div className={`calendar-grid ${view === 'mood' ? 'mood-view' : ''}`}>
          {days.map(({ date, inCurrentMonth }) => {
            const isToday = sameDay(date, today)
            const isSelected = selectedDate ? sameDay(date, selectedDate) : false
            const key = toDateKey(date)
            const dayTasks = tasksByDate.get(key) ?? []
            return (
              <button
                key={key}
                type="button"
                className={`day-cell${inCurrentMonth ? '' : ' outside-month'}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                aria-label={formatDate(date)}
                onClick={() => openDay(date)}
              >
                <span className="day-number">{date.getDate()}</span>
                {view === 'tasks' && dayTasks.length > 0 && (
                  <span className="task-preview-list">
                    {dayTasks.slice(0, 3).map(task => (
                      <span key={task.id} className={`task-preview priority-${task.priority} status-${task.status}`}>
                        <span className="priority-dot" />
                        <span className="task-preview-title">{task.title}</span>
                        {!task.allDay && task.time && <span className="task-preview-time">{task.time}</span>}
                      </span>
                    ))}
                    {dayTasks.length > 3 && <span className="more-tasks">+{dayTasks.length - 3}</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <footer className="status-line">
        <span className="status-dot" aria-hidden="true" />
        <span>Local first · 任务已保存在此设备</span>
      </footer>

      {selectedDate && (
        <>
          <button className="drawer-backdrop" type="button" aria-label="关闭日期详情" onClick={() => setSelectedDate(null)} />
          <aside className="day-drawer" aria-label={`${formatDate(selectedDate)} 日期详情`}>
            <div className="drawer-header">
              <div>
                <span className="eyebrow">DAY DETAIL</span>
                <h2>{formatDate(selectedDate)}</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setSelectedDate(null)} aria-label="关闭">×</button>
            </div>

            <section className="detail-section task-section">
              <div className="section-heading">
                <h3>任务</h3>
                {selectedTasks.length > 0 && <span>{selectedTasks.length}</span>}
              </div>

              {selectedTasks.length === 0 ? (
                <p className="empty-state">这一天还没有任务。</p>
              ) : (
                <div className="task-list">
                  {selectedTasks.map(task => (
                    <article
                      key={task.id}
                      className={`task-item priority-${task.priority} status-${task.status} ${deadlineStage(task)}`}
                      onClick={() => editTask(task)}
                    >
                      <span className="task-priority-bar" />
                      <button
                        type="button"
                        className="task-checkbox"
                        aria-label={task.status === 'completed' ? `取消完成 ${task.title}` : task.status === 'abandoned' ? `恢复 ${task.title}` : `完成 ${task.title}`}
                        onClick={event => {
                          event.stopPropagation()
                          setTaskStatus(task.id, task.status === 'todo' ? 'completed' : 'todo')
                        }}
                      >
                        {task.status === 'completed' ? '✓' : task.status === 'abandoned' ? '×' : ''}
                      </button>
                      <strong className="task-title">{task.title}</strong>
                      {!task.allDay && task.time && <span className="task-card-time">{task.time}</span>}
                    </article>
                  ))}
                </div>
              )}

              <button className="add-button" type="button" onClick={openTaskEditor}>＋ 添加任务</button>
            </section>

            <section className="detail-section muted-section">
              <div className="section-heading"><h3>今日心情</h3></div>
              <p className="empty-state">尚未记录</p>
            </section>

            <section className="detail-section muted-section">
              <div className="section-heading"><h3>记录</h3></div>
              <p className="empty-state">暂无记录</p>
              <button className="add-button secondary" type="button" disabled>＋ 添加记录</button>
            </section>
          </aside>
        </>
      )}

      {editorOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-backdrop" type="button" aria-label="关闭任务编辑器" onClick={closeEditor} />
          <section className="task-editor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
            <div className="editor-header">
              <div>
                <span className="eyebrow">{editingTaskId ? 'TASK DETAIL' : 'NEW TASK'}</span>
                <h2 id="task-editor-title">{editingTaskId ? '任务详情' : '添加任务'}</h2>
              </div>
              <button className="close-button" type="button" onClick={closeEditor} aria-label="关闭">×</button>
            </div>

            <div className="editor-body">
              <label className="field full-field">
                <span>任务名称 *</span>
                <input autoFocus value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="要做什么？" />
              </label>

              <div className="field-grid">
                <label className="field">
                  <span>日期</span>
                  <input type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Deadline</span>
                  <input type="date" value={draft.deadline} onChange={event => setDraft(current => ({ ...current, deadline: event.target.value }))} />
                </label>
              </div>

              <div className="field full-field">
                <span>优先级</span>
                <div className="priority-picker">
                  {PRIORITIES.map(priority => (
                    <button key={priority.value} type="button" className={`priority-choice priority-${priority.value}${draft.priority === priority.value ? ' active' : ''}`} onClick={() => setDraft(current => ({ ...current, priority: priority.value }))}>
                      <span className="priority-dot" />
                      <strong>{priority.label}</strong>
                      <small>{priority.hint}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="time-row">
                <label className="check-field">
                  <input type="checkbox" checked={draft.allDay} onChange={event => setDraft(current => ({ ...current, allDay: event.target.checked }))} />
                  <span>全天</span>
                </label>
                {!draft.allDay && (
                  <label className="field compact-field">
                    <span>时间</span>
                    <input type="time" value={draft.time} onChange={event => setDraft(current => ({ ...current, time: event.target.value }))} />
                  </label>
                )}
              </div>

              <div className="field-grid future-fields">
                <label className="field">
                  <span>Repeat</span>
                  <select disabled defaultValue="none"><option value="none">不重复 · 稍后实现</option></select>
                </label>
                <label className="field">
                  <span>Tags</span>
                  <select disabled defaultValue="default"><option value="default">#默认 · 稍后实现</option></select>
                </label>
              </div>

              <label className="field full-field">
                <span>备注</span>
                <textarea rows={4} value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder="可选" />
              </label>
            </div>

            <div className="editor-footer">
              {editingTaskId && (
                <div className="editor-secondary-actions">
                  <button type="button" className="abandon-button" onClick={() => { setTaskStatus(editingTaskId, 'abandoned'); closeEditor() }}>放弃任务</button>
                  <button type="button" className="delete-button" onClick={() => { deleteTask(editingTaskId); closeEditor() }}>删除任务</button>
                </div>
              )}
              <div className="editor-primary-actions">
                <button className="cancel-button" type="button" onClick={closeEditor}>取消</button>
                <button className="save-button" type="button" onClick={saveTask} disabled={!draft.title.trim()}>{editingTaskId ? '保存修改' : '保存任务'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
