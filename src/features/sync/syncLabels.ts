import type { SyncEntityType } from '../../db/calendar'
export const SYNC_ENTITY_LABELS: Record<SyncEntityType | 'trash', string> = {
  task:'任务', journal:'日记', note:'笔记', notebook:'笔记本', mood:'心情', energy:'能量', environment:'天气/体感', period:'月经', tag:'标签', anniversary:'纪念日', focus:'专注', habit:'习惯', habitCheckIn:'习惯打卡', settings:'设置', trash:'回收站',
}

export function syncEntityLabel(entityType: string) {
  return Object.prototype.hasOwnProperty.call(SYNC_ENTITY_LABELS, entityType)
    ? SYNC_ENTITY_LABELS[entityType as SyncEntityType | 'trash']
    : '其他'
}
