# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Workflow

Work items live under `tasks/`, in three subfolders that double as a status pipeline:

- **`tasks/todo/`** — one `.md` file per unit of work not yet started, written by the user.
- **`tasks/planned/`** — implementation plans, one per task, not yet implemented.
- **`tasks/done/`** — implementation plans for work that has been implemented.

Process for a task file found in `tasks/todo/`:

1. Read it, and ask clarifying questions as needed. Write a real implementation plan as a new `.md` file in
   `tasks/planned/`, then delete the source file from `tasks/todo/`.
2. Implement the plan, then move its file from `tasks/planned/` to `tasks/done/` (its content may also be
   updated at this point to reflect what was actually built, if it diverged from the plan).

These two steps do not need to happen in the same session, and tasks do not need to be worked one at a
time — `tasks/todo/` and `tasks/planned/` may each hold multiple files awaiting their next step at once.

## Project state

Checquery is a single-user, single-window desktop personal-finance app (double-entry
accounts/vendors/transactions, balance sheet, income statement) — built on the **Electrobun + SolidJS**
starter template (`electrobun-solid`: a Bun-powered native shell hosting a SolidJS UI, built with Vite), now
with substantial application-specific logic on top of that scaffold. It is a from-scratch rewrite of an
earlier version of the same app (formerly kept alongside it in this repo under `zz-archive/`, since deleted
— its domain model, code, and `documentation/functional-spec.md` are historical only, not authoritative).

Built so far (see `tasks/done/` for the implementation plan behind each): file lifecycle (new/open/close an
encrypted `.checquery` file), accounts + account categories (a tree, accounts as flat leaves), vendors +
vendor categories, transactions with double-entry entries and split support, balance assertions, the
Register/Income Log/Expense Log pages, the inline calculator, the Balance Sheet and Income Statement
(Summary + Details) reports, and a one-time `yaml-import` CLI that replays an old checquery client/server
YAML action log into a new checquery file. Annual Budget is still a stub. Cash Flow Statement was cut
entirely (not enough distinct value for a personal-finance app over the Balance Sheet/Income Statement) — if
it resurfaces in `documentation/functional-spec.md`, treat that as historical, not a pending feature. Current
work-in-progress and up-next items live in `tasks/todo/` and `tasks/planned/` (see Task Workflow above).

Two reference documents live outside the `tasks/` pipeline:

- `documentation/functional-spec.md` — an unmodified copy of the **prior effort's** functional spec, kept
  for reference. This app's domain model has since diverged from it in several material ways —
  `tasks/done/info-architecture.md` §0 has the full diff table (accounts vs. account categories,
  `BalanceAssertion` replacing `Statement`, two transaction dates instead of one, etc.); this CLAUDE.md's
  Domain Model Notes below covers one more (Net Worth). When the two disagree, this app's current source and
  `tasks/done/info-architecture.md` take precedence.
- `tasks/done/*.md` — despite the folder name, these are the durable architecture references for this
  codebase, not just a changelog: `action-log.md`, `materialized-store.md`, and `ledger-store.md` specify the
  persistence stack; `info-architecture.md` specifies navigation/page structure; the rest are per-feature
  implementation plans, several annotated with an "Implemented as planned" note where the build diverged from
  the original plan.

## Domain Model Notes

