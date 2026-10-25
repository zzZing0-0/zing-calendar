# Zing Calendar architecture map

This file is the maintenance map for the post-v1.10 refactor. The goal is not to make every React concern a separate file; it is to keep business rules testable and make future edits easy to locate without reopening stable interaction code.

## Runtime shape

Zing Calendar is local-first. IndexedDB is the primary local data store. Private GitHub sync is the structured-data ledger, and private Backblaze B2 stores binary attachments. Vercel serves the UI/auth/API relay. Do not move structured data to a remote database merely to simplify UI code.

`App.tsx` is the composition root. It owns persisted cross-feature data, IndexedDB hydration/persistence, sync/backup coordination, and the continuous-calendar/Day Detail interaction state machine. Business workspaces and dialogs own their presentation behind explicit typed props; feature controllers own local interactions. Features never import the composition root or a global App state type.

## Feature boundaries

Large user-facing features should own their feature-local controller/state and presentation when that boundary is stable. `App.tsx` remains the application composition layer, but should not reimplement a feature’s parsing, modal workflow, or feature-local state machine. Do not split code merely to reduce line count; extract a feature when future work can then stay inside that feature directory with a small composition surface in `App.tsx`.

Current extracted feature boundaries include:

- `features/notes/` — Notes workspace/editor interactions.
- `features/random-wheel/` — random wheel and pool management presentation.
- `features/external-import/` — external CSV import workflow, previews, persistence, and modal presentation.
- `domain/focusRuntime.ts` + `hooks/useFocusWakeLock.ts` — shared Focus runtime rules and Wake Lock lifecycle; the upcoming Task→Focus data-model migration should build on this boundary rather than adding timer arithmetic back to `App.tsx`.

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

## UI refactor boundaries (v2.15.2 baseline)

The design-system refactor starts solely from commit `9ca65378df717fc9b93028df04be4f8643a1a128`. The application version, persisted types, domain algorithms, database schema, API relay, sync protocol, backup formats, date preferences, and service worker retain the v2.15.2 contracts.

- `components/ui/` provides native Button and Field controls, PageHeading, DialogHeader, and EmptyState. Wrappers preserve DOM semantics, refs, disabled states, accessible labels, and existing feature class names. Dialog headers retain their `aria-labelledby` target IDs.
- `styles/tokens.css` owns the shared canvas, surfaces, text, accent, borders, typography, spacing, radii, shadows, focus treatment, and motion vocabulary. Data-owned tag colors and semantic mood/priority colors remain separate.
- `styles/components.css` applies the shared visual treatment after existing feature layout styles. `App.css` retains calendar geometry, overlay stacking, and compatibility selectors; feature-specific layouts are not global UI primitives.
- `features/calendar/` owns CalendarPage, DayDetail, MonthPicker, and calendar renderers. The selection/open/close/scroll state machine stays in the root to preserve its interdependent refs and browser effects.
- `features/tasks/`, `journal/`, `anniversaries/`, `inbox/`, `trash/`, `tags/`, `environment/`, `attachments/`, `backup/`, and `sync/` own their respective viewers, editors, managers, and dialogs. Notes, Habits, navigation, and random-wheel keep their existing business boundaries.
- `useTagManagement` owns tag drafts, scope checks, archive/delete actions and usage selectors. `useGlobalSearch` owns query/filter state, derived search presentation and dismissal listeners. `useFocusRuntime` owns focus controls, exclusivity, auto-stop, wake lock and recovery routing. `useFocusHistoryEditor` owns historical interval editing shared across free/task/note/habit contexts. `useTaskNotesEditor` owns checklist editing and caret restoration. `useMobileNavigationPreferences` owns device-local navigation and explicit synced defaults.
- StatisticsPage owns its range, heatmap and expanded-color state and derives statistics through the unchanged domain module. It remains mounted across workspace changes so switching pages retains the selected range.
- No all-application context, copied App controller, or type-only dependency back to App is used. Root-to-feature props explicitly enumerate the data and actions a boundary consumes. CSV export construction and attachment rendering are reusable feature modules.

For future changes, edit the relevant domain module for business rules, the feature for local interaction/presentation, and App only for cross-feature coordination. Keep UI components independent of storage, syncing and date-format policy. See [the design system guide](DESIGN_SYSTEM.md) for visual conventions and validation commands.

## Data-safety regression tests

