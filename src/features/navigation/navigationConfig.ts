/** Navigation layout is device-local; only an explicitly saved default is synced. */
export const MOBILE_NAV_CHOICES = ['notes', 'habits', 'anniversaries', 'statistics'] as const
export type MobileNavChoice = typeof MOBILE_NAV_CHOICES[number]
export type MobileNavConfig = { itemCount: 4 | 5; middleItems: MobileNavChoice[]; hiddenItems?: MobileNavChoice[] }
export const BUILTIN_MOBILE_NAV: MobileNavConfig = { itemCount: 4, middleItems: ['notes', 'habits'], hiddenItems: ['anniversaries', 'statistics'] }

export function normalizeMobileNav(value: unknown): MobileNavConfig {
  const candidate = value && typeof value === 'object' ? value as Partial<MobileNavConfig> : {}
  const valid = new Set<string>(MOBILE_NAV_CHOICES)
  const clean = (items: unknown): MobileNavChoice[] => Array.isArray(items)
    ? [...new Set(items.filter((id): id is MobileNavChoice => typeof id === 'string' && valid.has(id)))] : []
  const itemCount = candidate.itemCount === 4 ? 4 : 5
  const selected = clean(candidate.middleItems).slice(0, 3)
  const middleItems = [...selected, ...MOBILE_NAV_CHOICES.filter(id => !selected.includes(id))].slice(0, itemCount - 2)
  const hidden = clean(candidate.hiddenItems).filter(id => !middleItems.includes(id))
  const hiddenItems = [...hidden, ...MOBILE_NAV_CHOICES.filter(id => !middleItems.includes(id) && !hidden.includes(id))]
  return { itemCount, middleItems, hiddenItems }
}

/** Reorder or transfer a movable destination, keeping calendar first and settings last. */
export function moveMobileNav(config: MobileNavConfig, id: MobileNavChoice, destination: 'shown' | 'hidden', index: number): MobileNavConfig {
  const current = normalizeMobileNav(config)
  if (!MOBILE_NAV_CHOICES.includes(id)) return current
  const shown = current.middleItems.filter(item => item !== id)
  const hidden = (current.hiddenItems ?? []).filter(item => item !== id)
  if (destination === 'shown') {
    if (shown.length >= 3) return current
    shown.splice(Math.max(0, Math.min(index, shown.length)), 0, id)
  } else {
    if (shown.length < 2 && current.middleItems.includes(id)) return current
    hidden.splice(Math.max(0, Math.min(index, hidden.length)), 0, id)
  }
  return normalizeMobileNav({ itemCount: shown.length + 2 as 4 | 5, middleItems: shown, hiddenItems: hidden })
}

// Compatibility for older navigation consumers/tests.
export function resizeMobileNav(config: MobileNavConfig, itemCount: 4 | 5): MobileNavConfig {
  const current = normalizeMobileNav(config)
  if (itemCount === current.itemCount) return current
  if (itemCount === 4) return moveMobileNav(current, current.middleItems[2], 'hidden', 0)
  return moveMobileNav(current, (current.hiddenItems ?? [])[0], 'shown', current.middleItems.length)
}
export function selectMobileNav(config: MobileNavConfig, index: number, choice: MobileNavChoice): MobileNavConfig {
  const current = normalizeMobileNav(config)
  if (index < 0 || index >= current.middleItems.length || !MOBILE_NAV_CHOICES.includes(choice)) return current
  const shown = [...current.middleItems]
  const old = shown[index]
  const other = shown.indexOf(choice)
  if (other !== -1) shown[other] = old
  shown[index] = choice
  const hidden = (current.hiddenItems ?? []).filter(id => id !== choice)
  if (other === -1) hidden.splice(index, 0, old)
  return normalizeMobileNav({ itemCount: current.itemCount, middleItems: shown, hiddenItems: hidden })
}
export function missingMobileNav(config: MobileNavConfig): MobileNavChoice[] {
  return normalizeMobileNav(config).hiddenItems ?? []
}
