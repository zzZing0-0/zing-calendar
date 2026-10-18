# Shared UI and module conventions

This refactor preserves the v2.15.2 (`9ca6537`) product and data contracts. It adds no business feature and creates no new release/tag.

## Visual foundations

`styles/tokens.css` is the source for shared visual values. Use semantic variables such as `--color-surface`, `--color-text-secondary`, `--color-accent`, `--color-border`, `--radius-control`, `--radius-panel`, and `--space-4`. Change an application-wide visual choice here instead of adding another per-page override. The default accent is `#39765d`.

The system stylesheet loads after feature layouts in `main.tsx`. Shared headings have the same surface, radius, title hierarchy and responsive padding in Notes, Habits, Anniversaries, Statistics and Settings. Calendar retains its interactive month toolbar and grid geometry. Common actions use the same accent and focus treatment on every page. Existing priority, emotion, mood and user-selected tag colors carry meaning; keep those semantics independent of the application accent.

Use `Button` for actions, with `variant="primary"`, `"secondary"`, `"danger"`, or the default `"plain"` for feature-styled/icon actions. It renders one native button, defaults to `type="button"`, and forwards native props and refs. Keep explicit accessible names on icon-only actions. `Field` renders one native label, preserving nested input names and `htmlFor` behavior. These components do not add wrappers or interpret business values.

`PageHeading` and `DialogHeader` render a title, optional eyebrow, and an action slot. Use `titleId` when the surrounding dialog has `aria-labelledby`. Pass feature-owned close handlers in the action slot. `EmptyState` supplies consistent empty-state typography while its text remains feature-owned. Components do not reformat dates, persist state, or import business modules.

## Module ownership

Feature views receive explicit typed props, rather than a root application object or global context. Keep transient state and local effects with the controller that owns them. Persisted entities stay with the existing root/database coordination, including the rules for hydration, sync snapshots, restore, and tombstones.

The existing date formatter is passed into Notes, Habits, Day Detail, journal, focus history and storage presentation. Continue passing it through; do not introduce a new formatter in shared UI. Date inputs retain their native ISO values. Default navigation, localStorage keys, backup records and remote sync payloads stay unchanged.

Keep the mobile calendar state machine intact: selection and open state are separate, closing preserves selection, cached week renderers open dates through the current handler ref, and close timers are cancelled before reopening. Focus panels can be dismissed while the session continues; changing unrelated data must not reopen a dismissed panel.

## Validation

From the repository root:

```sh
npm ci
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e -- --workers=2
```

When the environment supplies a system Chromium instead of a downloaded Playwright browser:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
```

The optional executable-path setting changes only the test browser. The default Playwright-managed browser is used when it is unset. The runner starts the existing Vite server at its configured test port.

`design-system-workspaces.spec.ts` exercises all six workspaces at mobile and desktop sizes, token propagation, and accessible dialog titles. `refactor-feature-workflows.spec.ts` covers tag edit/cancel/persistence, search filtering/navigation/dismissal, and focus interval validation/persistence. Existing data-integrity, backup, sync, task, notes, habits and calendar suites remain part of the full regression.

Legacy source contracts now read the live feature modules as well as the root through `tests/helpers/applicationSource.ts`. Isolated CSS fixtures initialize the same shared variables as the app. The native-date footer regression explicitly transfers focus to another control: Chromium's segmented date input can retain focus after a synthetic `blur()`, so the test verifies the actual focus transition before asserting footer visibility.
