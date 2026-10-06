import { test, expect } from '@playwright/test'
import {
  createEnvironmentOption, deleteEnvironmentOption, environmentByDate, environmentOptionNameTaken,
  environmentOptionUsed, moveEnvironmentOption, setEnvironmentChoice, setEnvironmentLocation, sortEnvironmentOptionsBuiltinsFirst, updateEnvironmentOption,
} from '../../src/domain/environment'
import type { DailyEnvironment, EnvironmentOption } from '../../src/types'

const AT = '2026-10-04T08:00:00.000Z'
const options: EnvironmentOption[] = [
  { id: 'weather:sunny', name: '晴', order: 0, builtin: true, updatedAt: AT },
  { id: 'weather:custom', name: '阵雨', order: 1, updatedAt: AT },
  { id: 'weather:old', name: '旧项', order: 2, deletedAt: AT, updatedAt: AT },
]

test.describe('environment domain regression', () => {
  test('weather and thermal choices preserve the other environment fields and remove an empty row', () => {
    const base: DailyEnvironment[] = [{ date: '2026-10-04', weatherOptionId: 'weather:sunny', thermalOptionId: 'thermal:cool', locationCity: '上海', updatedAt: AT }]
    const changed = setEnvironmentChoice(base, '2026-10-04', 'weather', 'weather:cloudy', AT)
    expect(changed[0]).toMatchObject({ weatherOptionId: 'weather:cloudy', thermalOptionId: 'thermal:cool', locationCity: '上海' })
    const onlyWeather: DailyEnvironment[] = [{ date: '2026-10-05', weatherOptionId: 'weather:sunny', updatedAt: AT }]
    expect(setEnvironmentChoice(onlyWeather, '2026-10-05', 'weather', '', AT)).toEqual([])
  })

  test('location normalization trims values, preserves choices, and removes a truly empty row', () => {
    const base: DailyEnvironment[] = [{ date: '2026-10-04', weatherOptionId: 'weather:sunny', updatedAt: AT }]
    expect(setEnvironmentLocation(base, '2026-10-04', ' 上海 ', ' 中国 ', AT)[0]).toMatchObject({ locationCity: '上海', locationCountry: '中国', weatherOptionId: 'weather:sunny' })
    expect(setEnvironmentLocation([{ date: '2026-10-05', locationCity: '东京', updatedAt: AT }], '2026-10-05', '   ', undefined, AT)).toEqual([])
  })

  test('date lookup and option usage keep weather and thermal ids distinct', () => {
    const rows: DailyEnvironment[] = [{ date: '2026-10-04', weatherOptionId: 'same', updatedAt: AT }]
    expect(environmentByDate(rows).get('2026-10-04')).toEqual(rows[0])
    expect(environmentOptionUsed(rows, 'weather', 'same')).toBe(true)
    expect(environmentOptionUsed(rows, 'thermal', 'same')).toBe(false)
  })

  test('option naming ignores deleted rows and can exclude the option being renamed', () => {
    expect(environmentOptionNameTaken(options, '晴')).toBe(true)
    expect(environmentOptionNameTaken(options, '晴', 'weather:sunny')).toBe(false)
    expect(environmentOptionNameTaken(options, '旧项')).toBe(false)
  })

  test('custom option creation appends after active order while edits and deletion preserve other rows', () => {
    const created = createEnvironmentOption(options, 'weather', 'uuid', '雷阵雨', '⛈️', AT)
    expect(created.at(-1)).toMatchObject({ id: 'weather:uuid', name: '雷阵雨', emoji: '⛈️', order: 2 })
    const renamed = updateEnvironmentOption(created, 'weather:custom', { name: '小阵雨', archived: true }, 'later')
    expect(renamed.find(row => row.id === 'weather:custom')).toMatchObject({ name: '小阵雨', archived: true, updatedAt: 'later' })
    const deleted = deleteEnvironmentOption(renamed, 'weather:custom', 'deleted')
    expect(deleted.find(row => row.id === 'weather:custom')).toMatchObject({ deletedAt: 'deleted', updatedAt: 'deleted' })
    expect(deleted.find(row => row.id === 'weather:sunny')?.deletedAt).toBeUndefined()
  })

  test('custom options stay after built-ins and can reorder only within the custom block', () => {
    const rows: EnvironmentOption[] = [
      { id: 'weather:sunny', name: '晴', order: 10, builtin: true, updatedAt: AT },
      { id: 'weather:custom-a', name: '自定义A', order: 0, updatedAt: AT },
      { id: 'weather:custom-b', name: '自定义B', order: 1, updatedAt: AT },
    ]
    expect(sortEnvironmentOptionsBuiltinsFirst(rows).map(row=>row.id)).toEqual(['weather:sunny','weather:custom-a','weather:custom-b'])
    expect(moveEnvironmentOption(rows, 'weather:custom-a', -1, AT)).toEqual(rows)
    const moved = moveEnvironmentOption(rows, 'weather:custom-b', -1, 'moved')
    expect(sortEnvironmentOptionsBuiltinsFirst(moved).map(row=>row.id)).toEqual(['weather:sunny','weather:custom-b','weather:custom-a'])
    expect(moveEnvironmentOption(rows, 'weather:sunny', 1, AT)).toEqual(rows)
  })
})
