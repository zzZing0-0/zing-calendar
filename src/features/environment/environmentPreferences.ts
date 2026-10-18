import {
  normalizeEnvironmentOptions
} from '../../domain/preferences'
import type {
  EnvironmentOption
} from '../../types'
export function loadEnvironmentOptions(key:string, defaults:EnvironmentOption[]) {
  try {
    const rows=JSON.parse(localStorage.getItem(key)||'[]')
    if(Array.isArray(rows)) return normalizeEnvironmentOptions(rows as EnvironmentOption[],defaults)
  } catch {}
  return normalizeEnvironmentOptions(undefined,defaults)
}
