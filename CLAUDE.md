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

Checquery is a personal-finance web app for one household (double-entry accounts/vendors/transactions,
balance sheet, income statement): a **Bun + Hono** server that keeps encrypted `.checquery` SQLite files in a
data directory and serves a **SolidJS** client (built with Vite), deployed as one Docker image with the data
directory on a volume, behind a Caddy reverse proxy for HTTPS. Up to two configured users sign in; one file is open at a time, server-wide. It began as
an Electrobun desktop app and was converted to a web app in October 2026 (see
`tasks/done/convert-to-web-app-implementation-plan.md`); it is itself a from-scratch rewrite of an earlier
version of the same app (formerly kept in this repo under `zz-archive/`, since deleted — its domain model,
code, and `documentation/functional-spec.md` are historical only, not authoritative).

Built so far (see `tasks/done/` for the implementation plan behind each): sign-in, file lifecycle
(new/open/unlock/close/upload an encrypted `.checquery` file in the server's data directory), accounts + account categories (a tree, accounts as flat leaves), vendors +
vendor categories, transactions with double-entry entries and split support, balance assertions, the
Register/Income Log/Expense Log pages, the inline calculator, and the Balance Sheet and Income Statement
(Summary + Details) reports. Annual Budget is still a stub. Cash Flow Statement was cut entirely (not enough
distinct value for a personal-finance app over the Balance Sheet/Income Statement) — if it resurfaces in
`documentation/functional-spec.md`, treat that as historical, not a pending feature. The one-time `yaml-import`
CLI that once replayed an old checquery client/server YAML action log into a new checquery file has since been
removed (its job was done, and the YAML representation it read is now obsolete) — see
`tasks/done/yaml-import-implementation-plan.md` for the historical record if that need ever comes back. Current
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

Package manager is **Bun** (`bun.lock` present; version pinned in `mise.toml`, which the Docker image follows)
— use `bun run <script>`, not npm/yarn. The repo is a Bun workspace (isolated installs: each package has its own
`node_modules`). Run these from the repo root:

- `bun run dev` — the full dev loop: the API server with `--hot` (port `CHECQUERY_PORT`, default 3000) plus the
  Vite dev server on http://localhost:5173, which proxies `/api` to it. Browse to :5173.
- `bun run build` — Vite build of the client into `packages/client/dist`.
- `bun run start` — the server alone, serving the last client build (same as production, minus Docker).
- `bun run test` — the **only** correct way to run the whole suite: it runs each package's tests from that
  package's directory (`test:shared`, `test:server`, `test:client`). Only the client needs
  `--conditions=browser` — without it, Bun resolves `solid-js` to its server/SSR build and any test importing
  `@solidjs/router`'s `<A>` fails with "Client-only API called on the server side," which looks like a test bug
  but is purely a module-resolution flag. So for a single **client** test file:
  `cd packages/client && bun --conditions=browser test src/path/File.test.tsx`. Server and shared files can use
  plain `bun test <file>` from their own package directory (the client's happy-dom preload lives in
  `packages/client/bunfig.toml`, so it only loads there).
- `bun run typecheck` — `tsc --noEmit` per package. Clean (no known errors).
- `bun run hash-password` — prints a password hash (argon2id, base64-encoded so its `$`s survive `.env`/Compose
  substitution) for `CHECQUERY_USERn_PASSWORD_HASH`.
- `docker compose up --build` (or `bun run docker:up`) — the production image behind a Caddy HTTPS front end,
  on https://localhost:8443 by default (`CHECQUERY_TLS_HOSTS` for the names clients use,
  `CHECQUERY_BIND_ADDRESS=0.0.0.0` to publish on the LAN, `CHECQUERY_HTTPS_PORT` to change the port), data in
  the `checquery-data` volume. Users come from `.env`. Each client installs Caddy's root certificate once — see
  `deploy/README.md`.

There is no lint/format tooling configured (no ESLint/Prettier/Biome config in the repo).

**Configuration** — environment variables, validated together at startup by `packages/server/src/config.ts`,
which fails fast with a message naming the bad variable. Bun auto-loads a `.env` in the working directory (see
`.env.example`); Compose reads the same file.

