import { MOBILE_NAV_CHOICES, resizeMobileNav, selectMobileNav } from './navigationConfig'
import type { MobileNavConfig, MobileNavChoice } from './navigationConfig'
import { mobileNavLabel } from './MobileNavigation'

export function MobileNavigationSettings({ config, onChange, onSaveDefault, onRestoreDefault, onClose, status }: {
  config: MobileNavConfig
  onChange: (next: MobileNavConfig) => void
  onSaveDefault: () => void
  onRestoreDefault: () => void
  onClose: () => void
  status: string
}) {
  return <div className="mobile-nav-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="导航栏设置">
      <header><h3>导航栏设置</h3><button type="button" onClick={onClose} aria-label="关闭导航栏设置">×</button></header>
      <div className="mobile-nav-setting-line"><strong>数量</strong><div className="setting-segment">
        <button type="button" className={config.itemCount === 4 ? 'active' : ''} onClick={() => onChange(resizeMobileNav(config, 4))}>4项</button>
        <button type="button" className={config.itemCount === 5 ? 'active' : ''} onClick={() => onChange(resizeMobileNav(config, 5))}>5项</button>
      </div></div>
      <div className="mobile-nav-editor">
        <div><span>位置 1</span><strong>日历</strong></div>
        {config.middleItems.map((id, index) => <label key={index}><span>位置 {index + 2}</span>
          <select aria-label={`导航位置 ${index + 2}`} value={id} onChange={event => onChange(selectMobileNav(config, index, event.target.value as MobileNavChoice))}>
            {MOBILE_NAV_CHOICES.map(choice => <option key={choice} value={choice}>{mobileNavLabel(choice)}</option>)}
          </select></label>)}
        <div><span>位置 {config.itemCount}</span><strong>设置</strong></div>
      </div>
      <button className="mobile-nav-default-action" type="button" onClick={onSaveDefault}>将当前导航设置为默认</button>
      <button className="mobile-nav-restore-action" type="button" onClick={onRestoreDefault}>恢复默认导航</button>
      {status && <p role="status">{status}</p>}
    </section>
  </div>
}
