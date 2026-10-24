import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeading } from '../../components/ui/PageHeading'
import {
  PRIORITIES
} from '../../domain/task'
import type { DateFormat } from '../../hooks/useAppPreferences'
import type { Attachment, EncouragementMessage, EncouragementStyle, RandomPoolGroup, RandomPoolItem, Tag, TaskPriority } from '../../types'
import { mobileNavIcon, mobileNavLabel } from '../navigation/MobileNavigation'
import type { MobileNavConfig } from '../navigation/navigationConfig'
import { missingMobileNav } from '../navigation/navigationConfig'
import type { MainView } from '../navigation/navigationTypes'

export interface SettingsPageProps {
  allStoredAttachments: Attachment[]
  archivedTags: Tag[]
  backupExporting: boolean
  backupInputRef: React.RefObject<HTMLInputElement | null>
  backupMessage: string
  dateFormat: DateFormat
  defaultPriority: TaskPriority
  effectiveAttachmentBytes: number
  effectiveAudioBytes: number
  effectiveImageBytes: number
  encouragementMessages: EncouragementMessage[]
  encouragementStyle: EncouragementStyle
  exportFullBackup: () => Promise<void>
  formatBytes: (bytes: number) => string
  greeting: string
  inspectB2Orphans: () => Promise<void>
  inspectBackupFile: (file: File) => Promise<void>
  keepScreenAwakeDuringFocus: boolean
  lastGithubSyncAt: string
  mainView: MainView
  maxFocusHours: number
  mobileNav: MobileNavConfig
  openExternalImport: () => void
  orphanCleanupBusy: boolean
  randomPoolGroups: RandomPoolGroup[]
  randomPoolItems: RandomPoolItem[]
  setArchivedTagsOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDateFormat: React.Dispatch<React.SetStateAction<DateFormat>>
  setDefaultPriority: React.Dispatch<React.SetStateAction<TaskPriority>>
  setEmotionManagerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEncouragementManagerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEncouragementStyle: React.Dispatch<React.SetStateAction<EncouragementStyle>>
  setEnvironmentManagerKind: React.Dispatch<React.SetStateAction<"weather" | "thermal" | null>>
  setGithubSyncOpen: React.Dispatch<React.SetStateAction<boolean>>
  setGreeting: React.Dispatch<React.SetStateAction<string>>
  setKeepScreenAwakeDuringFocus: React.Dispatch<React.SetStateAction<boolean>>
  setLayoutEditor: React.Dispatch<React.SetStateAction<"settings" | "day" | null>>
  setMaxFocusHours: React.Dispatch<React.SetStateAction<number>>
  setMobileNavSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>
  setMobileNavToast: React.Dispatch<React.SetStateAction<string>>
  setMobileSearchVisible: React.Dispatch<React.SetStateAction<boolean>>
  setModulePriorityOpen: React.Dispatch<React.SetStateAction<boolean>>
  setPlainExportOpen: React.Dispatch<React.SetStateAction<boolean>>
  setRandomPoolOpen: React.Dispatch<React.SetStateAction<boolean>>
  setRandomWheelOpen: React.Dispatch<React.SetStateAction<boolean>>
  setGachaLabOpen: React.Dispatch<React.SetStateAction<boolean>>
  setResetDataConfirm: React.Dispatch<React.SetStateAction<boolean>>
  setSearchOpen: React.Dispatch<React.SetStateAction<boolean>>
  setShowAllRecurringTasks: React.Dispatch<React.SetStateAction<boolean>>
  setStorageBrowser: React.Dispatch<React.SetStateAction<"image" | "audio" | null>>
  setTagManagerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setWeekStartsMonday: React.Dispatch<React.SetStateAction<boolean>>
  setWordIgnoreManagerOpen: React.Dispatch<React.SetStateAction<boolean>>
  settingsGroupStyle: (key: "focus" | "tags" | "data" | "random" | "weather" | "navigation" | "layout" | "tasks" | "encouragement" | "wordcloud" | "sync" | "links") => React.CSSProperties
  showAllRecurringTasks: boolean
  storageStats: { total: number; images: number; audio: number; data: number; attachmentCount: number; }
  switchMainView: (view: MainView) => void
  weekStartsMonday: boolean
  wordCloudIgnored: string[]
}