Sync and backup are treated as high-risk data-integrity surfaces. The Playwright suite includes isolated multi-device IndexedDB sync tests, GitHub proxy/provider integration tests with a fake cloud ledger, golden heterogeneous life-data fixtures, and full-backup validation/round-trip/restore tests. New changes to sync, tombstones, merge rules, backup manifests, restore parsing, or attachment backup handling should extend these tests rather than relying on manual observation.

## API security boundary (v1.10.20)

- `/api/github-sync` is a narrow GitHub relay, not a general proxy. It accepts only the Contents endpoint used by the sync bundle and Git Blob reads used for large bundles, rejects path traversal/extra query parameters, validates PUT bodies, caps request/token/path/body sizes, and rejects browser cross-site requests.
- `/api/b2-sign` signs only recognized immutable Zing attachment keys and GET/HEAD/PUT operations. Browser cross-site requests are rejected and signing failures never return server-secret/configuration details.
- The obsolete `/api/attachments` signer was removed; there must be one B2 signing surface.
- Long-lived B2 credentials remain server-only. GitHub tokens remain device-owned and are never logged by the relay.
- Deployment/session authentication remains an outer security boundary. These API checks are defense-in-depth and abuse-surface reduction; same-origin headers alone are not authentication.
- Any future API change must add/extend `security-api.spec.ts` and preserve normal GitHub/B2 regression coverage.

## Attachment lifecycle (v1.10.21)
- An attachment is **active** whenever at least one non-trashed Task/Journal reference remains.
- It is shown in the attachment **Recycle Bin** section only when references still exist but every remaining reference is trashed. Restoring any live reference makes it active again.
- A permanently deleted occurrence no longer keeps its attachment alive.
- A B2 object with no structured-data reference is an **orphan**. Orphan deletion is never automatic: Settings exposes an explicit one-click cleanup, with a pre-delete confirmation and a reminder to sync first.
- B2 garbage collection lists only allowlisted Zing attachment keys and deletes only keys absent from the client-supplied current reference set. Attachment metadata/reference rules must remain covered by regression tests.

### v1.10.22 — review-before-delete B2 orphan cleanup
- Settings places **清理 B2 孤儿附件** immediately above **清空所有数据**, keeping destructive maintenance actions together.
- B2 GC is now two-phase: `preview` lists currently unreferenced allowlisted attachment keys without deleting them; `delete` accepts the reviewed keys and re-computes orphan status before deletion.
- The preview obtains short-lived GET/HEAD URLs through the existing B2 signer so recognizable images can be viewed and audio can be played before deletion; unknown objects still expose their storage key and metadata when available.
- Delete-time revalidation prevents a file that regained a structured reference after preview from being removed.


### v1.10.22 overlay regression fix
- The orphan cleanup dialog reuses the validated `storage-browser-layer` overlay stacking model so its backdrop stays below the interactive dialog. A mobile Playwright regression test verifies that the dialog close control remains clickable.

### v1.10.23 Mobile presentation polish
- Encouragement-card actions use a full-width, right-aligned action row on mobile so Edit/Delete stay aligned across message lengths.
- Focus history treats the ordinary focus tag as the primary identity. Task/direct-focus origin is secondary metadata (`任务 · <title>` or `自由专注`) alongside duration.
- Presentation contracts are covered by a focused regression spec.

### Notes editor extensions
Notes-specific Markdown additions should remain inside the Notes feature. The shared Markdown editor may expose generic caret-safe insertion hooks/props, while Notes owns the content/formatting rule (for example, timestamp text). Do not duplicate global date-format rules inside the editor adapter.

## Focus time ownership (v2.9.18)

`FocusSession` is the single persisted source of truth for focus time. A session with no `context` is free focus. A session with `context: { kind: 'task', taskId }` belongs to one ordinary Task; `context: { kind: 'note', noteId }` belongs to one Note. Task records no longer persist aggregate duration, timer sessions, timer remainder, or active timer fields. Task totals and Today Focus task rows are derived from FocusSessions. Recurring Tasks are checklist/habit records and do not expose Task timing.

### Task-context Focus trash lifecycle (v2.9.20)
- A whole non-recurring Task soft-delete cascades to its live task-context FocusSessions. Cascaded sessions carry `trashedByTaskId` so Task restore revives only sessions deleted by that Task action; FocusSessions already independently in trash stay trashed.
- Task-context FocusSessions cascaded by a Task are hidden as separate recycle-bin rows; the Task is the lifecycle owner for that cascade.
- Restoring the Task restores only its cascaded FocusSessions. Permanently deleting the Task permanently deletes every FocusSession associated with that Task. Clearing the recycle bin removes both the trashed Task and its associated FocusSessions.
- Trashed or orphaned task-context FocusSessions are excluded defensively from Today Focus and all Focus statistics.

