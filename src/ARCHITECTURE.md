# Zing Calendar architecture map

This file is the maintenance map for the post-v1.10 refactor. The goal is not to make every React concern a separate file; it is to keep business rules testable and make future edits easy to locate without reopening stable interaction code.

## Runtime shape

Zing Calendar is local-first. IndexedDB is the primary local data store. Private GitHub sync is the structured-data ledger, and private Backblaze B2 stores binary attachments. Vercel serves the UI/auth/API relay. Do not move structured data to a remote database merely to simplify UI code.

`App.tsx` is intentionally the composition/orchestration layer. It owns cross-feature React state, browser effects, modal/view coordination, IndexedDB hydration/persistence, sync/backup orchestration, attachment UI, and the continuous-calendar/Day Detail interaction state machine. A large line count alone is not a reason to split it further.

## Where business rules live

- `domain/task.ts` — task recurrence/materialization, date-task rules, overdue/deadline logic, sorting, task/Focus duration helpers.
- `domain/calendar.ts` — lunar/solar calendar annotations and anniversary occurrence/page rules.
- `domain/tags.ts` — tag invariants, scope/filtering, task-vs-journal fallback semantics.
- `domain/journal.ts` — journal defaults, mood/energy toggles, journal date ordering/maps.
- `domain/menstrual.ts` — menstrual period prediction, visual state and day-log patching.
- `domain/focus.ts` — direct Focus session timing, completion and history aggregation.
- `domain/environment.ts` — daily weather/thermal/location record rules and option management.
- `domain/search.ts` — search parsing, snippets, entity matching and result construction.
- `domain/statistics.ts` — statistics range boundaries and aggregate calculations.
- `domain/import.ts` — Dida/Forest/import parsing and normalization.
- `domain/backup.ts` — backup ZIP/JSON/CSV/filename helpers.
- `domain/preferences.ts` — environment defaults, system/import tags and preference normalization.
- `domain/settings.ts` — synchronized-settings normalization, word-clock conflict metadata and equality rules.
- `domain/sync.ts` — entity identity and deterministic structured-data diff planning.
- `hooks/useAppPreferences.ts` — scalar UI preferences backed by localStorage.
- `types.ts` — shared application data contracts.
- `db/calendar.ts` — IndexedDB persistence APIs.

## High-risk interaction invariants

Do not casually rewrite the mobile calendar/Day Detail state machine in `App.tsx`.

- `selectedDate` is the single selected-day state.
- `dayDetailOpen` controls whether Day Detail is open; persistent selection must not imply an open drawer.
- Tapping any calendar date always selects it and opens Day Detail.
- Closing Day Detail keeps the selected date.
- Mobile touch locking and bottom-navigation visibility depend on `dayDetailOpen`, not on `selectedDate`.
- Cached continuous-calendar JSX calls the current date-opening handler through its ref; avoid reintroducing a stale closure.
- Pending close timers must be cancelled before reopening Day Detail.

Focus also has a protected interaction invariant: the just-used Focus tag remains selected after finishing a session and after reopening Focus.

## Sync and storage boundaries

- Keep `/api/*` outside PWA caching.
- GitHub structured sync goes through `/api/github-sync`; the token remains device-owned.
- B2 attachment signing/access is a separate backend security boundary; do not restore the old GitHub binary fallback.
- Backup restore and remote sync can update settings outside `useAppPreferences`; preserve that cross-layer behavior when changing preferences. Shared settings normalization belongs in `domain/settings.ts`, while IndexedDB/GitHub side effects remain orchestration concerns.
- Sync diff identity/planning belongs in `domain/sync.ts`; persistence of tombstones/change rows remains in the orchestration/database boundary.

## Refactor completion rule

The v1.10 refactor deliberately stops before splitting orchestration merely to reduce `App.tsx` line count. v1.10.18 is the consolidated stabilization endpoint for this refactor line. New extraction is justified only when it creates a clear feature boundary, lowers change risk, or makes independently testable behavior explicit. Avoid a forest of tiny hooks/components with heavy parameter plumbing.

For future changes: edit the relevant domain module first when the change is a business rule; edit `App.tsx` when the change is cross-feature orchestration or UI state; add/update a targeted regression test for changed invariants; then run the full build and mobile regression suite.
