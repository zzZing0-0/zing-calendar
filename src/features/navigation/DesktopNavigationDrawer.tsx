import { mobileNavIcon, mobileNavLabel } from './MobileNavigation'
import type { NavigationPage } from './MobileNavigation'

const pages: NavigationPage[] = ['calendar', 'notes', 'anniversaries', 'statistics', 'settings']

/** Desktop navigation shares the same SVG icon set as mobile. */
export function DesktopNavigationDrawer({ active, onNavigate, collapsed }: {
  active: NavigationPage
  onNavigate: (page: NavigationPage) => void
  collapsed: boolean
}) {
  return <nav className="desktop-navigation-sidebar" aria-label="电脑端导航">
    {pages.map(id => <button key={id} type="button" aria-label={mobileNavLabel(id)}
      title={collapsed ? mobileNavLabel(id) : undefined}
      aria-current={active === id ? 'page' : undefined}
      className={`${active === id ? 'active ' : ''}${id === 'settings' ? 'sidebar-settings' : ''}`}
      onClick={() => onNavigate(id)}>
      {mobileNavIcon(id)}<span className="sidebar-nav-label">{mobileNavLabel(id)}</span>
    </button>)}
  </nav>
}
