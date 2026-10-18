import { useState } from 'react'
import type { MobileNavConfig } from './navigationConfig'
import { normalizeMobileNav } from './navigationConfig'
import { initialMobileNavigation, initializeFromSyncedDefault, loadDefaultNavigation, saveDefaultNavigation, saveLocalNavigation } from './navigationStorage'

export function useMobileNavigationPreferences() {
  const [mobileNav, setMobileNav] = useState<MobileNavConfig>(initialMobileNavigation)
  const [mobileNavConfigured, setMobileNavConfigured] = useState(() => localStorage.getItem('zing:mobileNavigation') !== null)
  const [syncedDefaultMobileNav, setSyncedDefaultMobileNav] = useState<MobileNavConfig | undefined>(loadDefaultNavigation)
  const [mobileNavSettingsOpen, setMobileNavSettingsOpen] = useState(false)
  const [mobileNavToast, setMobileNavToast] = useState('')
  const updateMobileNav = (value: MobileNavConfig) => { setMobileNavConfigured(true); setMobileNav(value); saveLocalNavigation(value); setMobileNavToast('') }
  const receiveDefaultMobileNav = (value: MobileNavConfig) => {
    const saved = normalizeMobileNav(value)
    setSyncedDefaultMobileNav(saved)
    saveDefaultNavigation(saved)
    const initialized = initializeFromSyncedDefault(saved)
    if (initialized) { setMobileNav(initialized); setMobileNavConfigured(true) }
  }

  return { mobileNav, mobileNavConfigured, mobileNavSettingsOpen, mobileNavToast, receiveDefaultMobileNav, setMobileNavSettingsOpen, setMobileNavToast, setSyncedDefaultMobileNav, syncedDefaultMobileNav, updateMobileNav }
}
