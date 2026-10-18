import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { trashFocusSession } from '../../domain/focus'
import { cascadeTrashHabitFocus } from '../../domain/habitFocusLifecycle'
import type { FocusSession, Tag } from '../../types'
import type { MainView } from '../navigation/navigationTypes'
import type { Habit, HabitCheckIn } from './habitDomain'
import { HabitsPage } from './HabitsPage'

export interface HabitWorkspaceProps {
  activeFocusHabit: Habit | null
  activeFocusSession: FocusSession | null
  beginEditFocusSession: (session: FocusSession) => void
  focusEditId: string | null
  focusHistoryEditFields: React.JSX.Element
  focusSessions: FocusSession[]
  formatUiDate: (date: Date) => string
  habitCheckIns: HabitCheckIn[]
  habits: Habit[]
  mainView: MainView
  quickHabitCheckIn: (habit: Habit, date: string) => void
  requestedHabitId: { id: string; request: number; } | null
  saveFocusSessionEdit: () => void
  setFocusEditId: React.Dispatch<React.SetStateAction<string | null>>
  setFocusSessions: React.Dispatch<React.SetStateAction<FocusSession[]>>
  setHabitCheckIns: React.Dispatch<React.SetStateAction<HabitCheckIn[]>>
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>
  startHabitFocus: (habit: Habit) => void
  stopHabitFocus: (habit: Habit) => void
  tags: Tag[]
  timerNow: number
  undoHabitCheckIn: (habit: Habit, date: string) => void
}

export function HabitWorkspace({
  activeFocusHabit,
  activeFocusSession,
  beginEditFocusSession,
  focusEditId,
  focusHistoryEditFields,
  focusSessions,
  formatUiDate,
  habitCheckIns,
  habits,
  mainView,
  quickHabitCheckIn,
  requestedHabitId,
  saveFocusSessionEdit,
  setFocusEditId,
  setFocusSessions,
  setHabitCheckIns,
  setHabits,
  startHabitFocus,
  stopHabitFocus,
  tags,
  timerNow,
  undoHabitCheckIn
}: HabitWorkspaceProps) {
  return <>
{mainView === 'habits' && <HabitsPage formatUiDate={formatUiDate} habits={habits} checkIns={habitCheckIns} tags={tags} onHabitsChange={setHabits} onDeleteHabit={habitId=>{const now=new Date().toISOString();setHabits(current=>current.map(h=>h.id===habitId?{...h,deletedAt:now,updatedAt:now}:h));setFocusSessions(current=>cascadeTrashHabitFocus(current,habitId,now))}} onCheckInsChange={setHabitCheckIns} onQuickCheckIn={quickHabitCheckIn} onUndoCheckIn={undoHabitCheckIn} focusSessions={focusSessions} focusNow={timerNow} activeFocusHabitId={activeFocusHabit?.id??null} requestedHabitId={requestedHabitId} focusBusy={Boolean(activeFocusSession)} onStartHabitFocus={startHabitFocus} onStopHabitFocus={stopHabitFocus} onEditFocusSession={session=>beginEditFocusSession(session)} onTrashFocusSession={session=>{if(!window.confirm('确定删除这条习惯专注记录吗？'))return;const now=new Date().toISOString();setFocusSessions(cur=>cur.map(item=>item.id===session.id?trashFocusSession(item,now):item))}} />}

{mainView === 'habits' && focusEditId && focusSessions.some(session=>session.id===focusEditId && session.context?.kind==='habit') && (
        <div className="habit-modal-backdrop" role="presentation">
          <section className="habit-modal" role="dialog" aria-modal="true" aria-label="修改习惯专注记录">
            <header><h3>修改习惯专注记录</h3><Button type="button" aria-label="关闭专注编辑" onClick={()=>setFocusEditId(null)}>×</Button></header>
            {focusHistoryEditFields}
            <footer><Button type="button" onClick={()=>setFocusEditId(null)}>取消</Button><Button variant="primary" className="primary-button" type="button" onClick={saveFocusSessionEdit}>保存修改</Button></footer>
          </section>
        </div>
      )}
  </>
}
