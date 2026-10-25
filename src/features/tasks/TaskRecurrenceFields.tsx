import { recurrenceDraftInvalid } from './taskRecurrenceDraft'
import type { Dispatch, SetStateAction } from 'react'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { RECURRENCE_COUNT_MAX, RECURRENCE_INTERVAL_MAX, repeatPresetLabels } from '../../domain/task'
import type { TaskDraft } from '../../types'

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']


export function TaskRecurrenceFields({ draft, setDraft }: { draft: TaskDraft; setDraft: Dispatch<SetStateAction<TaskDraft>> }) {
  if (!draft.date) return null
  const labels = repeatPresetLabels(draft.date)
  return <section className="task-recurrence-fields" aria-label="重复任务设置">
    <Field className="field"><span>重复</span><select aria-label="重复" value={draft.repeatPreset} onChange={e => setDraft(d => ({ ...d, repeatPreset: e.target.value as TaskDraft['repeatPreset'] }))}>
      <option value="none">不重复</option><option value="daily">每天</option><option value="weekly">{labels.weekly}</option><option value="monthly">{labels.monthly}</option><option value="yearly">{labels.yearly}</option><option value="custom">自定义</option>
    </select></Field>
    {draft.repeatPreset === 'custom' && <>
      <div className="field-grid"><Field className="field"><span>重复间隔</span><input aria-label="重复间隔" type="number" min="1" max={RECURRENCE_INTERVAL_MAX} step="1" value={draft.repeatInterval} onChange={e => setDraft(d => ({ ...d, repeatInterval: Math.min(RECURRENCE_INTERVAL_MAX, Math.max(1, Math.round(Number(e.target.value) || 1))) }))}/></Field>
        <Field className="field"><span>重复单位</span><select aria-label="重复单位" value={draft.repeatUnit} onChange={e => setDraft(d => ({ ...d, repeatUnit: e.target.value as TaskDraft['repeatUnit'] }))}><option value="day">天</option><option value="week">周</option><option value="month">月</option><option value="year">年</option></select></Field></div>
      {draft.repeatUnit === 'week' && <div className="field"><span>指定星期（未选择时按开始日期）</span><div className="tag-picker">{weekdays.map((name, i) => <Button key={i} aria-pressed={draft.repeatWeekdays.includes(i)} className={`tag-choice${draft.repeatWeekdays.includes(i) ? ' active' : ''}`} onClick={() => setDraft(d => ({ ...d, repeatWeekdays: d.repeatWeekdays.includes(i) ? d.repeatWeekdays.filter(w => w !== i) : [...d.repeatWeekdays, i] }))}>{name}</Button>)}</div></div>}
    </>}
    {draft.repeatPreset !== 'none' && <>
      <Field className="field"><span>结束条件</span><select aria-label="结束条件" value={draft.repeatEndMode} onChange={e => setDraft(d => ({ ...d, repeatEndMode: e.target.value as TaskDraft['repeatEndMode'], repeatEndDate: d.repeatEndDate || d.date }))}><option value="never">永不结束</option><option value="date">到指定日期</option><option value="count">重复指定次数</option></select></Field>
      {draft.repeatEndMode === 'date' && <Field className="field"><span>重复结束日期</span><input aria-label="重复结束日期" type="date" min={draft.date} value={draft.repeatEndDate} onChange={e => setDraft(d => ({ ...d, repeatEndDate: e.target.value }))}/>{recurrenceDraftInvalid(draft) && <small role="alert">重复结束日期不能早于开始日期。</small>}</Field>}
      {draft.repeatEndMode === 'count' && <Field className="field"><span>重复次数</span><input aria-label="重复次数" type="number" min="1" max={RECURRENCE_COUNT_MAX} step="1" value={draft.repeatEndCount} onChange={e => setDraft(d => ({ ...d, repeatEndCount: Math.min(RECURRENCE_COUNT_MAX, Math.max(1, Math.round(Number(e.target.value) || 1))) }))}/></Field>}
      {draft.allDay && draft.endDate > draft.date && <p className="task-recurrence-hint">每次重复保留当前跨日期时长；各次任务可以跨日，完成状态仍分别记录。</p>}
    </>}
  </section>
}
