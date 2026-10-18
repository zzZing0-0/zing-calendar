/** Never erase the reviewed list on an ambiguous or malformed delete response. */
export function b2CleanupResult(payload: any, reviewedKeys: string[]) {
  const reviewed = new Set(reviewedKeys)
  const seen = new Set<string>()
  const groups = ['deletedKeys','missingKeys','skippedKeys','failures'] as const
  for (const field of groups) {
    if (!Array.isArray(payload?.[field])) throw new Error('清理结果不完整，请重新扫描确认')
    for (const value of payload[field]) {
      const key = field === 'failures' ? value?.key : value
      if (typeof key !== 'string' || !reviewed.has(key) || seen.has(key)) throw new Error('清理结果异常，请重新扫描确认')
      seen.add(key)
    }
  }
  if (seen.size !== reviewed.size || payload.deleted !== payload.deletedKeys.length || payload.skipped !== payload.skippedKeys.length) throw new Error('清理结果不完整，请重新扫描确认')
  const remaining = new Set<string>([...payload.skippedKeys, ...payload.failures.map((row: {key:string}) => row.key)])
  return { remaining, message: `已清除 ${payload.deletedKeys.length} 个 · 失败 ${payload.failures.length} 个 · 引用保护跳过 ${payload.skippedKeys.length} 个 · 已不存在 ${payload.missingKeys.length} 个 · 剩余 ${remaining.size} 个` }
}
