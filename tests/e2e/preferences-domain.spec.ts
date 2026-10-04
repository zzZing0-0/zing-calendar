import { expect, test } from '@playwright/test'
import type { EnvironmentOption, Tag } from '../../src/types'
import {
  DEFAULT_TAG_ID,
  DEFAULT_THERMAL_OPTIONS,
  DEFAULT_WEATHER_OPTIONS,
  REQUIRED_SYSTEM_TAGS,
  ensureRequiredSystemTags,
  isImportSourceTag,
  isImportSourceTagId,
  normalizeEnvironmentOptions,
} from '../../src/domain/preferences'

test.describe('preferences domain regression', () => {
  test('environment defaults keep their stable built-in identities and ordering', () => {
    expect(DEFAULT_WEATHER_OPTIONS[0]).toMatchObject({ id: 'weather:sunny', name: '晴', emoji: '☀️', order: 0, builtin: true })
    expect(DEFAULT_THERMAL_OPTIONS[0]).toMatchObject({ id: 'thermal:cold', name: '寒冷', emoji: '🥶', order: 0, builtin: true })
    expect(new Set(DEFAULT_WEATHER_OPTIONS.map(item => item.id)).size).toBe(DEFAULT_WEATHER_OPTIONS.length)
    expect(new Set(DEFAULT_THERMAL_OPTIONS.map(item => item.id)).size).toBe(DEFAULT_THERMAL_OPTIONS.length)
  })

  test('environment normalization heals built-ins while preserving custom options', () => {
    const custom: EnvironmentOption = { id:'weather:custom', name:'自定义', emoji:'✨', order:99, builtin:false, updatedAt:'2026-10-04T00:00:00.000Z' }
    const rows: EnvironmentOption[] = [
      { ...DEFAULT_WEATHER_OPTIONS[0], name:'被改名', emoji:'X', archived:true, deletedAt:'2026-10-04T00:00:00.000Z' },
      custom,
    ]
    const normalized=normalizeEnvironmentOptions(rows,DEFAULT_WEATHER_OPTIONS)
    expect(normalized[0]).toMatchObject({ id:'weather:sunny', name:'晴', emoji:'☀️', builtin:true, archived:false })
    expect(normalized[0].deletedAt).toBeUndefined()
    expect(normalized.at(-1)).toMatchObject({ id:'weather:custom', name:'自定义', emoji:'✨', builtin:false })
    expect(normalized.map(item=>item.order)).toEqual(normalized.map((_,index)=>index))
  })

  test('required system tags are restored without duplicating existing tags', () => {
    const userTag: Tag = { id:'user:english', name:'英语', color:'#123456', scope:'both', updatedAt:'2026-10-04T00:00:00.000Z' }
    const rows=ensureRequiredSystemTags([REQUIRED_SYSTEM_TAGS[0],userTag])
    expect(rows.filter(tag=>tag.id===DEFAULT_TAG_ID)).toHaveLength(1)
    for(const required of REQUIRED_SYSTEM_TAGS) expect(rows.some(tag=>tag.id===required.id)).toBeTruthy()
    expect(rows.some(tag=>tag.id===userTag.id)).toBeTruthy()
  })

  test('import-source tag detection accepts both managed ids and system metadata', () => {
    expect(isImportSourceTagId('system-import-source:forest')).toBeTruthy()
    expect(isImportSourceTagId('user:forest')).toBeFalsy()
    expect(isImportSourceTag({ id:'legacy-source', name:'来源', color:'#000', scope:'task', systemKind:'import-source', updatedAt:'2026-10-04T00:00:00.000Z' })).toBeTruthy()
  })
})
