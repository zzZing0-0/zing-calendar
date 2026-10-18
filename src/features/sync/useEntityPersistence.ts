import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { saveEntityWithSync, type SyncEntityType } from '../../db/calendar'

/** Local rows and their sync journal share a commit; UI snapshots are not a log. */
export function useEntityPersistence(entityType: SyncEntityType, rows: any[], hydrated: boolean, setRevision: Dispatch<SetStateAction<number>>) {
  const initialized = useRef(false)
  useEffect(() => {
    if (!hydrated) return
    const notify = initialized.current
    initialized.current = true
    void saveEntityWithSync(entityType, rows).then(changed => {
      if (changed && notify) setRevision(value => value + 1)
    }).catch(error => console.error(`Failed to persist ${entityType} with its sync journal`, error))
  }, [entityType, rows, hydrated, setRevision])
}
