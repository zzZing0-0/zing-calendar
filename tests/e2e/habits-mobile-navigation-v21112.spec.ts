import { expect, test } from '@playwright/test'
import { BUILTIN_MOBILE_NAV, missingMobileNav, normalizeMobileNav, selectMobileNav } from '../../src/features/navigation/navigationConfig'
import { initialMobileNavigation, loadLocalNavigation, saveLocalNavigation } from '../../src/features/navigation/navigationStorage'
import { readApplicationSource } from '../helpers/applicationSource'

test('fresh installation defaults to calendar, notes, habits, settings', () => {
  expect(BUILTIN_MOBILE_NAV).toEqual({ itemCount: 4, middleItems: ['notes', 'habits'], hiddenItems: ['anniversaries', 'statistics'] })
  expect(['calendar', ...BUILTIN_MOBILE_NAV.middleItems, 'settings']).toEqual(['calendar', 'notes', 'habits', 'settings'])
})

test('custom layout stays intact and hidden destinations remain discoverable', () => {
  const custom = normalizeMobileNav({ itemCount: 4, middleItems: ['notes', 'anniversaries'] })
  expect(custom.middleItems).toEqual(['notes', 'anniversaries'])
  expect(missingMobileNav(custom)).toEqual(['habits', 'statistics'])
  expect(selectMobileNav(custom, 1, 'habits').middleItems).toEqual(['notes', 'habits'])
  expect(missingMobileNav(BUILTIN_MOBILE_NAV)).toEqual(['anniversaries', 'statistics'])
})

test('saved user navigation takes priority over code default', () => {
  const storage = new Map<string, string>()
  const previous = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
  } })
  try {
    expect(initialMobileNavigation()).toEqual(BUILTIN_MOBILE_NAV)
    const custom = normalizeMobileNav({ itemCount: 5, middleItems: ['statistics', 'notes', 'anniversaries'] })
    saveLocalNavigation(custom)
    expect(loadLocalNavigation()).toEqual(custom)
    expect(initialMobileNavigation()).toEqual(custom)
  } finally {
    if (previous === undefined) delete (globalThis as {localStorage?: Storage}).localStorage
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous })
  }
})

// Regression: Settings shortcuts use the same label helper as the mobile navigation.
test('settings shortcut labels are imported from the shared navigation component', () => {
  const app = readApplicationSource()
  expect(app).toContain("from '../navigation/MobileNavigation'")
})

test('replacing the habits slot exposes habits as a missing destination', () => {
  const changed = selectMobileNav(BUILTIN_MOBILE_NAV, 1, 'statistics')
  expect(changed.middleItems).toEqual(['notes', 'statistics'])
  expect(missingMobileNav(changed)).toContain('habits')
})
