import { expect, test } from '@playwright/test'
import { calculateMenstrualPrediction, menstrualVisualForDate, patchPeriodDayLog, periodForDate } from '../../src/domain/menstrual'
import type { MenstrualPeriod } from '../../src/types'

function period(id: string, startDate: string, endDate?: string): MenstrualPeriod {
  return { id, startDate, endDate, dayLogs: [], createdAt: `${startDate}T00:00:00Z`, updatedAt: `${startDate}T00:00:00Z` }
}

test.describe('menstrual domain regression', () => {
  test('prediction requires enough plausible cycles and averages recent cycle lengths', () => {
    expect(calculateMenstrualPrediction([period('a', '2026-07-01'), period('b', '2026-07-29')])).toBeNull()
    const prediction = calculateMenstrualPrediction([
      period('a', '2026-07-01', '2026-07-05'),
      period('b', '2026-07-29', '2026-08-02'),
      period('c', '2026-08-27', '2026-08-31'),
    ])
    expect(prediction).toEqual({
      start: '2026-09-25', end: '2026-09-29', windowStart: '2026-09-24', windowEnd: '2026-09-26', averageCycle: 29,
    })
  })

  test('implausible cycle intervals are ignored and prediction stays unavailable without two valid intervals', () => {
    expect(calculateMenstrualPrediction([
      period('a', '2026-01-01'), period('b', '2026-01-05'), period('c', '2026-02-02'),
    ])).toBeNull()
  })

  test('actual period dates take precedence over the predicted window', () => {
    const periods = [period('actual', '2026-09-23', '2026-09-25')]
    const prediction = { start: '2026-09-24', end: '2026-09-28', windowStart: '2026-09-23', windowEnd: '2026-09-25', averageCycle: 28 }
    expect(menstrualVisualForDate('2026-09-24', periods, prediction)).toBe('actual')
    expect(menstrualVisualForDate('2026-09-25', [], prediction)).toBe('predicted')
    expect(menstrualVisualForDate('2026-09-26', [], prediction)).toBe('')
  })

  test('unfinished periods cover through today but not future dates', () => {
    const rows = [period('open', '2026-10-01')]
    expect(periodForDate(rows, '2026-10-04', '2026-10-04')?.id).toBe('open')
    expect(periodForDate(rows, '2026-10-05', '2026-10-04')).toBeUndefined()
  })

  test('day-log patches replace the same date without disturbing other logs', () => {
    const row: MenstrualPeriod = {
      ...period('a', '2026-10-01'),
      dayLogs: [{ date: '2026-10-01', flow: 'light' }, { date: '2026-10-02' }],
    }
    const next = patchPeriodDayLog(row, '2026-10-01', { flow: 'heavy' })
    expect(next.dayLogs).toHaveLength(2)
    expect(next.dayLogs.find(log => log.date === '2026-10-01')?.flow).toBe('heavy')
    expect(next.dayLogs.find(log => log.date === '2026-10-02')).toBeTruthy()
  })
})
