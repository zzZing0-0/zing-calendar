import type { TaskDraft } from '../../types'

export function recurrenceDraftInvalid(draft: TaskDraft) {
  return !!draft.date && draft.repeatPreset !== 'none' && draft.repeatEndMode === 'date' && (!draft.repeatEndDate || draft.repeatEndDate < draft.date)
}
