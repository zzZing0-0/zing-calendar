import * as Lucide from 'lucide-react'
import type { ComponentType } from 'react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'

type SvgIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
const library = Lucide as unknown as Record<string, SvgIcon>
const available = Object.keys(library).filter(key => key.endsWith('Icon') && key !== 'LucideIcon' && !!library[key]).sort()

// Lucide does not publish a browsable category index through lucide-react.
// Group icons by their English identifiers, with Chinese labels for browsing.
const categories = [
  { id: 'all', label: '全部', pattern: /./ },
  { id: 'health', label: '运动健康', pattern: /run|foot|bike|dumbbell|activity|heart|pulse|hospital|pill|syringe|stethoscope|medic|cross|weight|swim|trophy|target|timer|clock|accessibility|person|brain|bone|ear|eye|hand|thermometer|flame|droplet/i },
  { id: 'study', label: '学习工作', pattern: /book|notebook|pen|pencil|graduation|school|library|file|folder|clipboard|briefcase|computer|laptop|monitor|keyboard|calculator|chart|presentation|calendar|list|text|type|letter|mail|inbox|paperclip|printer|ruler|microscope|flask/i },
  { id: 'home', label: '生活家居', pattern: /home|house|bed|bath|shower|coffee|cup|glass|utensil|chef|cooking|cake|pizza|sandwich|apple|carrot|milk|shopping|store|sofa|lamp|shirt|washing|brush|scissors|key|lock|wallet|gift|baby|smile/i },
  { id: 'nature', label: '自然动物', pattern: /tree|leaf|sprout|flower|sun|moon|cloud|rain|snow|wind|mountain|waves|water|fish|bird|cat|dog|rabbit|bug|paw|shell|earth|globe|plant|seed|feather|turtle/i },
  { id: 'art', label: '娱乐艺术', pattern: /music|audio|headphone|mic|film|video|camera|image|palette|paint|brush|game|dice|puzzle|ticket|theater|drama|guitar|piano|radio|tv|book|party|star|sparkle/i },
  { id: 'travel', label: '交通旅行', pattern: /car|bus|train|tram|plane|ship|boat|bike|truck|map|navigation|compass|route|signpost|luggage|suitcase|tent|camp|hotel|ticket|passport|fuel|road|traffic/i },
  { id: 'symbols', label: '符号工具', pattern: /arrow|chevron|circle|square|triangle|check|plus|minus|x|alert|info|settings|tool|wrench|hammer|shield|flag|bookmark|hash|at|link|search|filter|sort|menu|grid|layout|align|move|rotate/i },
] as const
const PAGE_SIZE = 24

export function HabitIcon({ name, color }: { name?: string; color?: string }) {
  const key = `${name || 'Sprout'}Icon`
  const Icon = library[key] || library.SproutIcon
  // Existing emoji values remain readable until explicitly changed.
  if (name && !library[key] && /[^\x00-\x7F]/.test(name)) return <span className="habit-icon" style={{ color }}>{name}</span>
  return <span className="habit-icon" style={{ color }}><Icon size={18} strokeWidth={1.9} /></span>
}

export function HabitIconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [category, setCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const results = useMemo(() => {
    const selected = categories.find(item => item.id === category) || categories[0]
    const query = search.trim().toLowerCase()
    return available.filter(key => selected.id === 'all' || selected.pattern.test(key)).filter(key => !query || key.toLowerCase().includes(query))
  }, [category, search])
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const shown = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  return <div className="habit-icon-browser">
    <div className="habit-icon-browser-header"><span>选择图标</span><span className="habit-icon-browser-current"><HabitIcon name={value} /> 当前图标</span></div>
    <div className="habit-icon-browser-body">
      <nav className="habit-icon-categories" aria-label="图标分类">{categories.map(item => <Button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => { setCategory(item.id); setPage(0) }}>{item.label}</Button>)}</nav>
      <div className="habit-icon-browser-content">
        <input className="habit-icon-search" aria-label="搜索习惯图标" placeholder="可选：搜索图标名称" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        <div className="habit-icon-results">{shown.map(key => { const name = key.slice(0, -4); return <Button type="button" className="habit-icon-result" key={key} title={name} aria-label={name} aria-pressed={value===name} onClick={() => onChange(name)}><HabitIcon name={name} /></Button> })}</div>
        <div className="habit-icon-pagination"><span>{results.length ? `${results.length} 个图标` : '暂无匹配图标'}</span><div><Button type="button" disabled={page === 0} onClick={() => setPage(n => Math.max(0, n - 1))}>上一页</Button><span aria-live="polite">{page + 1} / {pages}</span><Button type="button" disabled={page >= pages - 1} onClick={() => setPage(n => Math.min(pages - 1, n + 1))}>下一页</Button></div></div>
      </div>
    </div>
  </div>
}
