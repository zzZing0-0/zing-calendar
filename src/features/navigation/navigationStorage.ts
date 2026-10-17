import { BUILTIN_MOBILE_NAV, normalizeMobileNav } from './navigationConfig'
import type { MobileNavConfig } from './navigationConfig'

const LOCAL_KEY = 'zing:mobileNavigation'
export const DEFAULT_KEY = 'zing:defaultMobileNavigation'

export function loadLocalNavigation(): MobileNavConfig | null {
  try { const raw = localStorage.getItem(LOCAL_KEY); return raw === null ? null : normalizeMobileNav(JSON.parse(raw)) } catch { return null }
}
export function saveLocalNavigation(value: MobileNavConfig): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizeMobileNav(value)))
}
export function loadDefaultNavigation(): MobileNavConfig | undefined {
  try { const raw = localStorage.getItem(DEFAULT_KEY); return raw === null ? undefined : normalizeMobileNav(JSON.parse(raw)) } catch { return undefined }
}
export function saveDefaultNavigation(value: MobileNavConfig): void {
  localStorage.setItem(DEFAULT_KEY, JSON.stringify(normalizeMobileNav(value)))
}
/** A cloud default initializes only an untouched browser; never override a local choice. */
export function initializeFromSyncedDefault(value: MobileNavConfig): MobileNavConfig | null {
  if (localStorage.getItem(LOCAL_KEY) !== null) return null
  const config = normalizeMobileNav(value)
  saveLocalNavigation(config)
  return config
}
export function initialMobileNavigation(): MobileNavConfig {
  return loadLocalNavigation() ?? loadDefaultNavigation() ?? BUILTIN_MOBILE_NAV
}
