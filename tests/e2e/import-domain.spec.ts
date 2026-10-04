import { expect, test } from '@playwright/test'
import {
  cleanDidaContent,
  didaIso,
  forestDate,
  genericDate,
  genericHeaderIndex,
  parseCsvRows,
  parseDidaRecurrence,
  splitImportedTagNames,
  stableImportHash,
  zonedParts,
} from '../../src/domain/import'

test.describe('import domain regression', () => {
  test('CSV parser preserves quoted commas, escaped quotes, CRLF, and embedded newlines', () => {
    expect(parseCsvRows('name,note\r\n"A, B","say ""hi"""\r\nC,"line1\nline2"')).toEqual([
      ['name', 'note'],
      ['A, B', 'say "hi"'],
      ['C', 'line1\nline2'],
    ])
  })

  test('generic date and header helpers keep supported import normalization', () => {
    expect(genericDate('2026/10/4 08:30')).toBe('2026-10-04')
    expect(genericDate('')).toBe('')
    expect(genericHeaderIndex(['Task Name', 'Start_Date'], ['taskname'])).toBe(0)
    expect(genericHeaderIndex(['Task Name', 'Start_Date'], ['start date'])).toBe(1)
    expect(splitImportedTagNames('英语, 科研;生活\n记录')).toEqual(['英语', '科研', '生活', '记录'])
  })

  test('Dida helpers normalize timezone offsets and remove attachment markdown only', () => {
    expect(didaIso('2026-10-04T12:30:00+0800')).toBe('2026-10-04T12:30:00+08:00')
    expect(zonedParts('2026-10-04T12:30:00+0800', 'Asia/Shanghai')).toEqual({ date: '2026-10-04', time: '12:30' })
    expect(cleanDidaContent('正文\n![image](https://example.com/a.png)\n下一行')).toEqual({ text: '正文\n\n下一行', removed: 1 })
  })

  test('Dida recurrence parser preserves interval, weekdays, count, and until semantics', () => {
    expect(parseDidaRecurrence('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5')).toEqual({
      unit: 'week', interval: 2, weekdays: [1, 3], end: { type: 'count', count: 5 },
    })
    expect(parseDidaRecurrence('FREQ=MONTHLY;UNTIL=20261231')).toEqual({
      unit: 'month', interval: 1, end: { type: 'date', date: '2026-12-31' },
    })
    expect(parseDidaRecurrence('FREQ=DAILY;COUNT=1')).toBeUndefined()
    expect(parseDidaRecurrence('FREQ=HOURLY')).toBeUndefined()
  })

  test('Forest date and stable import hash remain deterministic', () => {
    expect(forestDate('not-a-date')).toBeNull()
    expect(forestDate('2026-10-04T12:30:00+0800')?.toISOString()).toBe('2026-10-04T04:30:00.000Z')
    expect(stableImportHash('same input')).toBe(stableImportHash('same input'))
    expect(stableImportHash('same input')).not.toBe(stableImportHash('different input'))
  })
})
