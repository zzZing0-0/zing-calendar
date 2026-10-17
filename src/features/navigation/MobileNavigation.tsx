import type { MobileNavConfig, MobileNavChoice } from './navigationConfig'
export const mobileNavLabel = (id: 'calendar' | 'settings' | MobileNavChoice) => ({ calendar:'日历', notes:'笔记', anniversaries:'纪念日', statistics:'统计', settings:'设置' })[id]
export function mobileNavIcon(id: 'calendar' | 'settings' | MobileNavChoice) {
  const paths = {
    calendar: 'M7 3v3M17 3v3M4.5 8.5h15M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z',
    notes: 'M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Zm3 0V20M11 9h5M11 13h5',
    anniversaries: 'M6 10h12v10H6zM4 10h16M12 10v10M8.5 7.5c-1.8 0-3-1-3-2.3C5.5 4 6.4 3.4 7.4 3.4c1.7 0 3.2 2 4.6 4.1M15.5 7.5c1.8 0 3-1 3-2.3 0-1.2-.9-1.8-1.9-1.8-1.7 0-3.2 2-4.6 4.1',
    statistics: 'M5 20V11h3v9M10.5 20V5h3v15M16 20v-7h3v7M3.5 20.5h17',
    settings: 'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4',
  }
  return <svg className="bottom-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[id]}/></svg>
}

export type NavigationPage = 'calendar' | 'notes' | 'anniversaries' | 'statistics' | 'settings'
export function MobileNavigation({ config, active, onNavigate }: { config: MobileNavConfig; active: NavigationPage; onNavigate: (page: NavigationPage) => void }) {
  const pages: NavigationPage[] = ['calendar', ...config.middleItems, 'settings']
  return <nav className="bottom-nav" aria-label="主要功能">{pages.map(id =>
    <button key={id} type="button" className={active === id ? 'active' : ''} aria-label={mobileNavLabel(id)} onClick={() => onNavigate(id)}>
      {mobileNavIcon(id)}{mobileNavLabel(id)}
    </button>
  )}</nav>
}
export function DesktopNavigation({ active, onNavigate }: { active: NavigationPage; onNavigate: (page: NavigationPage) => void }) {
  const pages: NavigationPage[] = ['calendar', 'notes', 'anniversaries', 'statistics', 'settings']
  return <nav className="desktop-navigation" aria-label="主要功能">{pages.map(id =>
    <button key={id} type="button" className={active === id ? 'active' : ''} aria-label={mobileNavLabel(id)} onClick={() => onNavigate(id)}>{mobileNavLabel(id)}</button>
  )}</nav>
}
