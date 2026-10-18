import type { Anniversary, FocusSession, JournalEntry, Note, Task } from '../../types';
import type { Habit } from '../habits/habitDomain';

export type TrashItem =
    | { key:string; entity:'task'; kind:'series'|'occurrence'|'future'; task:Task; occurrenceDate?:string; trashedAt:string }
    | { key:string; entity:'journal'; journal:JournalEntry; trashedAt:string }
    | { key:string; entity:'anniversary'; anniversary:Anniversary; trashedAt:string }
    | { key:string; entity:'note'; note:Note; trashedAt:string }
    | { key:string; entity:'focus'; session:FocusSession; trashedAt:string }
    | { key:string; entity:'habit'; habit:Habit; trashedAt:string }
