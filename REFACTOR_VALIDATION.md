# UI design-system and module refactor validation

Baseline: `9ca65378df717fc9b93028df04be4f8643a1a128`, application version **2.15.2**. No other release or unfinished version was used.

## Result

- Six top-level workspaces and their editors, viewers, managers and overlays now use feature modules and shared UI foundations.
- `src/App.tsx`: 4,876 → 2,496 lines. Feature-local controllers cover tags, search, focus runtime/history editing, task checklist input and mobile navigation preferences. Statistics owns its local presentation state.
- Shared native controls and headings use semantic design variables. Mobile (390 px) and desktop (1,440 px) workspace checks and visual inspection passed.
- The core `src/domain/`, `src/db/`, `src/types.ts`, `api/`, `public/`, package declarations and lockfile are unchanged. Existing business logic, persisted records, sync/backup contracts and date-format preferences remain the v2.15.2 baseline.

## Commands and outcomes

Run from the repository root, using Node 24 and the environment's system Chromium:

```sh
npm run build
npm run lint
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
```

- Build: passed, including TypeScript. Vite reports the existing large-bundle warning.
- Lint: passed, with warnings in existing logic/styles/tests; warnings were not suppressed.
- Full Playwright regression: **482 passed, 0 failed, 0 skipped**. The original 473 tests remain, with nine additional browser tests covering shared workspace presentation, accent propagation, accessible dialog titles, tag editing/persistence, search filtering/dismissal/navigation, free/task focus interval editing and date-preference persistence.
- `git diff --check`: passed.

The unmodified baseline produced 472 passes and one failure in the native-date focus fixture. Inspection confirmed that system Chromium retained focus on its segmented date input after a synthetic `blur()`. The test now moves focus to another native control and verifies the actual focus transition before checking footer visibility. The application's date-control behavior was preserved.

Source-based legacy contracts now read the live extracted modules, and isolated stylesheet fixtures load the shared variables. No tests were removed or disabled. Integration regressions retain their fake-cloud coverage; this is not a claim of production GitHub/B2 connectivity.

All changes remain in the local working tree. No existing tag was changed, and no push, merge or deployment was performed.