- **The Net Worth account (`acctIdNetWorth`, the singleton `EQUITY` account) is a bookkeeping device, not a
  reportable account.** It exists only so opening balances and arbitrary asset revaluations (e.g. updating a
  home's value from a Zillow estimate) have something to debit/credit against — it is never shown in the UI
  as an account, never linked to, and has no register/detail page. Nothing in this app ever performs a
  periodic "closing the books" entry that would move net income into it (unlike a corporation's books), so
  its own running balance does **not** track actual net worth over time — it only reflects opening-balance
  and revaluation postings, not the accumulated effect of income/expense activity.
- **Net Worth for reporting purposes is always computed as `Assets − Liabilities`, as of whatever date is in
  scope — never by summing the Net Worth account's own entries.** This is deliberate, not a simplification:
  because there's no periodic closing entry, the two would silently diverge over time as income/expense
  transactions change Asset balances with no corresponding entry against Net Worth. `Assets − Liabilities` is
  the only value that actually equals net worth at any point in time; treat it as the source of truth
  anywhere net worth needs to be displayed (balance sheet, and any future report that needs it).

## Commands

Package manager is **Bun** (`bun.lock` present) — use `bun run <script>`, not npm/yarn.

- `bun run start` — build the Vite frontend once, then launch the Electrobun app (no HMR).
- `bun run dev` — run Electrobun in watch mode against the last build.
- `bun run dev:hmr` — full dev loop: runs the Vite dev server (`bun run hmr`) and `bun run start` concurrently, giving hot module replacement in the desktop shell.
- `bun run hmr` — Vite dev server alone, on a fixed port (5173).
- `bun run build:canary` — production build via `vite build` followed by `electrobun build --env=canary`.
- `bun run test` — the **only** correct way to run the suite; it's `bun --conditions=browser test` under the
  hood. **Never run plain `bun test` directly** (e.g. to target a single file) — without `--conditions=browser`,
  Bun resolves `solid-js` to its server/SSR build instead of the client build, and any test that imports
  `@solidjs/router`'s `<A>` fails with "Client-only API called on the server side," which looks like a test
  bug but is purely a module-resolution flag. To run a single file, append the path:
  `bun --conditions=browser test path/to/File.test.ts`.
- `bun run yaml-import/import.ts <old-log.yaml>` — one-time-use CLI that replays an old checquery
  client/server YAML action log through this app's own persistence stack, producing a new
  `.checquery`/`.checquery-test` file alongside the input (see `tasks/done/yaml-import-implementation-plan.md`).

Also useful, not wired into `package.json`:

- `bunx tsc --noEmit` — typecheck. (Currently one pre-existing, unrelated error from `electrobun`'s own
  `node_modules` — a missing `three` type declaration — is expected and not something this codebase can fix.)

There is no lint/format tooling configured (no ESLint/Prettier/Biome config in the repo).

**Test mode / encryption**: `CHECQUERY_ENCRYPTION_DISABLED` (checked once, fail-fast, before any window opens
— see `src/bun/index.ts` and `src/bun/encryptionMode.ts`) — `"true"` skips password prompts entirely and uses
the unencrypted `.checquery-test` extension (what the test suite's temp-file tests use); `"false"` or unset is
normal encrypted `.checquery` behavior; any other value exits with an error. See `tasks/done/test-mode.md`.

## Architecture

Two separate runtime targets share one TypeScript project, compiled independently, plus a `shared/` layer
used by both:

- **`src/bun/index.ts`** — the Electrobun main process (runs under Bun). Creates the native `BrowserWindow`,
  defines the RPC handler map (`AppSchema` from `src/shared/rpc.ts`), and contains dev-vs-production URL
  resolution logic: it probes `http://localhost:5173` (the Vite dev server) and uses it when available
  (channel `"dev"`), otherwise falls back to the bundled `views://mainview/index.html`.
- **`src/mainview/`** — the SolidJS frontend (runs in the Electrobun webview), built by Vite. Entry point is
  `main.tsx` → renders `App.tsx` into `#app` in `index.html`. Vite's `root` is `src/mainview` (see
  `vite.config.ts`); build output goes to `dist/` at the repo root.
- **`src/shared/`** — domain schemas (`shared/domain/`, one folder per entity — `accounts`, `accountCategories`,
  `vendors`, `vendorCategories`, `transactions`, `balanceAssertions`, `origins`, plus `core/` for cross-cutting
  types like `CurrencyAmt`, `IsoDate`, `Period`), the CRUD service interfaces (`shared/crudServices/`, one
  `IXxxQrySvc`/`IXxxCmdSvc`/`XxxTeeSvc` per entity), and `rpc.ts` (the `AppSchema` RPC contract shared by both
  runtime targets).

**Build/copy flow** (`electrobun.config.ts`): Vite builds `src/mainview` → `dist/`, then Electrobun's `build.copy` maps `dist/index.html` and `dist/assets` into `views/mainview/...` inside the packaged app (`build/`). Always run the Vite build before an Electrobun build/dev step that needs fresh frontend assets — `bun run start` does this automatically; `bun run dev` does not.

`tsconfig.json` targets `src/` only, with SolidJS's `jsxImportSource` configured for the `preserve` JSX transform — required for `.tsx` files under `src/mainview` to compile correctly.

**Styling**: Tailwind CSS v4 is wired in via the `@tailwindcss/vite` plugin in `vite.config.ts` (no separate `tailwind.config.js`/PostCSS config needed for v4). `src/mainview/app.css` starts with `@import "tailwindcss";` followed by the app's existing hand-written CSS.

### Persistence: `LedgerStore` = `ActionLog` + `MaterializedStore`

One `LedgerStore` per open file (`src/bun/persistence/ledgerStore/`), combining two halves — full detail in
`tasks/done/action-log.md`, `tasks/done/materialized-store.md`, and `tasks/done/ledger-store.md`:

- **`ActionLog`** (`src/bun/persistence/actionLog/`) — the durable, encrypted (unless test mode), append-only
  event log actually persisted to the `.checquery` file; migrations live under `actionLog/migrations/`.
- **`MaterializedStore`** (`src/bun/persistence/materializedStore/`) — an in-memory `bun:sqlite` database
  holding only *current* entity state, rebuilt by replaying the `ActionLog` on file open; every `IXxxQrySvc`
  read and report query (e.g. `findAccountBalancesAsOf`, `findAccountBalancesForPeriod`) is answered from
  here, not the log.

Each entity's `XxxTeeSvc` (`src/shared/crudServices/<entity>/`) fans a write out to both halves in order —
log first (mints the id/HLC), then the materialized store — and is what `bun/index.ts`'s RPC handlers and
`LedgerStore.svcs` actually call. The mainview never talks to either half directly; it goes through
`src/mainview/<entity>/<entity>Client.ts` wrappers around `rpc.request.*` (each swappable via `mock.module` in
component tests — see any `*.crud.test.tsx` or page test for the pattern).

### Mainview page map

Routes are registered in `src/mainview/main.tsx` (`@solidjs/router`'s `HashRouter`, root `App`). `HomePage.tsx`
(`src/mainview/pages/HomePage.tsx`) covers both the no-file-open and file-open states (info-architecture.md
§3/§4); every other page lives one subfolder per feature under `src/mainview/pages/<feature>/` (`accounts`,
`balancesheet`, `incomestatement`, `register`, `incomelog`, `expenselog`, `vendors` and `budget` — the last
still a stub; there is no `cashflow` page — see Project state above). Shared, non-page-specific components
live in `src/mainview/components/` (`nav/`
for the breadcrumb system, `reports/` for `CategoryRollupTable` — shared by the balance sheet and income
statement — and one folder per feature otherwise). Pure, unit-tested view-shaping logic (building a register's
line items, a balance sheet's category rollup, etc.) lives in `src/mainview/<feature>/` *outside*
`components/`, deliberately decoupled from rendering — see `tasks/done/info-architecture.md` and any
`tasks/done/*-implementation-plan.md` §0 for the reasoning repeated across passes.
