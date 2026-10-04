import { expect, test } from '@playwright/test'
import type { Anniversary } from '../../src/types'
import {
  ANNIVERSARY_TYPES,
  anniversaryDistanceLabel,
  anniversaryIcon,
  anniversaryMeta,
  anniversaryOccurrence,
  buildAnniversaryPageRows,
  calendarFestival,
  chineseLunarDayName,
  daysInMonth,
  emptyAnniversaryDraft,
  isoWeekNumber,
  lunarMonthNumber,
  nthWeekdayOfMonth,
} from '../../src/domain/calendar'

function solarAnniversary(patch: Partial<Anniversary> = {}): Anniversary {
  return {
    id: 'ann:test',
    title: '测试纪念日',
    type: 'anniversary',
    calendar: 'solar',
    year: 2024,
    month: 2,
    day: 29,
    isLeapMonth: false,
    repeatYearly: true,
    notes: '',
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-04T00:00:00.000Z',
    ...patch,
  }
}

test.describe('calendar domain regression', () => {
  test('anniversary types and empty draft keep stable defaults', () => {
    expect(ANNIVERSARY_TYPES.map(item => item.value)).toEqual(['birthday', 'anniversary', 'important', 'other'])
    expect(anniversaryIcon('birthday')).toBe('🎂')
    expect(emptyAnniversaryDraft(new Date(2026, 9, 4))).toMatchObject({
      title: '', type: 'birthday', calendar: 'solar', year: '2026', month: 10, day: 4, isLeapMonth: false, repeatYearly: true,
    })
  })

  test('date helpers preserve month length, ISO week, and nth weekday semantics', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2025, 2)).toBe(28)
    expect(isoWeekNumber(new Date(2026, 0, 1))).toBe(1)
    expect(nthWeekdayOfMonth(new Date(2026, 4, 10), 0, 2)).toBeTruthy()
    expect(nthWeekdayOfMonth(new Date(2026, 4, 17), 0, 2)).toBeFalsy()
  })

  test('solar anniversary recurrence respects origin year and invalid dates', () => {
    const recurring = solarAnniversary()
    expect(anniversaryOccurrence(recurring, 2023)).toBeNull()
    expect(anniversaryOccurrence(recurring, 2024)).toEqual(new Date(2024, 1, 29))
    expect(anniversaryOccurrence(recurring, 2025)).toBeNull()
    expect(anniversaryOccurrence({ ...recurring, month: 10, day: 4 }, 2026)).toEqual(new Date(2026, 9, 4))
  })

  test('non-recurring solar anniversary exists only in its stored year', () => {
    const once = solarAnniversary({ repeatYearly: false, month: 10, day: 4, year: 2026 })
    expect(anniversaryOccurrence(once, 2025)).toBeNull()
    expect(anniversaryOccurrence(once, 2026)).toEqual(new Date(2026, 9, 4))
    expect(anniversaryOccurrence(once, 2027)).toBeNull()
  })

  test('anniversary metadata keeps birthday age and anniversary year-count rules', () => {
    expect(anniversaryMeta(solarAnniversary({ type: 'birthday', year: 2000 }), new Date(2026, 9, 4))).toBe('26岁')
    expect(anniversaryMeta(solarAnniversary({ type: 'anniversary', year: 2020 }), new Date(2026, 9, 4))).toBe('6周年')
    expect(anniversaryMeta(solarAnniversary({ type: 'anniversary', year: undefined }), new Date(2026, 9, 4))).toBe('')
  })

  test('lunar labels and fixed festival classification remain stable', () => {
    expect(chineseLunarDayName(1)).toBe('初一')
    expect(chineseLunarDayName(30)).toBe('三十')
    expect(chineseLunarDayName(31)).toBe('')
    expect(lunarMonthNumber('闰六月')).toBe(6)
    expect(lunarMonthNumber('腊月')).toBe(12)
    expect(calendarFestival(new Date(2026, 0, 1))).toEqual({ label: '元旦', kind: 'statutory' })
    expect(calendarFestival(new Date(2026, 1, 14))).toEqual({ label: '情人节', kind: 'international' })
  })

  test('anniversary page rows keep upcoming items first and sink past one-off dates newest-first', () => {
    const today = new Date(2026, 9, 4)
    const rows = buildAnniversaryPageRows([
      solarAnniversary({ id:'past-old', repeatYearly:false, year:2026, month:8, day:1 }),
      solarAnniversary({ id:'future-one', repeatYearly:false, year:2026, month:10, day:8 }),
      solarAnniversary({ id:'yearly', year:2020, month:10, day:6 }),
      solarAnniversary({ id:'past-new', repeatYearly:false, year:2026, month:9, day:30 }),
    ], today)
    expect(rows.map(row => row.anniversary.id)).toEqual(['yearly','future-one','past-new','past-old'])
    expect(rows[0].occurrence).toEqual(new Date(2026, 9, 6))
  })

  test('anniversary page rows roll yearly dates forward but keep one-off dates in their stored year', () => {
    const today = new Date(2026, 9, 10)
    const yearly = solarAnniversary({ id:'yearly', year:2020, month:10, day:4 })
    const once = solarAnniversary({ id:'once', repeatYearly:false, year:2026, month:10, day:4 })
    const rows = buildAnniversaryPageRows([yearly, once], today)
    expect(rows.find(row => row.anniversary.id === 'yearly')?.occurrence).toEqual(new Date(2027, 9, 4))
    expect(rows.find(row => row.anniversary.id === 'once')?.occurrence).toEqual(new Date(2026, 9, 4))
  })

  test('anniversary distance labels distinguish today, upcoming, and passed one-off dates', () => {
    const today = new Date(2026, 9, 4)
    const yearly = solarAnniversary({ repeatYearly:true, month:10, day:8 })
    const once = solarAnniversary({ repeatYearly:false, year:2026, month:10, day:1 })
    expect(anniversaryDistanceLabel(yearly, new Date(2026, 9, 4), today)).toBe('今天')
    expect(anniversaryDistanceLabel(yearly, new Date(2026, 9, 8), today)).toBe('还有 4 天')
    expect(anniversaryDistanceLabel(once, new Date(2026, 9, 1), today)).toBe('过去 3 天')
    expect(anniversaryDistanceLabel(once, null, today)).toBe('')
  })

})