### Note × Focus integration (v2.9.22)
Notes use the same persisted `FocusSession` source of truth as free and Task focus. A Note session is a stopwatch FocusSession with `context: { kind: 'note', noteId }`; Note records never store aggregate focus duration. Note totals and Today Focus rows are derived from FocusSessions. Note deletion cascades its live FocusSessions into Trash with a reversible cascade marker; restore reverses only that cascade, while permanent deletion removes every FocusSession associated with the Note. Trashed or missing Note contexts are excluded from all focus statistics. Global focus exclusivity and Wake Lock remain shared across free, Task, and Note focus.

## Data integrity guardrails (v2.15.2)

- Full ZIP restore validates CRC32, central directory and unique entity keys before writing. Missing/duplicate IDs are rejected rather than silently overwritten by IndexedDB.
- Generic CSV and Dida CSV imports track identifiers within the imported file as well as existing local records, preventing duplicate IDs from being inserted in a single import. Forest already tracks imported IDs in its parsing loop.
- Backup restoration writes primary records and binary attachments in a shared IndexedDB transaction. Device-local settings are stored separately; full settings/data atomicity across localStorage and IndexedDB is not guaranteed.
- Cloud sync is deliberately not realtime. Do not add realtime cross-device focus locking; test merge and tombstone invariants instead.

## v2.15.3 candidate: safety and maintenance boundaries

This section supersedes earlier safety claims where they are more optimistic. The database remains schema 12 and sync remains protocol 1. See [AGENTS.md](../AGENTS.md), [release rules](../docs/RELEASING.md) and [the current audit](../docs/SECURITY_AUDIT_v2.15.3.md).

- `db/transaction.ts` owns explicit rollback on synchronous enqueue errors and replacement key validation. `db/request.ts` owns bounded client request lifetimes. `domain/syncValidation.ts` validates incoming bundle identities before merge. `domain/backupValidation.ts` validates settings and attachment references before restore.
- Sync composes a candidate without mutating local records, uploads with the existing GitHub SHA compare-and-swap, and commits acknowledged data against the latest local rows in one transaction. A single pre-merge structured-data checkpoint lives in syncMetadata; it is not a complete binary backup or a user-facing rollback interface.
- Failed hydration must not enable empty-state persistence. Merely viewing storage statistics must not collect attachment bytes. Explicit local cleanup rechecks persisted Task, Journal and Note references, including trash and recurring exceptions, within its deletion transaction.
- B2 delete-time revalidation compares against the supplied reference list, not an authoritative up-to-date multi-device ledger. The historical claim that it protects a newly regained reference only applies when the caller supplies that reference. Server-side same-origin checks do not provide identity authentication. These remain release blockers in the current audit.
- IndexedDB data plus attachments restore atomically inside IndexedDB. localStorage preferences and tombstone/outbox recording are separate storage/transaction boundaries; do not claim whole-application crash atomicity.
- Existing shared UI, feature controllers and global date formatting remain the extension points. Persistent root effects and sync orchestration are still substantial; move them only with behavior-focused tests and a stable business boundary, not merely to reduce App.tsx line count.
- Version ownership is package.json, with synchronized lockfile and generated production worker version. Every new code delivery needs a new version; historical tags and changelogs remain immutable.

## v2.15.4 candidate: atomic persistence and server authorization

See [current remediation audit](../docs/SECURITY_AUDIT_v2.15.4.md) and [deployment prerequisites](../docs/B2_DEPLOYMENT.md). This supersedes the prior candidate's open-code-boundary descriptions; deployed behavior is still unverified.

- `server/b2-authorization.ts` binds B2 access to configured GitHub numeric identities and one fixed private ledger ID plus write permission. Both B2 handlers deny on missing configuration/identity/permission/upstream availability. Same-origin checks remain defense in depth.
- B2 GC is preview only. Its delete action always refuses before bucket access; there is no server DELETE implementation or force switch. No live/offline global-reference proof currently exists.
- `saveEntityWithSync` reads durable rows and atomically writes entity data, tombstones and outbox. `features/sync/useEntityPersistence` connects hydrated feature state to it. The old diff adapter delegates to the atomic method, never records stale UI snapshots in separate transactions.
- `replaceZingData` accepts optional settings without changing stored row or backup formats; the application restore supplies fully prepared settings in the same transaction as all data and blobs.
- `features/application/settingsCache.ts` treats localStorage as a cache. main prepares it from durable IDB settings before mounting React. Failure blocks mounting, leaving IDB data intact; old installs with no settings row retain their local preference compatibility. Cache writes in running preferences cannot convert a committed restore into a failed data transaction.

