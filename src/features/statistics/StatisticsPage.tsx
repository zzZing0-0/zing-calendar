import type * as React from 'react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field } from '../../components/ui/Field'
import { PageHeading } from '../../components/ui/PageHeading'
import {
  ENERGIES
} from '../../domain/journal'
import {
  DEFAULT_TAG_ID
} from '../../domain/preferences'
import type { StatisticsInput } from '../../domain/statistics'
import { buildStatistics } from '../../domain/statistics'
import {
  dayDiff,
  formatFocusDuration
} from '../../domain/task'
import type {
  JournalImpact,
  MoodLevel
} from '../../types'
import { EnergyBattery, MoodFace } from '../journal/StatusIndicators'
import type { MainView } from '../navigation/navigationTypes'

export interface StatisticsPageProps extends Omit<StatisticsInput, 'statsRange'> {
  excludeDefaultFocusStats: boolean
  mainView: MainView
  setExcludeDefaultFocusStats: React.Dispatch<React.SetStateAction<boolean>>
  setWordCloudIgnored: React.Dispatch<React.SetStateAction<string[]>>
}

export function StatisticsPage({
  today, weekStartsMonday, activeTasks, activeJournalEntries, dailyMoods, dailyEnergy, managedTags, tags, focusSessions, notes, wordCloudIgnored, timerNow,
  excludeDefaultFocusStats,
  mainView,
  setExcludeDefaultFocusStats,
  setWordCloudIgnored,
}: StatisticsPageProps) {
  const [statsRange, setStatsRange] = useState<'week'|'month'|'30d'|'year'|'all'>('30d')
  const [moodHeatmapYear, setMoodHeatmapYear] = useState<number>(() => today.getFullYear())
  const [expandedFocusColor, setExpandedFocusColor] = useState<string | null>(null)

  const statistics = useMemo(() => buildStatistics({
    today, statsRange, weekStartsMonday, activeTasks, activeJournalEntries, dailyMoods, dailyEnergy, managedTags, tags,
    focusSessions, notes, wordCloudIgnored, timerNow, excludeDefaultFocusStats,
  }),[activeTasks,activeJournalEntries,dailyMoods,dailyEnergy,managedTags,tags,focusSessions,notes,statsRange,weekStartsMonday,wordCloudIgnored,timerNow,excludeDefaultFocusStats])

  const statsPercent = (value:number) => `${Math.round(value*100)}%`
  const impactLabel = (value:JournalImpact) => value>0 ? `+${value}` : String(value)
  const moodStatLabels = ['','特别差','有点差','一般','还可以','很高兴']

  return <>
{mainView === 'statistics' && (
        <section className="statistics-page">
          <PageHeading title={<>统计</>} eyebrow={<>STATISTICS</>} className="stats-heading" />
          <div className="stats-range" role="group" aria-label="统计时间范围">
            {([['week','本周'],['month','本月'],['30d','近30天'],['year','今年'],['all','全部']] as const).map(([value,label])=>
              <Button type="button" key={value} className={statsRange===value?'active':''} onClick={()=>setStatsRange(value)}>{label}</Button>
            )}
          </div>

          <div className="stats-overview">
            <div className="stat-number-card"><span>完成任务</span><strong>{statistics.completed}</strong><small>{statistics.eligibleTasks.length} 个已进入执行期</small></div>
            <div className="stat-number-card"><span>完成率</span><strong>{statistics.eligibleTasks.length?statsPercent(statistics.completionRate):'—'}</strong><small>{statistics.eligibleTasks.length?`${statistics.completed} / ${statistics.eligibleTasks.length}`:'暂无可统计任务'}</small></div>
            <div className="stat-number-card"><span>记录</span><strong>{statistics.journals.length}</strong><small>{statistics.journalDays} 天写过 Journal</small></div>
            <div className="stat-number-card"><span>心情记录</span><strong>{statistics.moodDays}</strong><small>记录天数</small></div>
          </div>

          <section className="stats-section">
            <div className="stats-section-title"><div><span className="eyebrow">TASKS</span><h3>任务</h3></div></div>
            <div className="stats-inline-cards">
              <div><span>完成</span><strong>{statistics.completed}</strong></div>
              <div><span>放弃</span><strong>{statistics.abandoned}</strong></div>
              <div><span>逾期待办</span><strong>{statistics.overdue}</strong></div>
            </div>
            {statistics.eligibleTasks.length ? <>
              <div className="stats-subblock"><h4>优先级分布</h4>
                <div className="stat-bars">{statistics.priorityCounts.map(row=><div className={`stat-bar-row priority-stat-${row.value}`} key={row.value}><span>P{row.value}</span><div><i style={{width:`${row.count/statistics.eligibleTasks.length*100}%`}} /></div><strong>{row.count}</strong></div>)}</div>
              </div>
              <div className="postpone-summary">
                <div><span>延期率</span><strong>{statsPercent(statistics.postponeRate)}</strong><small>{statistics.postponedTasks} / {statistics.eligibleTasks.length} 个任务</small></div>
                <div><span>延期总次数</span><strong>{statistics.postponeEvents}</strong></div>
                <div><span>单任务最多</span><strong>{statistics.maxPostponeCount} 次</strong></div>
                <div><span>最长累计延期</span><strong>{statistics.maxPostponeDays} 天</strong></div>
              </div>
            </> : <EmptyState className="page-empty compact">这个时间范围还没有进入执行期的任务，暂不统计优先级与延期。</EmptyState>}
            {statistics.mostPostponedTag && <div className="most-postponed-tag">
              <span>最常延期标签</span><strong>#{statistics.mostPostponedTag.tag.name}</strong>
              <small>{statsPercent(statistics.mostPostponedTag.postponeRate)} · {statistics.mostPostponedTag.postponeTasks}/{statistics.mostPostponedTag.tasks}个任务</small>
            </div>}
            {(statistics.maxPostponeCount>0||statistics.maxPostponeDays>0) && <div className="postpone-extremes">
              {statistics.maxPostponeCount>0 && statistics.mostPostponedTask && <span>延期次数最多：<strong>{statistics.mostPostponedTask.title}</strong> · {statistics.maxPostponeCount}次</span>}
              {statistics.maxPostponeDays>0 && statistics.longestPostponedTask && <span>累计延期最长：<strong>{statistics.longestPostponedTask.title}</strong> · {statistics.maxPostponeDays}天</span>}
            </div>}
            <div className="stats-subblock">
              <h4>完成趋势</h4>
              {statistics.completionTrend.length ? <div className="completion-chart-wrap">
                <div className="completion-trend">
                  {statistics.completionTrend.map((item,index)=>{
                    const max=Math.max(...statistics.completionTrend.map(x=>x.count),1)
                    const labelEvery=Math.max(1,Math.ceil(statistics.completionTrend.length/8))
                    const showLabel=index===0||index===statistics.completionTrend.length-1||index%labelEvery===0
                    return <div key={item.key} title={`${item.key} · 完成 ${item.count}`}>
                      <span className={`completion-count${showLabel?' show-mobile-count':''}`}>{item.count}</span>
                      <i style={{height:`${Math.max(8,item.count/max*100)}%`}} />
                      <span className="completion-date">{showLabel?item.label:''}</span>
                    </div>
                  })}
                </div>
              </div> : <EmptyState className="page-empty compact">这个时间范围还没有完成记录。</EmptyState>}
            </div>

          </section>

          <section className="stats-section focus-section">
            <div className="stats-section-title"><div><span className="eyebrow">FOCUS</span><h3>专注</h3></div><small>{formatFocusDuration(statistics.focusSeconds)}</small></div>
            <div className="stats-subblock focus-stats-block">
              <div className="focus-stats-heading"><h4>专注时间</h4><div className="focus-stats-heading-actions"><Field className="ended-view-toggle focus-default-toggle"><input type="checkbox" checked={excludeDefaultFocusStats} onChange={event=>setExcludeDefaultFocusStats(event.target.checked)} /><i /><span>排除默认标签</span></Field><strong>{formatFocusDuration(statistics.focusSeconds)}</strong></div></div>
              {statistics.focusTrend.length ? <div className="completion-chart-wrap">
                <div className="completion-trend focus-trend">
                  {statistics.focusTrend.map((item,index)=>{
                    const max=Math.max(...statistics.focusTrend.map(x=>x.seconds),1)
                    const labelEvery=Math.max(1,Math.ceil(statistics.focusTrend.length/8))
                    const showLabel=index===0||index===statistics.focusTrend.length-1||index%labelEvery===0
                    return <div key={item.key} title={`${item.key} · 专注 ${formatFocusDuration(item.seconds)}`}>
                      <span className={`completion-count${showLabel?' show-mobile-count':''}`}>{item.seconds >= 60 ? `${Math.floor(item.seconds/60)}m` : item.seconds > 0 ? '<1m' : '0'}</span>
                      <i style={{height:`${Math.max(8,item.seconds/max*100)}%`}} />
                      <span className="completion-date">{showLabel?item.label:''}</span>
                    </div>
                  })}
                </div>
              </div> : <EmptyState className="page-empty compact">这个时间范围还没有专注记录。</EmptyState>}
              {statistics.focusColorRows.length>0 && <div className="focus-distribution">
                <div className="focus-pie-wrap"><div className="focus-pie" style={{background:statistics.focusPieGradient}} aria-label="按标签颜色汇总的专注时间分布"><i><b>{formatFocusDuration(statistics.focusSeconds)}</b><small>总专注</small></i>{statistics.focusPieLabels.map(row=><span key={row.color} className="focus-pie-percent" style={{left:`${row.x}%`,top:`${row.y}%`}}>{Math.round(row.percent)}%</span>)}</div></div>
                <div className="focus-color-stats">
                {statistics.focusColorRows.map(row=><div className="focus-color-block" key={row.color}><Button type="button" onClick={()=>setExpandedFocusColor(current=>current===row.color?null:row.color)}><span><i style={{background:row.color}} />{formatFocusDuration(row.seconds)}</span><strong>{row.percent.toFixed(row.percent>=10?0:1)}%</strong><b>{expandedFocusColor===row.color?'⌃':'›'}</b></Button>{expandedFocusColor===row.color&&<div className="focus-color-detail">{row.tags.sort((a,b)=>b.seconds-a.seconds).map(tagRow=><div key={tagRow.tag.id}><span><i style={{background:tagRow.tag.color}} />{tagRow.tag.name}</span><strong>{formatFocusDuration(tagRow.seconds)}</strong><small>{row.seconds?`${(tagRow.seconds/row.seconds*100).toFixed(1)}%`:''}</small></div>)}</div>}</div>)}
                </div>
              </div>}
            </div>
          </section>
          <section className="stats-section">
            <div className="stats-section-title"><div><span className="eyebrow">JOURNAL</span><h3>记录与事件影响</h3></div><small>{statistics.journals.length} 篇 · {statistics.journalDays} 天</small></div>
            <div className="impact-distribution">
              {statistics.journals.length ? statistics.impactCounts.map(row=><div key={row.value} className={`impact-stat impact-${row.value<0?'negative':row.value>0?'positive':'neutral'}`}><span>{impactLabel(row.value)}</span><strong>{row.count}</strong></div>) : <EmptyState className="page-empty compact">这个时间范围还没有 Journal，暂不统计 Event Impact。</EmptyState>}
            </div>
            <div className="stats-subblock"><h4>词云</h4><p className="stats-note">来自当前时间范围内 Journal 的标题、正文与后续消息；字体越大，出现越频繁。点击词语可屏蔽。</p>
              {statistics.words.length ? <div className="journal-word-cloud">{statistics.words.map(({word,count},index)=>{
                const max=statistics.words[0]?.count||1
                const frequencyScale=Math.sqrt(count/max)
                const rankScale=Math.max(.46,1-index/70)
                const size=12+Math.round(26*frequencyScale*rankScale)
                if(index===0) return <Button type="button" className="word-cloud-center word-cloud-word" key={word} style={{fontSize:`${Math.max(38,size)}px`}} title={`${count} 次 · 点击屏蔽`} onClick={()=>setWordCloudIgnored(list=>list.includes(word)?list:[...list,word])}>{word}</Button>
                const angle=index*2.399963229728653
                const radius=Math.min(43,10+Math.sqrt(index)*7.2)
                const left=50+Math.cos(angle)*radius
                const top=50+Math.sin(angle)*radius*.78
                return <Button type="button" className="word-cloud-word" key={word} style={{fontSize:`${size}px`,left:`${left}%`,top:`${top}%`}} title={`${count} 次 · 点击屏蔽`} onClick={()=>setWordCloudIgnored(list=>list.includes(word)?list:[...list,word])}>{word}</Button>
              })}</div> : <EmptyState className="page-empty compact">还没有足够的文字。</EmptyState>}
            </div>
          </section>

          <section className="stats-section">
            <div className="stats-section-title"><div><span className="eyebrow">STATUS</span><h3>状态</h3></div><small>{statistics.statusDays} 天</small></div>
            {(statsRange==='year'||statsRange==='all') && (
              <div className="status-summary-groups">
                <div className="status-summary-group"><strong className="status-summary-label">心情</strong><div className="mood-stat-list">{statistics.moodCounts.map(row=><div key={`mood-${row.value}`}><span className="mood-stat-face"><MoodFace level={row.value} /></span><span>{moodStatLabels[row.value]}</span><strong>{row.count}</strong></div>)}</div></div>
                <div className="status-summary-group"><strong className="status-summary-label">能量</strong><div className="mood-stat-list energy-stat-list">{statistics.energyCounts.map(row=><div key={`energy-${row.value}`}><span className="energy-stat-icon"><EnergyBattery level={row.value} /></span><span>{ENERGIES.find(item=>item.value===row.value)?.label}</span><strong>{row.count}</strong></div>)}</div></div>
              </div>
            )}
            {(statsRange==='year'||statsRange==='all') ? (
              <div className="mood-heatmap-wrap status-heatmaps">
                {(() => {
                  const years=statistics.allHeatmapYears
                  const selected=years.find(group=>group.year===moodHeatmapYear) ?? years[years.length-1]
                  if(!selected) return <EmptyState className="page-empty compact">还没有状态记录。</EmptyState>
                  const index=Math.max(0,years.findIndex(group=>group.year===selected.year))
                  const heatmap=(kind:'mood'|'energy') => <div className="status-heatmap-block">
                    <strong>{kind==='mood'?'心情':'能量'}</strong>
                    <div className="mood-year-heatmap status-year-heatmap" ref={element=>{if(element && window.innerWidth<=620) requestAnimationFrame(()=>{element.scrollLeft=element.scrollWidth})}}>
                      {Array.from({length:selected.leading}).map((_,i)=><i key={`${kind}-blank-${selected.year}-${i}`} className="heatmap-blank" />)}
                      {selected.days.map(day=>{
                        const level=kind==='mood'?day.level:day.energyLevel
                        const label=kind==='mood'?(level?moodStatLabels[level]:'未记录'):(level?ENERGIES.find(item=>item.value===level)?.label:'未记录')
                        return <i key={`${kind}-${day.key}`} title={`${day.key} · ${label}`} className={`${level?`mood-${level}`:''}${day.future?' future':''}`} />
                      })}
                    </div>
                  </div>
                  return <div className="mood-single-year-wrap">
                    <div className="mood-heatmap-year status-heatmap-year">
                      <span>{selected.year}</span>
                      {heatmap('mood')}
                      {heatmap('energy')}
                    </div>
                    {years.length>1&&<div className="mood-year-navigator" onWheel={event=>{
                      if(Math.abs(event.deltaY)+Math.abs(event.deltaX)<8) return
                      const direction=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)>0?1:-1
                      const next=Math.max(0,Math.min(years.length-1,index+direction))
                      if(next!==index)setMoodHeatmapYear(years[next].year)
                    }}>
                      <Button type="button" disabled={index<=0} onClick={()=>index>0&&setMoodHeatmapYear(years[index-1].year)} aria-label="上一年">‹</Button>
                      <strong>{selected.year}年</strong>
                      <Button type="button" disabled={index>=years.length-1} onClick={()=>index<years.length-1&&setMoodHeatmapYear(years[index+1].year)} aria-label="下一年">›</Button>
                    </div>}
                  </div>
                })()}
              </div>
            ) : (statsRange==='week'||statsRange==='month'||statsRange==='30d') && (
              <div className="mood-trend-wrap status-trend-wrap">
                <div className="status-trend-heading"><h4>状态变化</h4><div className="status-trend-legend"><span><i className="legend-mood-line" />心情</span><span><i className="legend-energy-line" />能量</span></div></div>
                {(statistics.moodLinePoints.length || statistics.energyLinePoints.length) ? <div className="mood-trend-layout status-trend-layout">
                  <div className="mood-chart-area">
                    <svg className="mood-trend-chart status-trend-chart" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="心情与能量状态变化对比">
                      {[4,12,20,28,36].map(y=><line key={y} x1="0" x2="100" y1={y} y2={y} className="mood-grid-line" />)}
                      {statistics.moodLinePoints.length>1 && <polyline points={statistics.moodLinePoints.map(p=>`${p.x},${p.y}`).join(' ')} className="status-mood-line" />}
                      {statistics.energyLinePoints.length>1 && <polyline points={statistics.energyLinePoints.map(p=>`${p.x},${p.y}`).join(' ')} className="status-energy-line" />}
                    </svg>
                    <div className="mood-x-axis">
                      <span className="mood-x-start">{statistics.rangeStart.slice(5).replace('-','/')}</span>
                      <span className="mood-x-end">{statistics.todayKey.slice(5).replace('-','/')}</span>
                    </div>
                  </div>
                </div> : <EmptyState className="page-empty compact">这个时间范围还没有心情或能量记录。</EmptyState>}
              </div>
            )}
          </section>

          <section className="stats-section">
            <div className="stats-section-title"><div><span className="eyebrow">TAGS</span><h3>标签分析</h3></div></div>
            <div className="tag-subsection">
              <div className="tag-subsection-heading"><h4>标签与任务的联系</h4><small>{statistics.tagTimelineAll?'完整生命周期 · 完成量与实际执行频率':'当前时间范围 · 完成量与实际执行频率'} · 未来任务不计</small></div>
              {statistics.tagTaskTimelines.length ? <div className="tag-task-timelines">
                <div className="tag-timeline-axis"><span>{statistics.timelineStart}</span><span>今天</span></div>
                {[...statistics.tagTaskTimelines].sort((a,b)=>b.completed-a.completed||(a.firstDate ?? '').localeCompare(b.firstDate ?? '')).map(row=>{
                  const firstDate = row.firstDate ?? statistics.timelineStart
                  const startPct=Math.max(0,dayDiff(statistics.timelineStart,firstDate)/statistics.timelineSpan*100)
                  const endPct=Math.min(100,dayDiff(statistics.timelineStart,row.endKey)/statistics.timelineSpan*100)
                  return <div className={`tag-timeline-row${row.tag.archived?' archived':''}`} key={row.tag.id}>
                    <div className="tag-timeline-meta"><strong>#{row.tag.name}</strong><span>完成 {row.completed}</span>{row.tag.archived&&<em>已归档</em>}</div>
                    <div className="tag-timeline-track" title={`${firstDate} → ${row.endKey}`}>
                      <i className="tag-lifecycle" style={{left:`${startPct}%`,width:`${Math.max(.4,endPct-startPct)}%`}} />
                      {statistics.tagTimelineAll&&<span className="tag-start-date" style={{left:`${startPct}%`}}>{firstDate}</span>}
                      {row.days.map(day=>{const x=dayDiff(statistics.timelineStart,day.date)/statistics.timelineSpan*100;return <b key={day.date} title={`${day.date} · ${day.count} 个任务`} style={{left:`${x}%`,background:row.tag.color,opacity:Math.min(1,.42+day.count*.18)}} />})}
                      {row.tag.archived&&<span className="tag-archive-end" style={{left:`${endPct}%`}} title={`归档于 ${row.endKey}`} />}
                    </div>
                  </div>
                })}
              </div> : <EmptyState className="page-empty compact">还没有带标签的历史任务。</EmptyState>}
            </div>
            <div className="tag-subsection">
              <div className="tag-subsection-heading"><h4>标签与心情的联系</h4><small>Event Impact · 具体 Journal 事件对你的影响</small></div>
              <p className="stats-note tag-matrix-note">颜色深浅表示该标签内部这一档所占比例。</p>
            <div className="tag-impact-matrix-wrap">
              <table className="tag-impact-matrix">
                <thead>
                  <tr>
                    <th>标签</th>
                    {([-2,-1,0,1,2] as JournalImpact[]).map(value=><th key={value} title={`Event Impact ${impactLabel(value)}`}><MoodFace level={(value+3) as MoodLevel} /></th>)}
                    <th>Journal</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.defaultTagImpactRow.journals>0 && <tr key={DEFAULT_TAG_ID}>
                    <th scope="row">#默认</th>
                    {statistics.defaultTagImpactRow.impacts.map(item=>{
                      const ratio=statistics.defaultTagImpactRow.journals ? item.count/statistics.defaultTagImpactRow.journals : 0
                      return <td key={item.value} title={`${impactLabel(item.value)} · ${item.count}篇 · ${statsPercent(ratio)}`}>
                        {item.count>0 ? <span className={`impact-cell impact-cell-${item.value<0?'negative':item.value>0?'positive':'neutral'}`} style={{'--impact-alpha':Math.max(.10,ratio*.78)} as any}>{item.count}</span> : <span className="impact-cell-zero">—</span>}
                      </td>
                    })}
                    <td className="tag-journal-total"><strong>{statistics.defaultTagImpactRow.journals}</strong><small>篇</small></td>
                  </tr>}
                  {[...statistics.tagRows].filter(row=>row.journals>0).sort((a,b)=>b.journals-a.journals||a.tag.name.localeCompare(b.tag.name)).map(row=><tr key={row.tag.id}>
                    <th scope="row">#{row.tag.name}</th>
                    {row.impacts.map(item=>{
                      const ratio=row.journals ? item.count/row.journals : 0
                      return <td key={item.value} title={`${impactLabel(item.value)} · ${item.count}篇 · ${statsPercent(ratio)}`}>
                        {item.count>0 ? <span className={`impact-cell impact-cell-${item.value<0?'negative':item.value>0?'positive':'neutral'}`} style={{'--impact-alpha':Math.max(.10,ratio*.78)} as any}>{item.count}</span> : <span className="impact-cell-zero">—</span>}
                      </td>
                    })}
                    <td className="tag-journal-total"><strong>{row.journals}</strong><small>篇</small></td>
                  </tr>)}
                  {statistics.journals.length>0&&<tr className="tag-impact-total-row">
                    <th scope="row">总计</th>
                    {statistics.impactCounts.map(item=><td key={item.value}>
                      {item.count>0?<span className={`impact-cell impact-cell-${item.value<0?'negative':item.value>0?'positive':'neutral'}`} style={{'--impact-alpha':Math.max(.10,(item.count/statistics.journals.length)*.78)} as any}>{item.count}</span>:<span className="impact-cell-zero">—</span>}
                    </td>)}
                    <td className="tag-journal-total"><strong>{statistics.journals.length}</strong><small>篇</small></td>
                  </tr>}
                </tbody>
              </table>
              {statistics.defaultTagImpactRow.journals===0 && statistics.tagRows.every(row=>row.journals===0) && <EmptyState className="page-empty compact">当前时间范围还没有带标签的 Journal。</EmptyState>}
            </div>
            </div>
          </section>
        </section>
      )}
  </>
}
