import { expect, test } from '@playwright/test'
import { DEFAULT_EMOTION_OPTIONS, createEmotionOption, emotionGroupOrder, normalizeEmotionOptions, sanitizeEmotionIds, toggleEmotionId, updateEmotionOption } from '../../src/domain/emotions'

test.describe('record emotion domain', () => {
  test('ships a rich grouped built-in vocabulary including the chosen disgust label', () => {
    expect(DEFAULT_EMOTION_OPTIONS.length).toBeGreaterThanOrEqual(30)
    expect(DEFAULT_EMOTION_OPTIONS.some(item=>item.name==='厌恶'&&item.group==='negative')).toBe(true)
    expect(DEFAULT_EMOTION_OPTIONS.some(item=>item.name==='归属感'&&item.group==='positive')).toBe(true)
  })
  test('score only changes recommendation order and never constrains groups', () => {
    expect(emotionGroupOrder(-2)).toEqual(['negative','neutral','positive'])
    expect(emotionGroupOrder(0)).toEqual(['neutral','positive','negative'])
    expect(emotionGroupOrder(2)).toEqual(['positive','neutral','negative'])
  })
  test('a record can select at most three emotions and can deselect one', () => {
    let ids:string[]=[]; for(const id of ['a','b','c','d']) ids=toggleEmotionId(ids,id)
    expect(ids).toEqual(['a','b','c'])
    expect(toggleEmotionId(ids,'b')).toEqual(['a','c'])
  })
  test('custom emotions can be grouped, renamed, archived and normalized with built-ins', () => {
    const at='2026-10-06T12:00:00Z'
    let rows=createEmotionOption(normalizeEmotionOptions(undefined),'custom','破防','negative',at)
    rows=updateEmotionOption(rows,'custom',{name:'心碎',group:'neutral',archived:true},at)
    expect(rows.find(x=>x.id==='custom')).toMatchObject({name:'心碎',group:'neutral',archived:true})
    expect(normalizeEmotionOptions(rows).some(x=>x.id==='custom')).toBe(true)
  })
  test('journal emotion ids are deduplicated, validated, and capped at three', () => {
    const options=normalizeEmotionOptions(undefined); const ids=options.slice(0,4).map(x=>x.id)
    expect(sanitizeEmotionIds([ids[0],ids[0],ids[1],ids[2],ids[3],'missing'],options)).toEqual(ids.slice(0,3))
  })
})
