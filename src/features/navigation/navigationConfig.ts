/** Navigation is a device-local preference; only the explicitly saved template syncs. */
export const MOBILE_NAV_CHOICES = ['notes', 'habits', 'anniversaries', 'statistics'] as const
export type MobileNavChoice = typeof MOBILE_NAV_CHOICES[number]
export type MobileNavConfig = { itemCount: 4 | 5; middleItems: MobileNavChoice[] }
export const BUILTIN_MOBILE_NAV: MobileNavConfig = { itemCount: 5, middleItems: ['notes', 'anniversaries', 'statistics'] }

export function normalizeMobileNav(value: unknown): MobileNavConfig {
  const candidate = value && typeof value === 'object' ? value as Partial<MobileNavConfig> : {}
  const itemCount = candidate.itemCount === 4 ? 4 : 5
  const valid = new Set<string>(MOBILE_NAV_CHOICES)
  const selected = Array.isArray(candidate.middleItems)
    ? candidate.middleItems.filter((id): id is MobileNavChoice => typeof id === 'string' && valid.has(id))
    : []
  const unique = [...new Set(selected)]
  const middleItems = [...unique, ...MOBILE_NAV_CHOICES.filter(id => !unique.includes(id))].slice(0, itemCount - 2)
  return { itemCount, middleItems }
}

export function resizeMobileNav(config: MobileNavConfig, itemCount: 4 | 5): MobileNavConfig {
  return normalizeMobileNav({ itemCount, middleItems: config.middleItems })
}

export function selectMobileNav(config: MobileNavConfig, index: number, choice: MobileNavChoice): MobileNavConfig {
  if (index < 0 || index >= config.middleItems.length || !MOBILE_NAV_CHOICES.includes(choice)) return config
  const middleItems = [...config.middleItems]
  const other = middleItems.indexOf(choice)
  if (other !== -1) middleItems[other] = middleItems[index]
  middleItems[index] = choice
  return normalizeMobileNav({ itemCount: config.itemCount, middleItems })
}

export function missingMobileNav(config: MobileNavConfig): MobileNavChoice[] {
  return MOBILE_NAV_CHOICES.filter(id => !config.middleItems.includes(id))
}