## v2.15.5 candidate: restore authorized manual B2 deletion

This supersedes the preceding candidate's preview-only restriction. The existing preview → review → confirmation → delete flow is retained. `api/b2-gc.ts` requires the same server identity/ledger authorization, lists only the configured bucket, and reads cloud attachment references through `server/b2-ledger.ts`. Server-pinned branch/path default to the existing sync defaults; client input cannot choose a bucket or ledger. Task recurrence, trash, Journal and Note links protect objects even when omitted by a stale client. Each deletion rechecks current cloud references and reports per-key outcomes. `features/attachments/b2CleanupResult.ts` validates results; the UI retains failed/protected files and does not collect unrelated local bytes.

There is no global atomic transaction between GitHub reference checks and B2 deletion, nor visibility into unsynced offline devices. Deployment binding and provider behavior remain unverified; no release is authorized in this round. See `docs/B2_DEPLOYMENT.md` for these limits.

## Gacha Lab native module (v2.16.0)

- `features/gacha-lab/GachaLabPage` owns the portal, safe-area toolbar, loading fallback and feature error boundary. The host return action remains mounted independently of lazy-loaded content. App only supplies the close action that returns to the calendar; calendar selection/month state remains owned by App.
- `features/gacha-lab/useGachaLab` owns feature actions and candidate-state commits. Components separately own drawing/results, probability presentation, inventory/collection, shop, pool management, reward editing and trade editing. Shared Button, Field, PageHeading and design tokens remain the UI foundations.
- `domain/gacha/` owns typed legacy contracts, sample configuration, integer-weighted drawing, validation, inventory balances, trade rules and probability statistics. It has no application, IndexedDB or sync dependency.
- `features/gacha-lab/storage` reads/writes only `zing-gacha-v1`. Loading normalizes a private copy and never writes. Invalid JSON or state blocks feature hydration without replacing raw data. Legacy versions, `to`, and reward-based redemption configurations are understood; historical and unknown fields are retained. Writes compare the last raw snapshot before saving, and failed writes do not commit the candidate UI state. This is a stale-write guard, not a cross-tab atomic transaction.
- Gacha JSON config/full backup envelopes retain schema 1 and remain independent of the calendar's backup/cloud mechanisms. The iframe, standalone public HTML and integration script have been removed. Tests run native browser workflows and a fixture produced by the actual v2.15.22 HTML writer.

## Task recurrence and habit-day rules (v2.17.0)

- `features/tasks/TaskRecurrenceFields` restores the dated-task recurrence controls and `taskRecurrenceDraft` owns editor-only ending validation. Persisted recurrence/exception contracts and existing scope actions remain unchanged. `draftRepeat` keeps a saved weekly weekday custom when it differs from the series start, so the start-derived weekly preset cannot alter that rule during a no-op edit.
- `domain/habitDay` computes habit-only local calendar keys; global task/journal/focus dates remain natural dates. `useHabitToday` refreshes at minute boundaries and foreground activation. Today's DayDetail habit section shares this key; explicit historic selections and manual calendar additions keep their literal dates. Changing the cutoff never rewrites check-ins.
- `habitDayStart` is an optional synced/backed-up user setting, normalized to `00:00` for older settings/backups and projected through the existing pre-mount settings cache. Incoming sync/backup validation rejects invalid HH:mm values. Database schema 12, sync protocol 1 and backup schema 1 are unchanged.
- `features/habits/habitOrder` maintains optional per-habit `sortOrder`, with the old array order as fallback. Both home and DayDetail apply completion grouping over the same base order. The shared SortableList accepts feature content while retaining its existing pointer, long-press and keyboard handle; each completion group is a separate list. Rank writes use the existing habit persistence/sync pipeline without changing archive/delete/history fields.
- HabitCalendar adds directly for the selected date through `useHabitCheckIns`. The separate log dialog is retained only for editing existing records. Explicit-date additions are bounded by the natural local current date and disallowed for archived/deleted habits; default quick actions supply the calculated habit day.