| Variable | Default | |
|---|---|---|
| `CHECQUERY_USER1_NAME` / `CHECQUERY_USER1_PASSWORD_HASH` | required | user 2 likewise, optional |
| `CHECQUERY_DATA_DIR` | `./data` (Docker: `/data`) | must exist and be writable |
| `CHECQUERY_PORT` / `CHECQUERY_HOST` | `3000` / `127.0.0.1` (Docker: `0.0.0.0`) | |
| `CHECQUERY_STATIC_DIR` | `packages/client/dist` (Docker: `/app/public`) | |
| `CHECQUERY_IDLE_CLOSE_MINUTES` | `60` | close (+ back up) the open file after this long without requests; `0` = never |
| `CHECQUERY_LOGIN_IDLE_MINUTES` | `480` | |
| `CHECQUERY_TRUST_PROXY` | `false` (Compose: `true`) | take the client IP and HTTPS-ness from `X-Forwarded-For`/`-Proto`/`-Host` |
| `CHECQUERY_MAX_UPLOAD_MB` | `200` | |
| `CHECQUERY_ENCRYPTION_DISABLED` | unset | test mode, below |
| `CHECQUERY_ALLOW_TEST_MODE` | `false` | needed for test mode when `NODE_ENV=production` |

**Test mode / encryption**: `CHECQUERY_ENCRYPTION_DISABLED` — `"true"` skips file passwords entirely and uses the
unencrypted `.checquery-test` extension (what the test suite's temp-file tests use); `"false"` or unset is
normal encrypted `.checquery` behavior; any other value is a startup error. Test mode is refused when
`NODE_ENV=production` (as in the Docker image) unless `CHECQUERY_ALLOW_TEST_MODE=true`. See
`tasks/done/test-mode.md`. Sign-in is required in both modes.

## Architecture

A Bun workspace monorepo with three packages under `packages/`, each with its own `package.json` and
`tsconfig.json` (extending `tsconfig.base.json`):

- **`@checquery/shared`** (`packages/shared/src/`) — domain schemas (`domain/`, one folder per entity —
  `accounts`, `accountCategories`, `vendors`, `transactions`, `balanceAssertions`, `origins`, plus `core/` for
  cross-cutting types like `CurrencyAmt`, `IsoDate`, `Period`), the CRUD service interfaces (`crudServices/`,
  one `IXxxQrySvc`/`IXxxCmdSvc`/`XxxTeeSvc` per entity), and `api/` — the HTTP contract: Zod schemas for each
  request body/query (transport shape only; domain rules stay in the server handlers' `xxxEventSchema.parse`
  calls), payload types, and `ApiErrorBody`/`ApiErrorCode`. No build step: its `package.json` `exports` map
  points straight at the `.ts` sources, so the other packages import e.g.
  `@checquery/shared/domain/accounts/Account`.
- **`@checquery/server`** (`packages/server/src/`) — `index.ts` (load config → `createApp` → `Bun.serve`;
  idle-close timer; SIGTERM/SIGINT close-and-backup), `app.ts` (the Hono app), `routes/` (thin HTTP adapters),
  `handlers/` (one function per operation, taking an explicit `HandlerSession` = open store + this session's
  Origin), `fileLifecycle.ts`/`fileUpload.ts`, `auth/` + `middleware/`, `static.ts`, and `persistence/`.
  `scripts/hashPassword.ts`. HTTP-level tests live in `packages/server/test/` and drive the app in-process
  with `app.request()` (see `test/support.ts`); everything else is tested next to its source.
- **`@checquery/client`** (`packages/client/src/`) — the SolidJS SPA (entry `main.tsx` → `App.tsx`), built by
  Vite into `packages/client/dist`, which the server serves as static files.

**Request flow**: a page calls a `xxxClient.ts` wrapper (`packages/client/src/<entity>/`, each swappable via
`mock.module` in component tests — see any `*.crud.test.tsx` or page test for the pattern) → the typed Hono
client `api` (`client/src/api/apiClient.ts`, `hc<AppType>` — `AppType` is a *type-only* import of the server's
chained route definitions, so the client can't drift from the server) → `unwrap()` (throws `ApiError`, an
`Error` with the server's message, so `e.message` UI works) → `/api/...` route → `requireLogin` /
`requireUnlockedFile` middleware → `zxValidator` → `handleXxx(session, params)` → `LedgerStore.svcs` →
`XxxTeeSvc`. Mutations return 204 and callers refetch; there's no push/live update between tabs or users.
`middleware/errorHandler.ts` maps every failure to an `ApiErrorBody` (domain Zod errors keep Zod's message).
All non-GET requests run one at a time through a mutex (`middleware/mutex.ts`), as do file close/idle-close/
shutdown, so a close can never land mid-write.

**Sessions** (in memory; a restart signs everyone out and closes the file): signing in (`/api/auth/login`,
`Bun.password.verify` against the configured hashes) sets an HttpOnly, SameSite=Strict `checquery_session`
cookie (`Secure` when served over HTTPS). Separately, each login session must *unlock* the open file — by
creating or opening it, or, for a file another session opened, by entering its password (`/api/file/unlock`) —
before any entity route works
(`403 file-locked` otherwise). The unlock records that session's Origin (logged-in user name + client IPv4 —
IPv6 clients are normalized or recorded as `0.0.0.0`, since `ipAddressSchema` is IPv4-only), which stamps its
writes. Any close (explicit, opening another file, idle, shutdown) backs the file up into
`<dataDir>/backups/` and revokes every unlock. Failed passwords (login, open, unlock) are rate-limited per IP.
Hono's `csrf()` and `secureHeaders()` (with a CSP) apply to everything.

**Client session state** lives in `client/src/api/`: `authSession.ts` (`currentUser`), `fileSession.ts`
(`currentFile` — the open file *this* session has unlocked — plus the dialog/alert signals and the
new/open/unlock/close/upload calls), and `sessionRecovery.ts` (reacts to `unauthenticated` / `no-file-open` /
`file-locked` from any call). `App.tsx` boots by asking the server who's signed in and what's open, and its
guard routes a signed-out session to `/login?next=…` and a file-less one back to `/`.

**Static serving**: `static.ts` serves `CHECQUERY_STATIC_DIR` with an SPA fallback (any non-API GET that isn't a
file gets `index.html`), hashed `/assets/*` cached immutably, `index.html` uncached. In dev, Vite serves the
client and proxies `/api` instead.

**Styling**: Tailwind CSS v4 is wired in via the `@tailwindcss/vite` plugin in `packages/client/vite.config.ts`
(no separate `tailwind.config.js`/PostCSS config needed for v4). `packages/client/src/app.css` starts with
`@import "tailwindcss";` followed by the app's existing hand-written CSS.

**Docker**: `Dockerfile` (multi-stage on `oven/bun:1.3-slim`; the runtime stage has only the server's
production dependencies plus the built client, runs the TypeScript server directly as the non-root `bun` user,
exec-form CMD so SIGTERM reaches Bun) and `docker-compose.yml` (named `checquery-data` volume at `/data`). The
server itself speaks plain HTTP and publishes no port; the compose file's `caddy` service (`deploy/Caddyfile`)
is the only published port (localhost:8443 by default) and terminates TLS with certificates from Caddy's own
local CA (`tls internal`), whose root lives in the `caddy-data` volume — keep it, or every client has to
re-install a new root. `deploy/README.md` has the client root-certificate setup and the CA notes. The server
detects HTTPS per request (`requestProtocol.ts`, honoring `X-Forwarded-Proto` only under `trustProxy`) to mark
the session cookie `Secure` and to check CSRF Origins; HSTS is deliberately off (it would cover every port of
the hostname).

### Persistence: `LedgerStore` = `ActionLog` + `MaterializedStore`

One `LedgerStore` per open file (`packages/server/src/persistence/ledgerStore/`), combining two halves — full
detail in `tasks/done/action-log.md`, `tasks/done/materialized-store.md`, and `tasks/done/ledger-store.md`:

- **`ActionLog`** (`persistence/actionLog/`) — the durable, encrypted (unless test mode), append-only event log
  actually persisted to the `.checquery` file; migrations live under `actionLog/migrations/`.
- **`MaterializedStore`** (`persistence/materializedStore/`) — an in-memory `bun:sqlite` database holding only
  *current* entity state, rebuilt by replaying the `ActionLog` on file open; every `IXxxQrySvc` read and report
  query (e.g. `findAccountBalancesAsOf`, `findAccountBalancesForPeriod`) is answered from here, not the log.

Each entity's `XxxTeeSvc` (`packages/shared/src/crudServices/<entity>/`) fans a write out to both halves in
order — log first (mints the id/HLC), then the materialized store. `persistence/db.ts` owns the one open file
(module state: database, path, `LedgerStore`, `file_id`) and creating/opening/closing it; the HTTP layer passes
in the Origin identity. The client never touches persistence; it only sees the HTTP API.

### Client page map

Routes are registered in `packages/client/src/main.tsx` (`@solidjs/router`'s history-API `Router` — clean
URLs like `/register/<accountId>`, root `App`). `LoginPage.tsx` is `/login`; `HomePage.tsx`
(`src/pages/HomePage.tsx`) covers both the no-file-open and file-open states (info-architecture.md §3/§4);
every other page lives one subfolder per feature under `src/pages/<feature>/` (`accounts`, `balancesheet`,
`incomestatement`, `register`, `incomelog`, `expenselog`, `vendors` and `budget` — the last still a stub; there
is no `cashflow` page — see Project state above). Shared, non-page-specific components live in
`src/components/` (`nav/` for the breadcrumb system, `reports/` for `CategoryRollupTable` — shared by the
balance sheet and income statement — `files/` for the Open File dialog and its password step, and one folder
per feature otherwise). Pure, unit-tested view-shaping logic (building a register's line items, a balance
sheet's category rollup, etc.) lives in `src/<feature>/` *outside* `components/`, deliberately decoupled from
rendering — see `tasks/done/info-architecture.md` and any `tasks/done/*-implementation-plan.md` §0 for the
reasoning repeated across passes.