export function SettingsPage({
  allStoredAttachments,
  archivedTags,
  backupExporting,
  backupInputRef,
  backupMessage,
  dateFormat,
  defaultPriority,
  effectiveAttachmentBytes,
  effectiveAudioBytes,
  effectiveImageBytes,
  encouragementMessages,
  encouragementStyle,
  exportFullBackup,
  formatBytes,
  greeting,
  inspectB2Orphans,
  inspectBackupFile,
  keepScreenAwakeDuringFocus,
  lastGithubSyncAt,
  mainView,
  maxFocusHours,
  mobileNav,
  openExternalImport,
  orphanCleanupBusy,
  randomPoolGroups,
  randomPoolItems,
  setArchivedTagsOpen,
  setDateFormat,
  setDefaultPriority,
  setEmotionManagerOpen,
  setEncouragementManagerOpen,
  setEncouragementStyle,
  setEnvironmentManagerKind,
  setGithubSyncOpen,
  setGreeting,
  setKeepScreenAwakeDuringFocus,
  setLayoutEditor,
  setMaxFocusHours,
  setMobileNavSettingsOpen,
  setMobileNavToast,
  setMobileSearchVisible,
  setModulePriorityOpen,
  setPlainExportOpen,
  setRandomPoolOpen,
  setRandomWheelOpen,
  setGachaLabOpen,
  setResetDataConfirm,
  setSearchOpen,
  setShowAllRecurringTasks,
  setStorageBrowser,
  setTagManagerOpen,
  setWeekStartsMonday,
  setWordIgnoreManagerOpen,
  settingsGroupStyle,
  showAllRecurringTasks,
  storageStats,
  switchMainView,
  weekStartsMonday,
  wordCloudIgnored
}: SettingsPageProps) {
  return <>
{mainView === 'settings' && (
        <section className="settings-page">
          <PageHeading title={<>设置</>} eyebrow={<>SETTINGS</>} />
          <Button className="settings-mobile-search-entry" type="button" aria-label="打开全局搜索" onClick={() => { setMobileSearchVisible(true); setSearchOpen(true); window.setTimeout(() => document.querySelector<HTMLInputElement>('.global-search-wrap input')?.focus(), 0) }}><span aria-hidden="true">⌕</span><span>搜索任务、笔记、习惯等内容</span><span aria-hidden="true">›</span></Button>
          <div className="settings-group layout-settings-group" style={settingsGroupStyle('layout')}>
            <div className="settings-group-title"><h3>排序与布局</h3></div>
            <Button className="settings-link-row" type="button" onClick={()=>{setMobileNavToast('');setMobileNavSettingsOpen(true)}}><span><strong>底部导航</strong><small>选择与排列底部入口</small></span><b>›</b></Button>
            <Button className="settings-link-row" type="button" onClick={()=>setModulePriorityOpen(true)}><span><strong>模块优先级</strong><small>跨模块分类和同步预览顺序</small></span><b>›</b></Button>
            <Button className="settings-link-row" type="button" onClick={()=>setLayoutEditor('day')}><span><strong>今日详情排序</strong><small>任务固定第一，其余区块可调整</small></span><b>›</b></Button>
            <Button className="settings-link-row" type="button" onClick={()=>setLayoutEditor('settings')}><span><strong>设置页面排序</strong><small>仅调整一级功能区块</small></span><b>›</b></Button>
          </div>
          <div className="settings-group mobile-nav-settings-group" style={settingsGroupStyle('navigation')}>
            <div className="settings-group-title"><h3>导航</h3></div>
            {missingMobileNav(mobileNav).map(page => <Button key={page} className="settings-link-row settings-destination-link" type="button" aria-label={mobileNavLabel(page)} onClick={() => switchMainView(page)}><span className="settings-nav-link-label">{mobileNavIcon(page)}<strong>{mobileNavLabel(page)}</strong></span><b>›</b></Button>)}
          </div>

          <div className="settings-group calendar-task-settings" style={settingsGroupStyle('tasks')}>
            <div className="settings-group-title"><h3>日历任务</h3></div>
            <Field className="setting-row personalization-settings">
              <span><strong>顶部问候语</strong><small>显示在左上角品牌标记旁。</small></span>
              <input className="setting-text-input" value={greeting} onChange={e => setGreeting(e.target.value)} onBlur={() => { if (!greeting.trim()) setGreeting('Hello, Zing') }} />
            </Field>

            <div className="setting-row"><span><strong>每周开始日</strong></span><div className="setting-segment"><Button className={weekStartsMonday?'active':''} onClick={()=>setWeekStartsMonday(true)}>周一</Button><Button className={!weekStartsMonday?'active':''} onClick={()=>setWeekStartsMonday(false)}>周日</Button></div></div>
            <div className="setting-row"><span><strong>日期格式</strong></span><div className="setting-segment"><Button className={dateFormat==='dmy'?'active':''} onClick={()=>setDateFormat('dmy')}>22 Sep 2026</Button><Button className={dateFormat==='mdy'?'active':''} onClick={()=>setDateFormat('mdy')}>Sep 22, 2026</Button></div></div>
            <div className="setting-row">
              <span><strong>重复任务显示</strong><small>“逐个显示”会保留已完成/已放弃的历史记录，未完成的重复序列只显示最早一个；完成或放弃后再显示下一个。</small></span>
              <div className="setting-segment"><Button className={showAllRecurringTasks?'active':''} onClick={()=>setShowAllRecurringTasks(true)}>显示全部</Button><Button className={!showAllRecurringTasks?'active':''} onClick={()=>setShowAllRecurringTasks(false)}>逐个显示</Button></div>
            </div>
            <div className="setting-row">
              <span><strong>新任务默认优先级</strong><small>只影响以后新建的任务，不修改已有任务。</small></span>
              <div className="default-priority-setting">{PRIORITIES.map(priority=><Button key={priority.value} type="button" className={`default-priority-button priority-${priority.value}${defaultPriority===priority.value?' active':''}`} onClick={()=>setDefaultPriority(priority.value)}><i />{priority.label}</Button>)}</div>
            </div>
          </div>

          <div className="settings-group" style={settingsGroupStyle('focus')}>
            <div className="settings-group-title"><h3>专注</h3></div>
            <div className="encouragement-style-setting max-focus-setting">
              <div className="max-focus-setting-line"><strong>最长专注时长（小时）</strong><Field className="max-focus-hours-control"><input aria-label="最长专注时长（小时）" type="number" min="2" max="12" step="1" value={maxFocusHours} onChange={event=>{const value=Number.parseInt(event.target.value,10);if(Number.isFinite(value))setMaxFocusHours(Math.min(12,Math.max(2,value)))}} /></Field></div>
              <small>达到上限后自动结束并保存，避免忘记停止计时。</small>
            </div>
            <Field className="setting-row focus-wake-lock-setting">
              <input type="checkbox" checked={keepScreenAwakeDuringFocus} onChange={event=>setKeepScreenAwakeDuringFocus(event.target.checked)} />
              <span><strong>专注时保持屏幕常亮</strong><small>仅在任务计时或自由专注正在运行时请求常亮；结束计时后立即恢复系统锁屏规则。</small></span>
            </Field>
          </div>

          <div className="settings-group random-wheel-settings" style={settingsGroupStyle('random')}>
            <div className="settings-group-title"><h3>随机选择</h3></div>
            <Button className="settings-link-row" type="button" onClick={()=>setRandomWheelOpen(true)}><span><strong>抽奖大转盘</strong><small>转一下，看看这次的奇遇。结果不是任务，也不是命令。</small></span><b>›</b></Button>
            <Button className="settings-link-row" type="button" onClick={()=>setGachaLabOpen(true)}><span><strong>抽奖模拟器</strong><small>可配置奖池、收藏图鉴、兑换商店与理论 / 实际命中率。</small></span><b>›</b></Button>
            <Button className="settings-link-row" type="button" onClick={()=>setRandomPoolOpen(true)}><span><strong>幸运池</strong><small>{randomPoolGroups.length?`${randomPoolGroups.length} 个分组 · ${randomPoolItems.length} 个项目`:'创建分组、项目、数量/单位、权重与参与状态。'}</small></span><b>›</b></Button>
          </div>

          <div className="settings-group" style={settingsGroupStyle('tags')}>
            <div className="settings-group-title"><h3>标签</h3></div>
            <Button className="settings-link-row" type="button" onClick={()=>setTagManagerOpen(true)}><span><strong>标签管理</strong><small>管理任务、记录与专注共用的标签。</small></span><b>›</b></Button>
            <Button className="settings-link-row" type="button" onClick={()=>setArchivedTagsOpen(true)}><span><strong>已归档</strong><small>{archivedTags.length ? `${archivedTags.length} 个已归档标签` : '暂无已归档标签'}</small></span><b>›</b></Button>
          </div>

          <div className="settings-group" style={settingsGroupStyle('weather')}>
            <div className="settings-group-title"><h3>天气与情绪</h3></div>
            <Button className="settings-link-row" type="button" onClick={()=>setEnvironmentManagerKind('weather')}><span><strong>管理天气</strong><small>管理名称、Emoji、顺序与归档。</small></span><b>›</b></Button>
            <Button className="settings-link-row" type="button" onClick={()=>setEnvironmentManagerKind('thermal')}><span><strong>管理体感</strong><small>管理名称、Emoji、顺序与归档。</small></span><b>›</b></Button>
            <Button className="settings-link-row" type="button" onClick={()=>setEmotionManagerOpen(true)}><span><strong>管理具体感受</strong><small>管理 Record 使用的情绪词库与分组。</small></span><b>›</b></Button>
          </div>

          <div className="settings-group" style={settingsGroupStyle('encouragement')}>
            <div className="settings-group-title"><h3>鼓励语</h3></div>
            <div className="encouragement-style-setting">
              <span><strong>样式</strong><small>选择任务完成时鼓励卡的显示样式。</small></span>
              <div className="setting-segment"><Button type="button" className={encouragementStyle==='dark'?'active':''} onClick={()=>setEncouragementStyle('dark')}>Dark</Button><Button type="button" className={encouragementStyle==='light'?'active':''} onClick={()=>setEncouragementStyle('light')}>Light</Button><Button type="button" className={encouragementStyle==='random'?'active':''} onClick={()=>setEncouragementStyle('random')}>随机</Button></div>
            </div>
            <Button className="settings-link-row" type="button" onClick={()=>setEncouragementManagerOpen(true)}>
              <span><strong>管理鼓励语</strong><small>{encouragementMessages.filter(item=>!item.deletedAt).length ? `已有 ${encouragementMessages.filter(item=>!item.deletedAt).length} 句话 · 完成任务时随机出现一句` : '写一些真正对自己有意义的话，完成任务时随机出现一句。'}</small></span><b>›</b>
            </Button>
          </div>

          <div className="settings-group" style={settingsGroupStyle('wordcloud')}>
            <div className="settings-group-title"><h3>词云</h3></div>
            <Button className="settings-link-row" type="button" onClick={()=>setWordIgnoreManagerOpen(true)}>
              <span><strong>管理屏蔽词</strong><small>{wordCloudIgnored.length ? `已屏蔽 ${wordCloudIgnored.length} 个词` : '添加或恢复不参与词云统计的词。'}</small></span><b>›</b>
            </Button>
          </div>

          <div className="settings-group" style={settingsGroupStyle('sync')}>
            <div className="settings-group-title"><h3>云同步</h3></div>
            <Button className="settings-link-row" type="button" onClick={()=>setGithubSyncOpen(true)}>
              <span><strong>GitHub Sync</strong><small>{lastGithubSyncAt ? `上次同步 ${new Date(lastGithubSyncAt).toLocaleString()}` : 'GitHub 同步结构化数据；B2 同步图片与录音。'}</small></span><b>›</b>
            </Button>
          </div>

          <div className="settings-group" style={settingsGroupStyle('data')}>
            <div className="settings-group-title"><h3>数据</h3></div>
            <div className="storage-card">
              <div className="storage-total"><span>当前有效数据</span><strong>{formatBytes(storageStats.data + effectiveAttachmentBytes)}</strong></div>
              <div className="storage-breakdown">
                <span><i>结构化数据（GitHub）</i><b>{formatBytes(storageStats.data)}</b></span>
                <Button type="button" onClick={()=>setStorageBrowser('image')}><i>图片（{allStoredAttachments.filter(item=>item.type==='image').length} 个 · B2）</i><b>{formatBytes(effectiveImageBytes)}</b></Button>
                <Button type="button" onClick={()=>setStorageBrowser('audio')}><i>录音（{allStoredAttachments.filter(item=>item.type==='audio').length} 个 · B2）</i><b>{formatBytes(effectiveAudioBytes)}</b></Button>
              </div>
              <small>本设备同时在 IndexedDB 保留数据与附件缓存，用于离线使用；这里显示的是当前有效内容，不代表 GitHub 仓库或 B2 桶的实际总占用。</small>
            </div>
            <div className="backup-settings-block">
              <Button className="settings-link-row external-import-row" type="button" onClick={openExternalImport}>
                <span><strong>从外部导入</strong><small>通用 CSV 或已支持来源；导入任务统一标记为“从外部导入”。</small></span><b>›</b>
              </Button>
              <Button className="settings-link-row plain-export-row" type="button" onClick={()=>setPlainExportOpen(true)}>
                <span><strong>通用导出</strong><small>CSV 可直接用 Numbers、Excel 或其他软件打开，不用于 Zing 完整恢复。</small></span><b>›</b>
              </Button>
              <Button className="settings-link-row backup-export-row" type="button" onClick={()=>void exportFullBackup()} disabled={backupExporting}>
                <span><strong>备份</strong><small>任务、记录、心情、精力、经期、标签、纪念日、专注记录、设置与所有附件打包为 ZIP。</small></span>
                <b>{backupExporting?'…':'↓'}</b>
              </Button>
              <Button className="settings-link-row backup-import-row" type="button" onClick={()=>backupInputRef.current?.click()}>
                <span><strong>恢复数据</strong><small>从 Zing 完整备份 ZIP 恢复；确认后替换当前设备数据。</small></span><b>↑</b>
              </Button>
              <input ref={backupInputRef} className="backup-file-input" type="file" accept=".zip,application/zip" onChange={event=>{ const file=event.target.files?.[0]; if(file) void inspectBackupFile(file) }} />
              <Button className="settings-link-row orphan-cleanup-row" type="button" onClick={()=>void inspectB2Orphans()} disabled={orphanCleanupBusy}>
                <span><strong>清理 B2 孤儿附件</strong><small>先查看当前无任何任务或记录引用的 B2 文件，确认内容后再决定是否永久删除。</small></span><b>{orphanCleanupBusy?'…':'›'}</b>
              </Button>
              <Button className="settings-link-row danger-data-row" type="button" onClick={()=>setResetDataConfirm(true)}>
                <span><strong>清空所有数据</strong><small>清空任务、记录、心情、精力、经期、纪念日、专注记录、自建标签与附件；保留应用设置。删除会在下次 GitHub 同步传播。</small></span><b>×</b>
              </Button>
              {backupMessage && <div className="backup-status" role="status">{backupMessage}</div>}
            </div>
          </div>

          <div className="settings-group" style={settingsGroupStyle('links')}>
            <div className="settings-group-title"><h3>友情链接</h3></div>
            <Button className="settings-link-row friend-link-row" type="button" onClick={()=>window.open('https://zzzing0-0.github.io/audio-vocabulary-sprint/index.html','_blank','noopener,noreferrer')}>
              <span><strong>Zing 背单词</strong><small>Audio Vocabulary Sprint · 背单词与学习统计</small></span><b>↗</b>
            </Button>
            <Button className="settings-link-row friend-link-row" type="button" onClick={()=>window.open('http://www.yunshangxiezuo.com/home','_blank','noopener,noreferrer')}>
              <span><strong>云上写作</strong><small>小说写作与作品数据</small></span><b>↗</b>
            </Button>
          </div>
        </section>
      )}
  </>
}
