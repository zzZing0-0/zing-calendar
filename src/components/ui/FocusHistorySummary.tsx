/** Shared presentation for task and note focus-history totals. */
export interface FocusHistorySummaryProps {
  duration: string
  count: number
}

export function FocusHistorySummary({ duration, count }: FocusHistorySummaryProps) {
  return <div className="focus-history-summary"><strong>{duration}</strong><span>{count} 条记录</span></div>
}
