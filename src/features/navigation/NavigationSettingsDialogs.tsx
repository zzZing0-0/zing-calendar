import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { normalizeDaySectionOrder, normalizeSettingsGroupOrder } from '../../domain/layoutPreferences'
import { DEFAULT_MODULE_ORDER, moveModule } from '../../domain/modulePriority'
import { LayoutOrderEditor } from '../layout/LayoutOrderEditor'
import { MobileNavigationSettings } from './MobileNavigationSettings'
import type { MobileNavConfig } from './navigationConfig'
import { BUILTIN_MOBILE_NAV, normalizeMobileNav } from './navigationConfig'
import { saveDefaultNavigation } from './navigationStorage'
import type { MainView } from './navigationTypes'

export interface NavigationSettingsDialogsProps {
  daySectionOrder: ("habit" | "journal" | "calendar" | "mood" | "energy" | "period")[]
  layoutEditor: "settings" | "day" | null
  mainView: MainView
  mobileNav: MobileNavConfig
  mobileNavSettingsOpen: boolean
  mobileNavToast: string
  moduleDragRef: React.RefObject<"task" | "note" | "habit" | "journal" | "anniversary" | "focus" | null>
  moduleOrder: ("task" | "note" | "habit" | "journal" | "anniversary" | "focus")[]
  modulePriorityOpen: boolean
  setDaySectionOrder: React.Dispatch<React.SetStateAction<("habit" | "journal" | "calendar" | "mood" | "energy" | "period")[]>>
  setLayoutEditor: React.Dispatch<React.SetStateAction<"settings" | "day" | null>>
  setMobileNavSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>
  setMobileNavToast: React.Dispatch<React.SetStateAction<string>>
  setModuleOrder: React.Dispatch<React.SetStateAction<("task" | "note" | "habit" | "journal" | "anniversary" | "focus")[]>>
  setModulePriorityOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSettingsGroupOrder: React.Dispatch<React.SetStateAction<("focus" | "tags" | "data" | "random" | "weather" | "navigation" | "layout" | "tasks" | "encouragement" | "wordcloud" | "sync" | "links")[]>>
  setSyncedDefaultMobileNav: React.Dispatch<React.SetStateAction<MobileNavConfig | undefined>>
  settingsGroupOrder: ("focus" | "tags" | "data" | "random" | "weather" | "navigation" | "layout" | "tasks" | "encouragement" | "wordcloud" | "sync" | "links")[]
  syncedDefaultMobileNav: MobileNavConfig | undefined
  updateMobileNav: (value: MobileNavConfig) => void
}

export function NavigationSettingsDialogs({
  daySectionOrder,
  layoutEditor,
  mainView,
  mobileNav,
  mobileNavSettingsOpen,
  mobileNavToast,
  moduleDragRef,
  moduleOrder,
  modulePriorityOpen,
  setDaySectionOrder,
  setLayoutEditor,
  setMobileNavSettingsOpen,
  setMobileNavToast,
  setModuleOrder,
  setModulePriorityOpen,
  setSettingsGroupOrder,
  setSyncedDefaultMobileNav,
  settingsGroupOrder,
  syncedDefaultMobileNav,
  updateMobileNav
}: NavigationSettingsDialogsProps) {
  return <>
{layoutEditor && mainView === 'settings' && <LayoutOrderEditor kind={layoutEditor} order={layoutEditor==='day'?daySectionOrder:settingsGroupOrder} onChange={items=>{if(layoutEditor==='day')setDaySectionOrder(normalizeDaySectionOrder(items));else setSettingsGroupOrder(normalizeSettingsGroupOrder(items))}} onClose={()=>setLayoutEditor(null)} />}

{modulePriorityOpen && mainView === 'settings' && <div className="modal-layer" role="presentation">
        <Button className="modal-backdrop" type="button" aria-label="关闭模块优先级" onClick={() => setModulePriorityOpen(false)} />
        <section className="task-editor module-priority-dialog" role="dialog" aria-modal="true" aria-label="模块优先级">
          <DialogHeader title={<>模块优先级</>} eyebrow={<>MODULE PRIORITY</>} actions={<><Button className="close-button" type="button" onClick={() => setModulePriorityOpen(false)}>×</Button></>} />
          <div className="editor-body"><p className="module-priority-hint">拖动调整顺序，或使用上下按钮。只改变跨模块分类入口的顺序，不影响内容排序和导航栏。</p>
            <div className="module-priority-list">{moduleOrder.map((key,index) => <div key={key} className="module-priority-item" draggable onDragStart={event => {moduleDragRef.current=key;event.dataTransfer.effectAllowed='move'}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(moduleDragRef.current)setModuleOrder(current=>moveModule(current,moduleDragRef.current!,key));moduleDragRef.current=null}} onDragEnd={()=>{moduleDragRef.current=null}}>
              <span className="module-priority-handle" aria-hidden="true">☰</span><strong>{({task:'任务',note:'笔记',habit:'习惯',journal:'记录',anniversary:'纪念日',focus:'专注'} as const)[key]}</strong>
              <Button type="button" aria-label={`上移${key}`} disabled={index===0} onClick={()=>setModuleOrder(current=>moveModule(current,key,current[index-1]))}>↑</Button><Button type="button" aria-label={`下移${key}`} disabled={index===moduleOrder.length-1} onClick={()=>setModuleOrder(current=>moveModule(current,key,current[index+1],true))}>↓</Button>
            </div>)}</div>
            <Button type="button" className="ghost-button" onClick={()=>setModuleOrder([...DEFAULT_MODULE_ORDER])}>恢复默认</Button>
          </div>
        </section>
      </div>}

{mobileNavSettingsOpen && mainView === 'settings' && <MobileNavigationSettings
        config={mobileNav} onChange={updateMobileNav} onClose={() => setMobileNavSettingsOpen(false)} status={mobileNavToast}
        onSaveDefault={() => { const saved = normalizeMobileNav(mobileNav); setSyncedDefaultMobileNav(saved); saveDefaultNavigation(saved); setMobileNavToast('✓ 已设为默认导航，下次云同步时保存') }}
        onRestoreDefault={() => { updateMobileNav(syncedDefaultMobileNav ?? BUILTIN_MOBILE_NAV); setMobileNavToast('✓ 已恢复默认导航') }}
      />}
  </>
}
