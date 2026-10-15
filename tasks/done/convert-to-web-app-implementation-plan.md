# Convert Checquery to a Regular Web App — Implementation Plan

Branch: `feature/web-app`. All implementation commits land there; it merges to `main` once every phase
below is green. After the merge there is one architecture only: the web app. The Electrobun desktop app is
gone.

Status: **implemented** (2026-10-15, branch `feature/web-app`, one commit per phase) -- as planned, except
for the divergences listed in "Implementation notes" directly below. The decisions in §2 were answered by the
user on 2026-10-15, and the §2.1 choices were confirmed the same day. Where an answer changed
the original recommendation, the affected sections were redesigned. §2.1 lists the few smaller choices made
while folding those answers in; they're easy to revisit during implementation.

## Original task (`tasks/todo/convert-to-web-app.md`, deleted when this plan was filed)

> * Use a feature branch for this work.
> * Convert Checquery from Electrobun to a regular web app.
> * The server side should be Bun plus Hono and Zod plus Bun SQLite.
> * Client side should use as much as possible of the existing Electrobun web view code.
> * The server reads from a SQLite file as now, just it is kept on the server.
> * In the past Checquery used a web app architecture. The Git history may be of benefit.
> * The new codebase should be a monorepo with client, server, and shared subsystems.
> * The client code is served from the server as static content.
> * The deployable package is fully Dockerized with a volume used to keep the SQLite data persistent
>
> - Create an implementation plan side by side with this task file.
> - Make the plan very detailed for this significant refactoring
> - Include open questions and decision points in the plan


## Implementation notes (where the build diverged from the plan below)

- **Server file layout.** The entity routes share one module, `routes/entityRoutes.ts`, rather than one file
  per entity, and `/api/config` lives in `routes/fileRoutes.ts`. `requireLogin`, `requireUnlockedFile`,
  `serializeMutations`, and the password rate-limit wrapper share `middleware/auth.ts`. Activity tracking for
  idle-close is folded into `requireLogin`, so there's no `touchActivity.ts`. New small modules: `serverState.ts`
  (per-process state), `httpError.ts`, `honoEnv.ts`, `idleClose.ts`, and `middleware/mutex.ts`.
- **No `hono/bun` helpers.** Hono 4.13 deprecates `serveStatic`/`getConnInfo` from `hono/bun`, so `static.ts`
  is a small `Bun.file` handler (with the SPA fallback) and `clientIp.ts` calls Bun's `server.requestIP`
  directly.
- **Password hashes may be base64-encoded, and `hash-password` prints that form.** §5.7/Phase 5 expected
  escaping or quoting to work. In fact Bun's `.env` loader expands `$name` even inside single quotes, while
  Compose wants `$$`, so no single escaping of a raw `$argon2id$...` hash works for both. The plan's fallback
  was a separate `..._B64` variable; it ended up as the same variable, auto-detected: a value starting with `$`
  is a raw hash, anything else is decoded as base64.
- **`currentFile` didn't gain an `unlocked` field.** It keeps its old type and means "the open file *this*
  session has unlocked". A file that's open but locked for this session shows up instead as the Open File
  dialog's unlock step. That kept every existing test that sets `currentFile` unchanged.
- **No `pendingRedirect` signal.** `sessionRecovery.ts` just clears the user/file signals, and `App.tsx`'s
  guard effect, which already sends signed-out sessions to `/login?next=` and file-less ones home, does the
  navigation. A separate redirect signal would have raced the `?next=` redirect.
- **The Electrobun entry point was deleted in Phase 3, not renamed.** The handler signature change broke it
  anyway (D16). Electrobun itself was removed in Phase 4 as planned.
- **"No file open" moved out of the handler tests.** The handlers no longer read module state. The
  `rejects ... when no file is open` handler tests became HTTP tests of `requireUnlockedFile` (409/403).
- **`unwrapVoid`.** Body-less 204 responses infer as `unknown` through `hc`, so mutations use a small
  `unwrapVoid` helper. Every entity *read* casts back to the branded domain type at the wrapper boundary (§4.2's
  anticipated fallback).
- **CSRF in practice.** Hono's `csrf()` checks `Sec-Fetch-Site`/`Origin` for form-like and body-less non-GET
  requests. Browsers always pass; a non-browser client (e.g. `curl -X POST .../api/file/close`) must send
  `Origin` or `Sec-Fetch-Site: same-origin`. A rejection is `403 forbidden`.
- **Small additions:**
  - `CHECQUERY_HOST_PORT` in compose (the host's port 3000 may be taken);
  - a commented `TZ` in compose, since backup names use local time and the container defaults to UTC;
  - the Vite dev proxy follows `CHECQUERY_PORT`;
  - the Open File dialog's file list also offers "New file…";
  - an unencrypted (test-mode) unlock is a one-click confirmation.
- **Type-check cost (§5.1 concern).** `tsc -p packages/client` takes about 12s and 1.5M type instantiations,
  against about 5s for the server. Swapping in `hc<any>` barely changes that, so the cost is the client program
  also checking the server sources reachable from `AppType`, not `hc` inference itself. The documented
  mitigation (pre-emitting `.d.ts` for `appType.ts`) wasn't applied; revisit if editor latency bothers.
- **Verification.**
  - Tests: 1089 → 1258 (shared 697, server 334, client 227), all passing; `bun run typecheck` clean.
  - End-to-end: a headless-Chrome script (puppeteer-core, kept out of the repo) ran the Phase 4.5 flow twice,
    against `bun run start` and against the Docker container. It covered:
    - sign-in redirect and wrong-login error;
    - create, then every page by clean URL, then refresh on a deep link;
    - File Info;
    - second-user unlock with a wrong and then the right password;
    - close, after which the other session falls back home;
    - reopen via the list and password;
    - logout.
  - Docker: `docker compose stop` produces the shutdown backup, data survives `down`/`up`, and the image is
    about 262 MB.
  - Not exercised: uploading a real *desktop* `.checquery` file (the UI and validation are covered with
    generated files); try it with one of yours.

---

## 0. Summary

Today Checquery is an Electrobun desktop app. A Bun main process (`src/bun/`) owns the one open
`.checquery` SQLite file and answers typed RPC requests (`AppSchema` in `src/shared/rpc.ts`) from a SolidJS
webview (`src/mainview/`). The conversion keeps essentially all of the domain, persistence, and UI code. It
replaces:

- the **transport**: Electrobun RPC becomes HTTP/JSON via Hono, called from the client through Hono's typed
  `hc` client;
- the **host-native bits**: OS file dialogs, window title, quit, and server-pushed messages;

and it adds:

- **user login**: up to two configured users;
- **file upload**: to bring existing desktop files onto the server;
- **idle auto-close** of the open file.

The result is a Bun workspace monorepo:

```
packages/
  shared/   ← src/shared/            (domain schemas, CRUD service interfaces, API request schemas/types)
  server/   ← src/bun/               (Hono app, auth, handlers, persistence stack, static file serving)
  client/   ← src/mainview/          (SolidJS SPA, built by Vite, served by the server as static files)
Dockerfile, docker-compose.yml       (one image: server + built client; `/data` volume holds .checquery files)
```

These move **unchanged**:

- the persistence stack (`ActionLog` + `MaterializedStore` = `LedgerStore`), migrations, encryption codecs,
  and backups;
- the `XxxTeeSvc` layer.

The per-entity `handleXxx` functions keep their logic. They gain an explicit `session` argument (§4.6). The
mainview's `xxxClient.ts` wrappers keep their exact public signatures, so the roughly 40 page and component
tests that `mock.module` them keep working untouched.

### What is genuinely Electrobun-specific today (the full blast radius)

Found by grepping for `electrobun`, `rpc`, `Utils.`, `BrowserWindow`:

| File | Electrobun dependency | Web-app replacement |
|---|---|---|
| `src/bun/index.ts` | `BrowserWindow`, `BrowserView.defineRPC`, `Updater` (dev-server probe) | `packages/server/src/index.ts`: Hono app + `Bun.serve` |
| `src/bun/fileLifecycle.ts` | `Utils.openFileDialog` (folder/file pickers), `window.setTitle/activate/on("focus")`, server→client `rpc.request.promptNewFileName/promptPassword`, `rpc.send.fileOpened/showFileInfo/showError` | Client-driven request/response flows over a server-side data directory (§4.5) |
| `src/shared/rpc.ts` | `RPCSchema` type; the `AppSchema` request/message map | `packages/shared/src/api/`: params/payload types become Zod schemas + `z.infer` types with the same names; `AppSchema` deleted |
| `src/mainview/rpc.ts` | `Electroview`, `defineRPC`, handler-side prompt promises | `packages/client/src/api/`: typed `hc` client + `fileSession.ts`/`authSession.ts` signals (§5.2) |
| `src/mainview/*Client.ts` (5 files) | `rpc.request.*` | `hc` calls, same exported signatures |
| `NewFileModal.tsx`, `PasswordModal.tsx`, `FileInfoModal.tsx`, `ErrorAlertModal.tsx`, `HomePage.tsx`, `FileBreadcrumb.tsx`, `EditableAccountRow.tsx`, `EditableAccountCategoryRow.tsx`, `EditableVendorRow.tsx` | import signals/`request*` functions from `./rpc` | import from `api/fileSession.ts`; modals become client-initiated (§5.4) |
| `main.tsx` | `HashRouter` (not Electrobun, but tied to the `views://` URL scheme) | `Router` (history API), D11 |
| `test/setup.ts` | stubs `window.__electrobun` | stub removed |
| `electrobun.config.ts`, `package.json` scripts/deps, `build/` | Electrobun build | deleted |

Everything else is transport-agnostic already:

- server side: `persistence/**`, `*Handlers.ts` (except the session argument), `currentSession.ts`,
  `backup.ts`, `encryptionMode.ts`;
- shared: `shared/domain/**`, `shared/crudServices/**`;
- client: every page, component, and view-shaping module in `mainview/`.

### Prior art in git history

Before `6929739` ("Moved original version to archive folder") the repo *was* a Bun workspace web app:

- `client/`, `server/`, `shared/` workspaces;
- Hono 4.12.9, `@hono/zod-validator` 0.7.6, and Zod 4;
- per-entity `shared/src/routes/*Routes.ts` (Hono sub-apps taking an `IXxxSvc`);
- a `zxValidator` wrapper that turned Zod failures into `HTTPException(400)`;
- client-side `XxxClientSvc` classes using Hono's typed `hc<Routes>()` client, which is the same choice
  made here (D10).

Worth reusing (view with `git show 6929739^:<path>`):

- `package.json`: root workspaces + `trustedDependencies: ["@tailwindcss/oxide"]`.
- `shared/src/routes/validation/zxvalidator.ts`: reuse almost verbatim.
- `shared/src/routes/accounts/AccountRoutes.ts`: the chained route-module shape that keeps `hc` inference
  working.
- `client/src/clients/accounts/AccountClientSvc.ts`: the `hc` call pattern and its `res.ok` / error-body
  handling.
- `client/public/checquery.svg`: revived as the favicon (Q2).

Deliberately **not** reused:

- PGLite in the browser;
- WebSocket broadcast/replay;
- the YAML event log;
- the two-origin (`localhost:3000`/`3001`) CORS setup. This app is server-authoritative, with the client
  served from the same origin.

---

## 1. Goals / non-goals

**Goals**
1. A Bun + Hono + Zod + `bun:sqlite` server. `.checquery` files live on the server, in a Docker volume.
2. The client reuses the existing SolidJS mainview code with the minimum of change.
3. A monorepo with `client`, `server`, and `shared` subsystems (Bun workspaces).
4. The client is built by Vite and served by the server as static content. Same origin, so no CORS.
5. One Docker image. The `/data` volume persists the SQLite files and their `backups/`.
6. The existing test suite (about 1168 tests) keeps passing, relocated. New tests cover the HTTP and auth
   layers.
7. Electrobun is fully removed.
8. App-level login for up to two configured users (D5).
9. Upload of an existing `.checquery` file into the data directory (D4.1).

**Non-goals (this pass)**
- More than one open file at a time (D3). The two users share the one open file.
- Real-time sync across browser tabs: no WebSockets or SSE (D9).
- HTTPS inside the container. A later task (D5.3); see §11 Follow-ups.
- Changing the persistence format. The `.checquery` file format, migrations, and encryption are untouched,
  so existing files open as-is once uploaded or copied into the data volume.
- Fixing items from `tasks/todo/code-review-2026-08-05.md`, except where they're forced (noted inline).
- Export/import (`tasks/todo/export-import.md`); see §10 for how this plan affects it.

---

## 2. Decisions (answered 2026-10-15)

| # | Decision | Answer | Notes |
|---|---|---|---|
| D1 | Monorepo layout | `packages/{client,server,shared}`, names `@checquery/client\|server\|shared` | |
| D2 | How client/server import shared | `shared` is a real workspace package with `"exports": { "./*": "./src/*.ts" }`; imports become `@checquery/shared/domain/...` | ~550 import rewrites by codemod (Phase 1) |
| D3 | Server state | One open file per server process, shared by every browser/user | Client asks the server what's open on every page load (§5.2) |
| D4 | File location | One flat server-side data dir (`CHECQUERY_DATA_DIR`). Open lists the `*.checquery` files in it; New takes a name (+ password). No paths from the client | |
| D4.1 | Upload existing files | **Yes, in this pass** | §4.5 "Upload" |
| D5 | Access control | **App-level login, two configurable users** (not the file-password-as-gate I'd recommended) | Login is required before *anything*, including the file list. Then the encrypted file's own password is still needed to open/unlock it. §4.3 |
| D5.1 | File list visible pre-auth? | No. Login comes first | |
| D5.2 | Second browser while a file is open | Must **unlock** with the file password (per login session) | §4.5 "Unlock" |
| D5.3 | TLS | Plain HTTP now; **HTTPS is a later task** | §11 Follow-ups |
| D6 | Idle auto-close of the open file | **Yes, default 60 minutes** (`CHECQUERY_IDLE_CLOSE_MINUTES`, `0` = off) | Closes with backup |
| D7 | "Exit the Program" button | Remove (+ `quitApp`) | |
| D8 | Origin (audit who/where) | (user name, client IP) | User name is now the **logged-in user's name** (§2.1 A1) |
| D9 | Live updates across tabs | None; pages refetch after their own mutations as now | |
| D10 | API client style | **Hono typed `hc<AppType>()` client**, to keep client and server in sync | §4.2, §5.1 |
| D11 | Router | **History-API `Router`** (clean URLs), with SPA fallback on the server | §4.8, §5.3 |
| D12 | Backups | Also back up on SIGTERM and idle-close; backups stay in `<dataDir>/backups/`; no retention policy yet | |
| D13 | Config | Env vars validated by Zod at startup, fail-fast; Bun's automatic `.env` loading in dev, compose `environment:` in Docker | Table in §4.1 |
| D14 | Docker base image | `oven/bun:1.3-slim` | Tag follows `mise.toml` (Q3) |
| D15 | SQLite journal mode | Unchanged (rollback journal) | Volume must be local storage, not NFS/SMB |
| D16 | Keep desktop app working? | No; one architecture after merge | |
| D17 | Back up on implicit close (opening another file while one is open) | Yes | |
| D18 | Rate-limit password attempts | Yes; login, file open, and unlock | |
| D19 | Docker volume default | Named volume; bind-mount example in comments | |
| Q1 | Default dev data dir | `./data` (already gitignored) | |
| Q2 | Favicon | Yes; revive `checquery.svg` from history | |
| Q3 | Commit `mise.toml` | Yes; it's the source of truth for the Bun version and Docker tag | |
| Q4 | Special deployment target | None | |
| Q5 | Test mode (`CHECQUERY_ENCRYPTION_DISABLED=true`) in production | Refused at startup when `NODE_ENV=production` unless `CHECQUERY_ALLOW_TEST_MODE=true` | |

### 2.1 Choices made while revising (confirmed by the user 2026-10-15)

- **A1. Origin name = logged-in username.** D8's original design took the name from a
  `CHECQUERY_USER_NAME` env var because there was no login. With D5(b), the logged-in user is the natural
  "who", so that env var is dropped. Usernames must pass `nameSchema` (checked at startup).
- **A2. Credentials are configured as password *hashes*, not plaintext.** The hashes are argon2id, via
  `Bun.password.hash`. They go in `CHECQUERY_USER1_NAME` / `CHECQUERY_USER1_PASSWORD_HASH` and
  `CHECQUERY_USER2_NAME` / `CHECQUERY_USER2_PASSWORD_HASH`. User 1 is required and user 2 is optional. A
  `bun run hash-password` script produces the hash. No user management UI; changing a password means
  changing the env and restarting.
- **A3. Login sessions** live in memory, in an HttpOnly, `SameSite=Strict` cookie. They expire after
  `CHECQUERY_LOGIN_IDLE_MINUTES` (default 480 = 8h) of inactivity. A server restart logs everyone out (and
  closes the file, as it always has).
- **A4. Custom login page, not the browser's Basic-auth popup.** This allows a real Logout, inline errors,
  and rate limiting.
- **A5. Upload limits.** Maximum size `CHECQUERY_MAX_UPLOAD_MB` (default 200). No overwrite of an existing
  file. Rejected if the uploaded file's `file_id` matches a file already in the data dir: two diverging
  copies of the same file sharing a `node_id` would make their HLCs ambiguous.
- **A6. Logout doesn't close the file.** The other user, or another tab, may be using it. Close File
  closes it for everyone.

---

## 3. Target repository layout

```
/                                   (repo root)
  package.json                      private; workspaces: ["packages/*"]; trustedDependencies; root scripts (§7.1)
  bun.lock
  tsconfig.base.json                shared compilerOptions (today's tsconfig.json minus jsx)
  Dockerfile
  docker-compose.yml
  .dockerignore
  mise.toml                         committed (Q3)
  CLAUDE.md                         rewritten Commands/Architecture sections (§9)
  documentation/functional-spec.md  unchanged
  tasks/                            unchanged
  data/                             gitignored; default dev CHECQUERY_DATA_DIR (Q1)
  packages/
    shared/
      package.json                  @checquery/shared; exports "./*": "./src/*.ts"; deps: zod, @paralleldrive/cuid2
      tsconfig.json                 extends base; no DOM lib, no bun types
      src/
        domain/**                   ← src/shared/domain/** (unchanged)
        crudServices/**             ← src/shared/crudServices/** (unchanged)
        util/Assertions.ts          ← src/shared/util/
        encryptionMode.ts           ← src/shared/encryptionMode.ts
        api/
          fileApi.ts                ← FileOpenedPayload/FileInfoPayload from rpc.ts (adapted, §4.5) + file name/new/open/unlock body schemas + FileListEntry
          authApi.ts                NEW: login body schema, Me payload
          accountsApi.ts            ← CreateAccountParams/PatchAccountParams → Zod schemas + same-named z.infer types
          accountCategoriesApi.ts   ← ditto
          vendorsApi.ts             ← ditto
          transactionsApi.ts        ← ditto (+ query schemas for date ranges / latest-for-vendor)
          balanceAssertionsApi.ts   ← ditto
          apiError.ts               NEW: ApiErrorBody type + ApiErrorCode union (§4.4)
    server/
      package.json                  @checquery/server; exports { "./appType": "./src/appType.ts" } (type-only, for hc);
                                    deps: hono, @hono/zod-validator, zod, @paralleldrive/cuid2, @checquery/shared
      tsconfig.json                 extends base; types: ["bun"]
      scripts/hashPassword.ts       NEW (A2)
      src/
        index.ts                    NEW: config → app → Bun.serve; signal handlers; idle-close timer (§4.1)
        config.ts                   NEW: env parsing (§4.1)
        app.ts                      NEW: createApp(deps) → chained Hono app (testable via app.request())
        appType.ts                  NEW: `export type AppType = ReturnType<typeof createApp>` (only thing the client imports, type-only)
        middleware/
          errorHandler.ts           NEW: app.onError → ApiErrorBody (§4.4)
          zxValidator.ts            ← adapted from git history
          requireLogin.ts           NEW (§4.3)
          requireUnlockedFile.ts    NEW (§4.3)
          csrfGuard.ts              NEW (§4.3)
          serializeMutations.ts     NEW: async mutex for writes (§4.7)
          rateLimit.ts              NEW (D18)
          touchActivity.ts          NEW: idle-close + login-idle bookkeeping (D6, A3)
        routes/
          authRoutes.ts             NEW
          fileRoutes.ts             NEW (wraps fileLifecycle.ts + upload)
          accountRoutes.ts          NEW (wraps accountHandlers.ts)
          accountCategoryRoutes.ts  NEW
          vendorRoutes.ts           NEW
          transactionRoutes.ts      NEW
          balanceAssertionRoutes.ts NEW
          balanceRoutes.ts          NEW (balances as-of / for-period)
        static.ts                   NEW: serveStatic + SPA fallback (§4.8)
        clientIp.ts                 NEW (D8)
        auth/
          users.ts                  NEW: configured users + Bun.password.verify
          loginSessions.ts          NEW: token → { username, lastSeenMs, unlock: { fileId, origId } | null }
        handlers/                   ← src/bun/*Handlers.ts (logic unchanged; gain `session` param, §4.6)
        session/currentSession.ts   ← src/bun/currentSession.ts (adapted, §4.6)
        fileLifecycle.ts            ← src/bun/fileLifecycle.ts, REWRITTEN (§4.5)
        fileUpload.ts               NEW (§4.5)
        encryptionMode.ts           ← src/bun/encryptionMode.ts (unchanged)
        persistence/**              ← src/bun/persistence/** (db.ts adapted, §4.6; everything else unchanged)
      test/                         NEW HTTP-level tests (§7.3); existing *.test.ts stay co-located
    client/
      package.json                  @checquery/client; deps: solid-js, @solidjs/router, hono (client only), @checquery/shared;
                                    devDeps: @checquery/server (types), vite, plugins, tailwind, testing libs, @types/bun
      tsconfig.json                 extends base; jsx preserve + jsxImportSource solid-js; lib DOM; types ["bun"] (§5.1)
      bunfig.toml                   [test] preload = ["./test/setup.ts"]
      vite.config.ts                ← root vite.config.ts; dev proxy /api → server (§5.7)
      index.html                    ← src/mainview/index.html (+ favicon link)
      public/checquery.svg          ← revived from git history (Q2)
      src/                          ← src/mainview/** (minus rpc.ts; plus api/ and LoginPage)
        api/
          apiClient.ts              NEW: hc<AppType> instance + unwrap()/ApiError (§5.1)
          authSession.ts            NEW (§5.2)
          fileSession.ts            NEW, replaces most of rpc.ts (§5.2)
        pages/LoginPage.tsx         NEW (§5.4)
        components/files/OpenFileModal.tsx   NEW (§5.4)
      test/
        setup.ts                    ← test/setup.ts minus the __electrobun stub
        renderPage.tsx              ← test/renderPage.tsx
```

Deleted outright:

- `electrobun.config.ts`;
- `src/bun/index.ts` (replaced);
- `src/mainview/rpc.ts` (replaced);
- `src/shared/rpc.ts` (split into `api/`);
- root `vite.config.ts` (moved);
- root `bunfig.toml` (per-package now);
- `build/` and `dist/` (gitignored artifacts; the client build output is now `packages/client/dist`).

---

## 4. Server design

### 4.1 Entry point and config

`packages/server/src/index.ts`:

```ts
const config = loadConfig(process.env)          // Zod-parsed; on error: console.error(message) + process.exit(1)
const app = createApp({ config })               // pure factory, no listening — tests use app.request()
const server = Bun.serve({ hostname: config.host, port: config.port, fetch: app.fetch,
                           maxRequestBodySize: config.maxUploadBytes })
console.log(`Checquery listening on http://${config.host}:${config.port} (data dir ${config.dataDir})`)

startIdleCloseTimer(config)                     // every 60s: if a file is open and idle ≥ N min → closeWithBackup("idle")
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => { closeWithBackup("shutdown"); server.stop(); process.exit(0) })
}
```

`closeWithBackup(reason)` is the one close path. Explicit Close, implicit close-on-open (D17), idle-close
(D6), and shutdown (D12) all use it. It closes the db, takes the backup, logs the reason, and clears every
login session's `unlock`. A backup failure is logged. On shutdown it never blocks exit.

`config.ts`: one Zod schema over `process.env`. Startup also checks:

- `dataDir` exists and is writable (`accessSync(W_OK)`). This is the likeliest Docker misconfiguration.
- At least user 1 is configured.
- Usernames are distinct and pass `nameSchema`.
- Each hash looks like an argon2/bcrypt PHC string.
- Q5: test mode in production is refused unless `CHECQUERY_ALLOW_TEST_MODE=true`.

| Var | Default | Notes |
|---|---|---|
| `CHECQUERY_PORT` | `3000` | |
| `CHECQUERY_HOST` | `127.0.0.1` (Dockerfile sets `0.0.0.0`) | bind address |
| `CHECQUERY_DATA_DIR` | `./data` (dev); `/data` (Docker) | must exist & be writable |
| `CHECQUERY_STATIC_DIR` | `<server pkg>/../client/dist`; `/app/public` (Docker) | built client |
| `CHECQUERY_ENCRYPTION_DISABLED` | unset | unchanged semantics (test mode) |
| `CHECQUERY_ALLOW_TEST_MODE` | `false` | Q5: needed to run test mode with `NODE_ENV=production` |
| `CHECQUERY_USER1_NAME` / `CHECQUERY_USER1_PASSWORD_HASH` | required | A2 |
| `CHECQUERY_USER2_NAME` / `CHECQUERY_USER2_PASSWORD_HASH` | optional (both or neither) | A2 |
| `CHECQUERY_LOGIN_IDLE_MINUTES` | `480` | A3 |
| `CHECQUERY_IDLE_CLOSE_MINUTES` | `60` | D6; `0` disables |
| `CHECQUERY_TRUST_PROXY` | `false` | D8: honor `X-Forwarded-For` |
| `CHECQUERY_MAX_UPLOAD_MB` | `200` | A5 |

`resolveEncryptionMode` keeps its current fail-fast behavior and error text, now called from `loadConfig`.

### 4.2 Route map

Everything is JSON and under `/api`. Routes are written in Hono's **chained** style, as sub-apps mounted
with `.route()`, and every response is returned via `c.json(data, status)` or `c.body(null, 204)`. That's
what lets `hc` infer request and response types (D10). Bodies and queries are validated with the Zod
schemas from `@checquery/shared/api/*`.

Auth column: **—** = public; **L** = requires login; **U** = requires login *and* that this login session
has unlocked the currently open file (§4.3).

| Old RPC request | Method + path | Auth | Body / query | Response |
|---|---|---|---|---|
| *(new)* | `GET /api/health` | — | | `{ ok: true }` (Docker healthcheck) |
| *(new)* | `POST /api/auth/login` | — | `{ username, password }` | `{ username }` + Set-Cookie; 401 / 429 |
| *(new)* | `POST /api/auth/logout` | L | | 204 + cookie cleared |
| *(new)* | `GET /api/auth/me` | — | | `{ username } \| null` (client boot) |
| *(new; replaces `encryptionMode` param on `promptNewFileName`)* | `GET /api/config` | L | | `{ encryptionMode, maxUploadBytes }` |
| *(new)* | `GET /api/files` | L | | `{ name, sizeBytes, lastModifiedIso }[]` |
| *(new, D4.1)* | `POST /api/files` | L | multipart, field `file` | `FileListEntry` (201); 400/409/413/422 |
| *(new; replaces `fileOpened` push)* | `GET /api/file` | L | | `{ fileId, name, path, unlocked } \| null` |
| `startNewFile` + `promptNewFileName` | `POST /api/file/new` | L | `{ name, password? }` | `FileOpenedPayload` |
| `startOpenFile` + `promptPassword` | `POST /api/file/open` | L | `{ name, password? }` | `FileOpenedPayload` |
| *(new, D5.2)* | `POST /api/file/unlock` | L | `{ password? }` | `FileOpenedPayload` |
| `getFileInfo` (+ `showFileInfo` push) | `GET /api/file/info` | U | | `FileInfoPayload` |
| `closeFile` | `POST /api/file/close` | U | | `{ closed: boolean; backupError?: string }` |
| `quitApp` | *(removed, D7)* | | | |
| `findAccountsAll` | `GET /api/accounts` | U | | `Account[]` |
| `createAccount` | `POST /api/accounts` | U | `CreateAccountParams` | 204 |
| `patchAccount` | `PATCH /api/accounts/:id` | U | `PatchAccountParams` minus `id` | 204 |
| `deleteAccount` | `DELETE /api/accounts/:id` | U | | 204 |
| `isAccountInUse` | `GET /api/accounts/:id/in-use` | U | | `{ inUse: boolean }` |
| account-category find/create/patch/delete/inUse | same shapes under `/api/account-categories` | U | | |
| vendor find/create/patch/delete/inUse | same shapes under `/api/vendors` | U | | |
| `findTransactionsByAccount` | `GET /api/accounts/:id/transactions` | U | | `Transaction[]` |
| `findLatestTransactionForVendorAndAccount` | `GET /api/transactions/latest?vndrId=&accountId=` | U | | `Transaction \| null` |
| `findTransactionsForPeriod` | `GET /api/transactions?startDate=&endDate=` | U | | `Transaction[]` |
| `createTransaction` | `POST /api/transactions` | U | `CreateTransactionParams` | 204 |
| `patchTransaction` | `PATCH /api/transactions/:id` | U | `PatchTransactionParams` minus `id` | 204 |
| `deleteTransaction` | `DELETE /api/transactions/:id` | U | | 204 |
| `findAccountBalancesAsOf` | `GET /api/balances/as-of?date=` | U | | `AccountBalance[]` |
| `findAccountBalancesForPeriod` | `GET /api/balances/period?startDate=&endDate=` | U | | `AccountBalance[]` |
| `findBalanceAssertionsByAccount` | `GET /api/accounts/:id/balance-assertions` | U | | `BalanceAssertion[]` |
| `createBalanceAssertion` | `POST /api/balance-assertions` | U | `CreateBalanceAssertionParams` | 204 |
| `patchBalanceAssertion` | `PATCH /api/balance-assertions/:id` | U | `{ balance }` | 204 |
| `deleteBalanceAssertion` | `DELETE /api/balance-assertions/:id` | U | | 204 |

Notes:
- `isXxxInUse` returns `{ inUse }` so every JSON body is an object. The client wrapper unwraps it, so callers
  still get `Promise<boolean>`.
- Mutations return 204, because every current RPC mutation returns `void` and callers refetch. Returning the
  created entity would be a behavior change; leave it for later.
- **JSON shape parity.** Electrobun RPC already JSON-serializes, so response bodies are what pages receive
  today. At runtime, branded Zod types are plain strings and numbers. No `Date`, `bigint`, or `Map` crosses
  the boundary. Phase 3 verifies this by comparing a `GET /api/transactions` body with a direct
  `handleFindTransactionsForPeriod` result.
- **`hc` and branded types.** Hono's `JSONParsed<T>` may not preserve Zod brands (`string & BRAND<...>`)
  cleanly in the inferred response type. The client wrappers already declare explicit return types
  (`Promise<Account[]>`), so if inference mangles brands, the wrapper does `(await unwrap(res)) as Account[]`.
  That one cast per wrapper method sits at a trusted boundary. Phase 3 decides, per entity, whether the cast
  is needed. Request bodies are unaffected: they're plain `XxxParams` types.

### 4.3 Authentication, sessions, and CSRF (D5, D5.2, A2–A4, A6)

There are two layers, both tracked per **login session**:

1. **Login.**
   - `POST /api/auth/login` looks up the configured user by name and checks the password with
     `Bun.password.verify(password, hash)`. This is async, so it doesn't block the event loop.
   - To avoid user enumeration by timing, it always runs a verify, against a dummy hash for an unknown name.
   - On success it mints a 32-byte random token, base64url-encoded. The token is stored in `loginSessions`
     (`Map<token, LoginSession>`) and set as cookie `checquery_session`: `HttpOnly; SameSite=Strict;
     Path=/`. `Secure` is added later with HTTPS.
   - Any existing token is rotated on login.
   - `requireLogin` middleware: looks up the cookie, rejects with 401 `unauthenticated` if it's missing,
     unknown, or idle past `CHECQUERY_LOGIN_IDLE_MINUTES`, then updates `lastSeenMs` and sets
     `c.set("login", session)`.
2. **File unlock.**
   - `LoginSession.unlock` is `{ fileId, origId } | null`. It's set when this login session creates, opens,
     or unlocks the currently open file.
   - `requireUnlockedFile` middleware:
     - 409 `no-file-open` if no file is open;
     - 403 `file-locked` if `unlock` is null or its `fileId` doesn't match the open file;
     - otherwise sets `c.set("session", { store, origId })` for the handlers.
   - Every `closeWithBackup` clears `unlock` on **all** login sessions, so a stale tab can never write into a
     different file that was opened later.
   - Test mode (unencrypted files): open and unlock don't ask for a password, but login is still required.

**Origin per login session (D8/A1).**

- When a session creates, opens, or unlocks a file, the server calls
  `bootstrapOrigin(store, { name: login.username, ipAddress: clientIp(c) })` (the find-or-create logic that
  exists today, §4.6) and stores the resulting `origId` in `unlock`.
- So two users, or the same user on two machines, get distinct Origins. That's the correct audit behavior.
- `clientIp(c)` (`clientIp.ts`):
  - takes `getConnInfo(c).remote.address` (`hono/bun`), or the first `X-Forwarded-For` hop when
    `CHECQUERY_TRUST_PROXY=true`;
  - maps `::ffff:a.b.c.d` → `a.b.c.d` and `::1` → `127.0.0.1`;
  - maps any other IPv6 address → `0.0.0.0`, with a logged warning. `ipAddressSchema` is IPv4-only, and
    widening it is a domain change; see §11.
- Under Docker's default bridge network without a proxy, all clients appear as the bridge gateway. This is
  documented, not fixed.

**Rate limiting (D18).**

- An in-memory sliding window keyed by `clientIp` + route.
- `POST /api/auth/login`, `/api/file/open`, `/api/file/new`, and `/api/file/unlock` allow 5 failures per
  minute per IP, then answer 429 `rate-limited` with `Retry-After`.
- Only failures count. Successes reset the counter.

**CSRF.**

- `SameSite=Strict` already blocks cross-site cookie sending.
- On top of that, `csrfGuard` rejects non-GET `/api` requests with 403 if the `Origin` header is present
  and doesn't match the request's own host, using Hono's built-in `csrf()` middleware.
- No custom header is needed, which keeps `hc` calls plain.

**`hashPassword` script.** `bun run hash-password` reads a password twice from stdin (no echo) and prints
the `Bun.password.hash(pw, { algorithm: "argon2id" })` string, ready to paste into `.env` or compose.

### 4.4 Validation & errors

**Validation.**

- `zxValidator` (from git history) wraps `@hono/zod-validator` so every failure becomes a 400.
- Each `shared/api/*Api.ts` exports, for example:
  `createAccountParamsSchema = z.strictObject({ acctType: acctTypeSchema, parentCtgId: z.string(), name: z.string(), description: z.string().optional(), isPrimary: z.boolean().optional() })`
  and `export type CreateAccountParams = z.infer<typeof createAccountParamsSchema>`. **The exported type name
  and shape are identical** to today's hand-written type.
- These schemas validate *transport shape only*. Domain validation stays in the handlers' existing
  `xxxEventSchema.parse(...)` calls and is not duplicated.
- Use `.optional()` now, not `.nullable()`. Code-review Issue 1 (clearing optional fields) would later widen
  these, so §10 applies.

**Errors.** One `app.onError` maps exceptions to `ApiErrorBody = { error: string; code: ApiErrorCode }`:

| Thrown | Status | `code` |
|---|---|---|
| `HTTPException(400)` from zxValidator | 400 | `invalid-request` |
| `ZodError` from a handler's domain `.parse` | 400 | `invalid-request` (message = Zod's message, as today) |
| `NoFileOpenError` (typed replacement for `requireCurrentSession`'s `"No file open"`) | 409 | `no-file-open` |
| login missing/expired | 401 | `unauthenticated` |
| bad username/password | 401 | `bad-credentials` |
| file not unlocked by this session | 403 | `file-locked` |
| rate limit | 429 | `rate-limited` |
| `FileResult { ok:false, code }` from create/open | see right | `wrong-password`→401, `already-exists`→409, `not-a-checquery-file`/`unsupported-version`→422, `password-required`→400, `io-error`→500, `not-found`→404 (new), `invalid-name`→400 (new) |
| upload problems (§4.5) | 400/409/413/422 | `invalid-name`, `already-exists`, `duplicate-file-id`, `too-large`, `not-a-checquery-file`, `unsupported-version` |
| SQLite `UNIQUE constraint failed` | 409 | `conflict` |
| anything else | 500 | `internal` (logged server-side; generic message to client) |

The UI shows `e.message` from rejected calls in several places: `NewTransactionRow.tsx:131`,
`EditableTransactionRow.tsx:124,136`, and `BalanceAssertionEditDialog.tsx:29,41`. The client's `unwrap()`
throws `ApiError extends Error` with the server's message, so those `catch (e)` blocks work unchanged.
**Phase 3 check:** record what text Electrobun surfaced for handler throws today (e.g. a Zod failure inside
`handleCreateTransaction`) and keep the HTTP message equivalent. HTTP tests then assert it.

### 4.5 File lifecycle over HTTP (`fileLifecycle.ts` rewrite + `fileUpload.ts`)

Today's flows are server-driven. Bun opens a native dialog, then *calls into* the webview
(`promptNewFileName`, `promptPassword`) and *pushes* results (`fileOpened`, `showError`, `showFileInfo`).
Over HTTP they invert into client-driven request/response. `fileLifecycle.ts` exports plain functions taking
`(config, input, identity)`, with no Hono types, so it stays unit-testable. `routes/fileRoutes.ts` adapts
them to HTTP.

**File name rule** (shared `fileNameSchema` in `shared/api/fileApi.ts`):

- `^[A-Za-z0-9][A-Za-z0-9 _.-]{0,99}$`, after trimming;
- an optional trailing `.checquery` / `.checquery-test` is stripped (mirrors `normalizeCheqPath`);
- rejects `..`, `/`, `\`, NUL, and a leading `.`.

The server re-checks that `resolve(join(dataDir, name + ext))` is a direct child of `resolve(dataDir)`.

**List** (`GET /api/files`):

- `readdirSync(dataDir)` filtered to regular files with the current mode's extension, skipping dot-files
  (upload temp files) and the `backups/` dir;
- `statSync` for size and mtime;
- sorted by name.

**New file** (`POST /api/file/new { name, password? }`):

1. If a file is already open, back it up only after the new file is created successfully (D17), using the
   same capture-then-backup pattern as Open below.
2. `createNewFile(config.dataDir, name, password, encryptionMode, identity)`. The function is unchanged
   except for the identity parameter (§4.6). It already enforces password-required and already-exists.
3. On success, set `login.unlock = { fileId, origId }` and respond with `FileOpenedPayload`.

**Open file** (`POST /api/file/open { name, password? }`):

1. Resolve the path; 404 `not-found` if it doesn't exist.
2. If a file is already open, it's closed and backed up (D17), but only once the new file has opened
   successfully:
   - `openExistingFile` already calls `closeCurrent()` internally, and only on success. Keep that.
   - Capture `previous = getCurrentFile()` before the call, and back `previous` up right after a successful
     open.
   - A wrong password therefore leaves the current file open and untouched. New uses the same
     capture-then-backup-after-success pattern.
3. `openExistingFile(path, password, identity)`; unchanged apart from identity. In test mode the password is
   ignored.
4. Set `login.unlock`; clear every *other* session's `unlock` (they were unlocked for the previous file).
5. Note: `scryptSync` with `N=32768` blocks the event loop for about 100 ms. That's acceptable; §11
   follow-up.

**Unlock** (`POST /api/file/unlock { password? }`, D5.2):

1. 409 `no-file-open` if nothing is open.
2. Encrypted file: verify the password with `verifyPassword` from `crypto.ts` against the open file's meta,
   via a new `getCurrentFileVerifyMaterial()` accessor in `db.ts`. Test mode: no check.
3. Bootstrap or find this session's Origin, set `login.unlock`, and respond with `FileOpenedPayload`.

**Current file** (`GET /api/file`): `null`, or `{ fileId, name, path, unlocked }`, where `unlocked` reflects
*this* login session. The client calls it on boot and after login (§5.2).

**Info** (`GET /api/file/info`): `getCurrentFileInfo()`, unchanged, returned directly.

**Close** (`POST /api/file/close`): `closeWithBackup("explicit")`. Returns `{ closed, backupError? }`; the
client raises the "Backup Failed" alert that bun used to push.

**Upload** (`POST /api/files`, multipart, D4.1/A5):

1. `bodyLimit({ maxSize: config.maxUploadBytes })`, plus `Bun.serve`'s `maxRequestBodySize`. Over the limit
   is 413 `too-large`.
2. Name the file from the uploaded file's `name` (basename only). It must end with the current mode's
   extension; uploading `.checquery-test` is accepted only in test mode. Then apply the file name rule. A
   name that already exists is 409 `already-exists` (never overwrite).
3. Stream to `<dataDir>/.upload-<random>.tmp`. Same directory, so the final rename is atomic.
4. Validate *without migrating or writing*:
   - first 16 bytes are `"SQLite format 3\0"`;
   - `new Database(tmp, { readonly: true })`;
   - `metaTableExists` + `file_id` + `node_id` present, else 422 `not-a-checquery-file`;
   - `readSchemaVersion(db) <= latestKnownVersion`, else 422 `unsupported-version`;
   - the `encrypted` flag matches the extension's mode;
   - `file_id` is not already used by any file in the data dir, else 409 `duplicate-file-id` (A5). Cheap:
     open each listed file read-only and read one meta row.
   - Close the db.
5. `renameSync(tmp, final)`; on any failure `unlinkSync(tmp)`. Respond 201 with the new `FileListEntry`.
6. No password at upload time; the file's password is checked when it's opened. Migrations run then too, as
   they do for any open.
7. Runs under the mutation mutex (§4.7), so it can't race a New with the same name.

**Removed:** `reclaimWindowFocus`, `Utils.openFileDialog`, `window.setTitle` (replaced by `document.title`
on the client), the `AppRpc` type, and `quitApp`.

### 4.6 `persistence/db.ts`, `currentSession.ts`, and handler changes

1. **Identity.** Today `bootstrapCurrentOrigin(store)` reads `userInfo().username` and `localIpAddress()`.
   It becomes exported `bootstrapOrigin(store, identity: { name: string; ipAddress: string })`, with the same
   find-or-create logic, and `createNewFile` / `openExistingFile` gain an `identity` parameter.
   `localIpAddress()` and the `node:os` import are deleted. Tests pass a fixed identity, which also makes
   them deterministic (today they implicitly use the runner's username and IP).
2. **Origin moves out of `db.ts`.** `currentOrigId` is removed from the module state; origin now lives on
   the login session's `unlock` (§4.3). `db.ts` keeps `currentDb/currentPath/currentLedgerStore`, so D3 is
   still one open file. `createNewFile`/`openExistingFile` still return `origId`, for the opener's session.
3. **Handlers take a session.** `requireCurrentSession()` (no args, module state) becomes the
   `requireUnlockedFile` middleware's job. Each `handleXxx(params)` becomes
   `handleXxx(session: { store: LedgerStore; origId: OrigId }, params)`. The change is mechanical: every
   handler's first line `const { store, origId } = requireCurrentSession()` is replaced by the parameter.
   `currentSession.ts` shrinks to the `HandlerSession` type and `NoFileOpenError`. Handler tests build the
   session from the `createNewFile` result (`{ store: result.store, origId: result.origId }`).
4. Add `getCurrentFileVerifyMaterial()` (for Unlock) and `getCurrentFileId()`.
5. Nothing else in `persistence/` changes. `ActionLog`, `MaterializedStore`, `LedgerStore`, migrations,
   codecs, and `backup.ts` move verbatim.

### 4.7 Concurrency

Electrobun RPC from a single window effectively serialized user actions. HTTP from two users and several
tabs doesn't.

- `bun:sqlite` is synchronous, but the `TeeSvc` write path `await`s between the log append and the
  materialized-store write, so two mutations can interleave.
- More importantly, open, close, idle-close, or upload can race a write mid-tee.
- **`serializeMutations`** is a single in-process promise-chain mutex. It applies to every non-GET `/api`
  route except `/api/auth/*` (login doesn't touch the store), and to the idle-close timer and the shutdown
  handler.
- GETs stay concurrent. A GET racing a close fails cleanly with 409 `no-file-open`, because the handler
  reads the store reference once.
- About 15 lines, plus a test that fires overlapping POSTs and checks ordering.

### 4.8 Static client serving and SPA fallback (D11)

```ts
app.use("/assets/*", serveStatic({ root: config.staticDir, onFound: immutableCache }))  // hashed Vite assets
app.get("/checquery.svg", serveStatic({ path: join(config.staticDir, "checquery.svg") }))
app.all("/api/*", (c) => c.json({ error: "Not found", code: "not-found" }, 404))         // after API routes
app.get("*", serveStatic({ path: join(config.staticDir, "index.html"), onFound: noCache })) // SPA fallback
```

(`serveStatic` from `hono/bun`.)

- Any non-API GET gets `index.html`, so deep links and refreshes (e.g. `/register/acct...`) work. The client
  router then handles 404-ish paths.
- The login page is a client route (`/login`). There's no server-side redirect; the client decides from
  `GET /api/auth/me`.
- Static files are public; they contain no data.
- `secureHeaders()` (Hono built-in) with a CSP compatible with Vite output: `default-src 'self'`,
  `script-src 'self'`, and `style-src 'self' 'unsafe-inline'`, because Solid sets inline `style` attributes
  in places. Verify in Phase 4 and tighten if possible.
- `index.html`: `Cache-Control: no-cache`. `/assets/*`: `public, max-age=31536000, immutable`.

---

## 5. Client changes

### 5.1 `api/apiClient.ts` (D10)

```ts
import { hc } from "hono/client"
import type { AppType } from "@checquery/server/appType"
export const api = hc<AppType>("/", { init: { credentials: "same-origin" } })

export class ApiError extends Error { constructor(message: string, readonly code: ApiErrorCode, readonly status: number) { super(message) } }
export async function unwrap<T>(res: ClientResponse<T>): Promise<T>   // 204 → undefined; non-2xx → parse ApiErrorBody, notify lost-session handler (below), throw ApiError
```

- **Type-only cross-package import.** The client imports `type AppType` from `@checquery/server/appType`.
  `import type` is erased, so Vite never bundles server code. `tsc` *does* type-check the server's route
  chain when checking the client, which is why the client tsconfig needs `types: ["bun"]` (`@types/bun` is
  already a devDependency). `@checquery/server` is a client *devDependency*, for types only.
- **Type-check performance.** Hono warns that `hc` inference over many routes can get slow in editors. If
  `tsc -p packages/client` becomes noticeably slow, apply Hono's documented mitigation: emit `.d.ts` for
  `appType.ts` (`tsc --declaration --emitDeclarationOnly` into `packages/server/dist-types/`) and point the
  export there, or split into per-entity `hc` clients typed from each sub-app. Measure in Phase 4.
- **Lost-session handling** in `unwrap`:
  - 401 `unauthenticated`: clear auth and file signals, then navigate to `/login`.
  - 409 `no-file-open`: clear `currentFile`, navigate to `/`, and show "The file was closed (by another
    session, or after being idle)" via `setErrorAlert`.
  - 403 `file-locked`: set `currentFile.unlocked = false`, which shows the Unlock dialog.
  - Navigation from a non-component module: `unwrap` sets a `pendingRedirect` signal, and an effect in
    `App.tsx` calls `useNavigate()`. That keeps router history intact under the history-API router. It
    still throws afterwards, so callers' `finally` blocks run.

### 5.2 `api/authSession.ts` and `api/fileSession.ts` (replace `mainview/rpc.ts`)

`authSession.ts`:

- `currentUser` signal;
- `login(username, password)`, which returns an error message or null;
- `logout()`;
- `initAuth()`, which calls `GET /api/auth/me`.

`fileSession.ts` keeps the **same exported names** that pages import, so most import-site edits are just the
module path (`"../rpc"` → `"../api/fileSession"`):

| Export today (`rpc.ts`) | After |
|---|---|
| `currentFile`, `setCurrentFile` | kept; payload gains `unlocked`. An effect sets `document.title` (`displayName(file.name)` or `"Checquery"`), replacing `window.setTitle` |
| `fileInfo`, `setFileInfo` | kept |
| `errorAlert`, `setErrorAlert` | kept |
| `pendingPrompt` / `setPendingPrompt` (resolve-based) | replaced by `newFileDialogOpen` boolean signal |
| `pendingPasswordPrompt` / `setPendingPasswordPrompt` | replaced by `openFileDialog` signal: `{ step: "pick" } \| { step: "password", name } \| { step: "unlock", name } \| null` |
| `requestNewFile()` | opens the New File dialog |
| `requestOpenFile()` | opens the Open File dialog (which fetches the list) |
| `requestFileInfo()` | `GET /api/file/info` → `setFileInfo` (errors → `setErrorAlert`) |
| `requestCloseFile()` | `POST /api/file/close` → clear signals; `backupError` → "Backup Failed" alert |
| `requestQuitApp()`, `rpc` | removed |
| *(new)* `submitNewFile`, `submitOpenFile`, `submitUnlock` | call the POSTs. On success `setCurrentFile`. On `ApiError` return its message for inline display in the dialog |
| *(new)* `uploadFile(file: File)` | `POST /api/files` (multipart via `hc`'s `form`); returns entry or error message |
| *(new)* `encryptionMode` signal + `initFileSession()` | `GET /api/config` + `GET /api/file`; if open-but-locked → `openFileDialog({ step: "unlock" })` |

`App.tsx`'s side-effect `import "./rpc"` is removed.

### 5.3 Routing (D11) and boot sequence

`main.tsx`: `HashRouter` → `Router`. The routes themselves are unchanged, plus:

- `<Route path="/login" component={LoginPage} />`.

Things to re-verify under the history router:

- `/incomestatement/:period` → `Navigate href="./summary"` (relative navigate);
- `navigationHistory.ts`, whose doc comment says HashRouter; it's equally History-API-backed, so update the
  comment only;
- the `TopNav` Back/Forward tests.

Tests already use `MemoryRouter` (`test/renderPage.tsx`), so no test-harness change.

The boot sequence lives in `App.tsx`, the router root:

1. `initAuth()`.
2. Not logged in → navigate to `/login`, remembering the requested path as `?next=`.
3. Logged in → `initFileSession()`, then render children.
4. If the route needs a file and none is open, the pages already render empty/error states today. Keep
   them, but add a guard: any non-`/` and non-`/login` route with no open file redirects to `/`. That
   replaces the old guarantee that a fresh webview always started at `/`.

### 5.4 Component changes

- **`LoginPage.tsx`** (new):
  - username and password form in the same Tailwind modal style as `NewFileModal`;
  - inline `bad-credentials` / `rate-limited` messages;
  - on success, navigate to `next` or `/`.
- **Logout**: a "Signed in as *name* · Log out" line on `HomePage` (both hub states). Logout calls
  `POST /api/auth/logout` and navigates to `/login`.
- **`NewFileModal.tsx`**:
  - driven by `newFileDialogOpen()`;
  - the "Folder: …" line is removed;
  - `encryptionMode` comes from the config signal;
  - submit calls `submitNewFile`, with server errors (e.g. already-exists) shown inline;
  - the markup is otherwise reused.
- **`OpenFileModal.tsx`** (new): three steps.
  1. **pick**: the file list (name, size, modified; `formatBytes` is extracted from `FileInfoModal` into a
     shared util). It has an **"Upload a file…"** button: a hidden `<input type=file accept=".checquery">`
     → `uploadFile`, which refreshes the list and shows any error inline. When the list is empty it shows
     "No files yet — create one, or upload one from the desktop app".
  2. **password**: reuses the existing `PasswordModal.tsx`, refactored into a presentational
     `PasswordStep` component that keeps the tab trap and show/hide eyeball verbatim. Test mode skips this
     step.
  3. **unlock**: the same password step, titled "Unlock *name*", with a "Close this file instead" escape
     hatch.
  `PasswordModal.tsx` is otherwise retired.
- **`HomePage.tsx`**:
  - remove "Exit the Program" and `requestQuitApp` (D7);
  - the invisible spacer row in `NoFileHub` then has nothing below it, so remove it too, leaving a
    two-button row;
  - add the user/logout line;
  - update imports.
- **`FileInfoModal.tsx`**, **`ErrorAlertModal.tsx`**, **`FileBreadcrumb.tsx`**, **`EditableAccountRow.tsx`**,
  **`EditableAccountCategoryRow.tsx`**, **`EditableVendorRow.tsx`**: import path change only.
- **The five `xxxClient.ts` wrappers**: `rpc.request.foo(params)` becomes `hc` calls. **Signatures are
  unchanged.** Doc comments mentioning "bun-side"/RPC are updated. Example:
  ```ts
  findAccountsAll: async (): Promise<Account[]> => (await unwrap(await api.api.accounts.$get())) as Account[],
  patchAccount: async ({ id, ...rest }: PatchAccountParams): Promise<void> =>
    unwrap(await api.api.accounts[":id"].$patch({ param: { id }, json: rest })),
  isAccountInUse: async (id: string): Promise<boolean> =>
    (await unwrap(await api.api.accounts[":id"]["in-use"].$get({ param: { id } }))).inUse,
  ```
- **`index.html`**: add `<link rel="icon" href="/checquery.svg" type="image/svg+xml">`.
- No page, report, register, or view-shaping module changes beyond the `../../shared/...` →
  `@checquery/shared/...` import rewrite.

### 5.5 Behavior changes users will notice (for CLAUDE.md / release note)

1. Users sign in first (up to two configured users).
2. New/Open use the server's data folder, not any folder on disk. Existing desktop files are brought in with
   **Upload**.
3. Refreshing keeps the file open (it's server state). A server restart, Close, or 60 idle minutes close it.
4. Another browser, or the other user, must enter the file's password to work in an already-open file.
5. No Exit button; window title → browser tab title; clean URLs (`/register/...`).
6. Print uses the browser's print dialog (already `window.print()`).
7. The calculator's copy-to-clipboard works only on `localhost` until HTTPS lands (`navigator.clipboard`
   needs a secure context; the code already guards for it).

### 5.6 Tests touched on the client

- `HomePage.test.tsx`, `HomePage.crud.test.tsx`, `FileBreadcrumb.test.tsx`: new import path. The HomePage
  tests drop the Exit button and gain the logout line.
- New: `apiClient.test.ts` (unwrap: 204, error mapping, lost-session redirects; mock global `fetch`),
  `fileSession.test.ts`, `authSession.test.ts`, `LoginPage.test.tsx`, `OpenFileModal.test.tsx` (pick →
  password → submit; wrong password inline; test mode skips password; upload success and error),
  `NewFileModal.test.tsx` (server error inline).

### 5.7 Dev workflow

- `packages/client/vite.config.ts`: `server.proxy = { "/api": "http://127.0.0.1:3000" }`, port 5173.
  Vite's dev server already does history-API fallback.
- Root `bun run dev` = `concurrently`, running `bun --hot packages/server/src/index.ts` and Vite. Browse to
  `http://localhost:5173`. The cookie is same-origin from the browser's view because of the proxy.
- Dev users come from a gitignored `.env` at the server package or root (Bun auto-loads it). Add a
  committed `.env.example` with placeholder names and a note to run `bun run hash-password`.
- A production-like local run: `bun run build && bun run start` → `:3000`.

---

## 6. Phased implementation

Each phase ends with:

- the full suite green (`bun run test`);
- `bun run typecheck` clean;
- its own commit(s) on `feature/web-app`.

Mechanical moves come first so later diffs are reviewable. Record the baseline test count before Phase 1;
1089 as of 2026-10-15.

### Phase 1: Monorepo restructure, still Electrobun (no behavior change)

1. Move the code with `git mv` so history follows:
   - `src/shared` → `packages/shared/src`
   - `src/bun` → `packages/server/src`
   - `src/mainview` → `packages/client/src`
   - `test` → `packages/client/test`
   - `vite.config.ts` → `packages/client/`
   - also commit `mise.toml` (Q3).
2. Create the three `package.json`s and the root `package.json`. Move each dependency to the package that
   uses it; `electrobun` temporarily stays at the root until Phase 4. Run `bun install` and commit
   `bun.lock`.
3. Import codemod: a throwaway scratchpad script, not committed.
   - For every `.ts`/`.tsx` under `packages/{client,server}/src` (and `client/test`), resolve each relative
     specifier against the file's **original** location.
   - If it lands in `src/shared/X`, rewrite it to `@checquery/shared/X`.
   - Intra-shared imports stay relative.
   - Expect about 550 rewrites. Run tsc afterwards as the check.
4. tsconfigs:
   - `tsconfig.base.json` + per-package `tsconfig.json`;
   - client: `jsx`, `jsxImportSource`, `lib: ["DOM","ESNext"]`;
   - server: `types: ["bun"]`;
   - root `typecheck` script runs `tsc --noEmit -p` per package.
5. Test config: `packages/client/bunfig.toml` with the preload. The root `test` script runs each package
   (§7.2). **Verify early** that:
   - per-package `bunfig.toml` is picked up from the cwd;
   - client `mock.module` relative paths still resolve.
6. Point `electrobun.config.ts` at the new paths, so `bun run start` still launches the desktop app as a
   sanity check. If that's fiddly, skip it. The acceptance gate is tests + tsc; the desktop app is deleted
   in Phase 4.
7. Acceptance: same test count as baseline; tsc clean, apart from the known `three` error while electrobun
   remains.

### Phase 2: Shared API contract

1. Split `packages/shared/src/rpc.ts` into the `api/*.ts` modules (§3). Convert each `XxxParams` into a Zod
   schema + same-named `z.infer` type. Add `apiError.ts`, `fileApi.ts` (incl. `fileNameSchema`), and
   `authApi.ts`.
2. Keep a temporary `rpc.ts` that re-exports from `api/*` plus `AppSchema`, so Electrobun code still
   compiles until Phase 4.
3. Unit tests per schema:
   - accepts today's call shapes (examples lifted from the handler tests);
   - rejects unknown keys and wrong types;
   - `fileNameSchema` traversal and edge cases.

### Phase 3: Server

1. `bun add hono @hono/zod-validator` in `packages/server`.
2. `config.ts` + tests: defaults, each invalid value, user 2 half-configured, duplicate usernames, test mode
   in production (Q5).
3. `db.ts` identity threading. Move origin out of module state; add the handler `session` parameter and the
   new accessors (§4.6). Update the existing handler/db tests to match (mechanical).
4. `auth/*`, `middleware/*`, `clientIp.ts`, `scripts/hashPassword.ts`.
5. `fileLifecycle.ts` rewrite and `fileUpload.ts` (§4.5).
6. `routes/*`, `app.ts`, `appType.ts`, `static.ts`.
7. New `index.ts` (§4.1). Rename the Electrobun entry to `electrobunMain.ts` until Phase 4 deletes it. It
   breaks at this point because of the handler signature change; that's acceptable (D16, no dual-running).
   Alternatively, delete it now.
8. HTTP tests (§7.3). Do the JSON-parity check and the brand-cast decision (§4.2), and the error-message
   parity check (§4.4).
9. Acceptance: `bun packages/server/src/index.ts` with a temp `CHECQUERY_DATA_DIR`, test mode, and one
   configured user passes a scripted `curl` smoke: login → new file → create account → list → upload a copy
   (rejected as duplicate-file-id) → close → backup present.

### Phase 4: Client cut-over and Electrobun removal

1. `api/apiClient.ts`, `authSession.ts`, `fileSession.ts`; rewrite the five wrappers; `LoginPage`,
   `OpenFileModal`, and the component edits (§5.4); `Router` + boot sequence (§5.3); favicon.
2. Delete `mainview/rpc.ts`, the `shared/rpc.ts` shim + `AppSchema`, `electrobunMain.ts`,
   `electrobun.config.ts`, and the `__electrobun` stub in `test/setup.ts`. Run `bun remove electrobun`;
   this also removes the `three` tsc error CLAUDE.md mentions.
3. Client tests (§5.6). Measure `typecheck` time for the `hc` concern (§5.1).
4. Vite proxy; root scripts (§7.1); `.env.example`.
5. Manual pass in a real browser (`bun run dev`):
   - login/logout; wrong login → rate limit;
   - every page in `info-architecture.md`'s map, by direct URL and by refresh;
   - create/edit/delete for each entity; split transaction; the balance assertion flow; both reports;
     print; calculator;
   - close → backup in `<dataDir>/backups/`; wrong file password;
   - second browser as the other user → Unlock;
   - open a different file while one is open → the first is backed up and the other session sees the
     Unlock / no-file flow;
   - upload a real desktop `.checquery` file and open it with its password;
   - idle-close (temporarily set the env var to 1 minute);
   - server restart mid-session.

### Phase 5: Docker

1. `Dockerfile` (multi-stage):
   ```dockerfile
   FROM oven/bun:1.3-slim AS build
   WORKDIR /app
   COPY package.json bun.lock ./
   COPY packages/shared/package.json packages/shared/
   COPY packages/server/package.json packages/server/
   COPY packages/client/package.json packages/client/
   RUN bun install --frozen-lockfile
   COPY packages packages
   RUN bun run --cwd packages/client build          # → packages/client/dist

   FROM oven/bun:1.3-slim AS runtime
   WORKDIR /app
   ENV NODE_ENV=production CHECQUERY_HOST=0.0.0.0 CHECQUERY_PORT=3000 \
       CHECQUERY_DATA_DIR=/data CHECQUERY_STATIC_DIR=/app/public
   COPY package.json bun.lock ./
   COPY packages/shared/package.json packages/shared/
   COPY packages/server/package.json packages/server/
   COPY packages/client/package.json packages/client/
   RUN bun install --frozen-lockfile --production --filter '@checquery/server'
   COPY packages/shared/src packages/shared/src
   COPY packages/server/src packages/server/src
   COPY packages/server/scripts packages/server/scripts
   COPY --from=build /app/packages/client/dist /app/public
   RUN mkdir -p /data && chown bun:bun /data
   USER bun
   VOLUME ["/data"]
   EXPOSE 3000
   HEALTHCHECK --interval=30s --timeout=3s CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
   CMD ["bun", "packages/server/src/index.ts"]
   ```
   Notes:
   - The image runs TypeScript directly; no server bundle step.
   - The `FROM` tag follows `mise.toml`.
   - Verify that `--filter` + `--production` behave with workspaces on the pinned Bun. The fallback is a
     plain `--production` install.
   - `.dockerignore`: `**/*.test.ts(x)`, `**/test/`, `node_modules`, `dist`, `build`, `data`, `.env`,
     `.git`, `.idea`, `tasks`, `documentation`.
   - Hashing a password inside the container:
     `docker compose run --rm checquery bun packages/server/scripts/hashPassword.ts`.
2. `docker-compose.yml`:
   ```yaml
   services:
     checquery:
       build: .
       image: checquery:latest
       ports: ["127.0.0.1:3000:3000"]     # localhost-only by default (plain HTTP until the HTTPS task)
       volumes:
         - checquery-data:/data
         # - ./data:/data                  # bind-mount alternative (host dir must be writable by uid 1000)
       environment:
         CHECQUERY_USER1_NAME: ${CHECQUERY_USER1_NAME:?set in .env}
         CHECQUERY_USER1_PASSWORD_HASH: ${CHECQUERY_USER1_PASSWORD_HASH:?set in .env}
         CHECQUERY_USER2_NAME: ${CHECQUERY_USER2_NAME:-}
         CHECQUERY_USER2_PASSWORD_HASH: ${CHECQUERY_USER2_PASSWORD_HASH:-}
         # CHECQUERY_IDLE_CLOSE_MINUTES: "60"
         # CHECQUERY_TRUST_PROXY: "true"
       restart: unless-stopped
       stop_grace_period: 30s              # time for close+backup on SIGTERM (D12)
   volumes:
     checquery-data:
   ```
   **`$` in argon2 hashes.** Compose interpolates `$` in YAML and in `.env` values used for interpolation.
   Verify in this phase which form survives intact:
   - escaping as `$$` in `.env`;
   - single-quoting;
   - passing the vars through `env_file:` instead.
   Then document the one that works in `.env.example`. If it stays awkward, also accept a base64-encoded
   hash (`CHECQUERY_USER1_PASSWORD_HASH_B64`).
3. Signals: with exec-form `CMD`, Bun is PID 1 and receives SIGTERM. Confirm that `docker compose stop`
   logs the shutdown close and leaves a backup. If PID-1 quirks appear, add `init: true`.
4. Acceptance:
   - `docker compose up --build`;
   - the Phase 4.5 manual pass against `localhost:3000`;
   - `down` then `up` → files and backups persist, and a re-login + re-open is required.

### Phase 6: Docs and cleanup

1. Rewrite CLAUDE.md (§9). Update the auto-memory note on the test command and baseline count if they
   changed.
2. When this plan moves to `tasks/done/`, annotate any divergences ("Implemented as planned, except …"). It
   becomes the durable reference for the HTTP API, auth, and session model, alongside `action-log.md` etc.
3. Update code comments that say "bun-side", "RPC", "webview", or "Electrobun" (client wrappers, params doc
   comments, `navigationHistory.ts`, `fileLifecycle.ts`). Historical `tasks/done/*.md` records are left
   as-is.
4. File follow-up tasks in `tasks/todo/` for the §11 items the user wants tracked (at minimum HTTPS).

---

## 7. Build, scripts, and tests

### 7.1 Root `package.json` scripts

| Script | Command |
|---|---|
| `dev` | `concurrently -n server,client "bun --hot packages/server/src/index.ts" "bun run --cwd packages/client dev"` |
| `build` | `bun run --cwd packages/client build` |
| `start` | `bun packages/server/src/index.ts` (expects a prior `build`) |
| `test` | `bun run test:shared && bun run test:server && bun run test:client` |
| `test:shared` / `test:server` | `cd packages/<x> && bun test` |
| `test:client` | `cd packages/client && bun --conditions=browser test` |
| `typecheck` | `tsc --noEmit -p packages/shared && tsc --noEmit -p packages/server && tsc --noEmit -p packages/client` |
| `hash-password` | `bun packages/server/scripts/hashPassword.ts` |
| `docker:build` / `docker:up` | `docker compose build` / `docker compose up` |

### 7.2 Test runner config

- `--conditions=browser` is needed only for client tests. Leaving it off for server and shared is more
  correct, and it keeps the happy-dom preload out of server tests.
- Each package runs `bun test` from its own directory, so it picks up its own `bunfig.toml`.
- **Fallback** if per-package config misbehaves under workspaces: a single root `bunfig.toml` + preload,
  with everything run under `--conditions=browser`. That's exactly today's known-working setup.
- CLAUDE.md's rule becomes: "run `bun run test` from the root; for a single client file,
  `cd packages/client && bun --conditions=browser test <file>`; server and shared files can use plain
  `bun test <file>` from their package directory."

### 7.3 New server tests

- `shared/src/api/*.test.ts`: schemas (Phase 2).
- `config.test.ts`, `clientIp.test.ts`, `auth/users.test.ts` (verify; dummy-hash path for unknown users),
  `auth/loginSessions.test.ts` (idle expiry), `rateLimit.test.ts`, `fileUpload.test.ts` (each rejection
  path from §4.5, using real temp files: non-SQLite, SQLite without meta, newer schema version, duplicate
  file_id, wrong extension for the mode, oversize, existing name).
- `packages/server/test/*.http.test.ts`, through `createApp(...).request(...)` with a temp data dir:
  - **auth**: every L and U route returns 401 without a cookie. This is table-driven from the route map, so
    a new route can't forget auth. Login, logout, expiry, rate limit, and CSRF origin mismatch → 403.
  - **file lifecycle**:
    - list empty → new → `GET /api/file` → info → close → backup exists → open → wrong password 401;
    - traversal names rejected; already-exists 409;
    - open-while-open backs up the previous file and leaves the other session `file-locked`;
    - wrong password while a file is open leaves it open.
  - **unlock**: a second login session gets 403 `file-locked` until it unlocks. Its writes then carry a
    distinct Origin (assert via `findOriginsAll`).
  - **entities**: create/list/patch/delete round-trip per entity; 400 on a malformed body; 409 after close.
    Keep these thin; the handler tests stay the source of truth for domain behavior.
  - **errors**: domain Zod failure → 400 with the expected message; unexpected → 500 generic body.
  - **mutation serialization** (§4.7) and **idle-close** (inject a clock).
  - **static**: `/` and a deep link like `/register/x` both serve index.html; `/assets/*` gets immutable
    caching; `/api/nope` → JSON 404.
  - One **encrypted-path** suite with a real password (slower because of scrypt; keep it small).
- Optional: `scripts/smoke.ts`, which boots the real server on a random port and drives the API. It doubles
  as the Docker acceptance check.

---

## 8. Risks and mitigations

1. **Import codemod mistakes** (Phase 1). Mitigated by real path resolution rather than regex, tsc + the
   full suite as the gate, and its own commit before any behavior change.
2. **Bun test config across workspaces.** There's a known-working fallback (§7.2).
3. **`hc` type inference.** Slow editor/tsc, or brands lost in the JSON-parsed types. Mitigations are in
   §4.2/§5.1: explicit wrapper return types with casts at the boundary, and pre-emitted `.d.ts` if it's
   slow.
4. **Error-message regressions.** Pages render `e.message`. Covered by the §4.4 parity check and HTTP tests
   that assert messages.
5. **Security exposure.** A decrypted ledger is now reachable over a network. Mitigations:
   - app login with argon2id hashes;
   - a file-password unlock per session;
   - rate limiting;
   - `SameSite=Strict` + Origin check;
   - secure headers;
   - strict file-name validation and a non-overwriting, validated upload;
   - idle-close;
   - compose binds to localhost by default.
   **Plain HTTP remains the main gap**: passwords cross the wire unencrypted off-localhost. Closing that is
   the HTTPS follow-up; until then, docs say "localhost or trusted LAN only".
6. **SQLite on Docker volumes.** Needs local storage, not NFS/SMB; documented.
7. **`scryptSync` blocking about 100 ms** per open or unlock. Acceptable; it's a follow-up.
8. **Stale tabs.** Handled by `unwrap`'s lost-session paths, and by clearing every session's `unlock` on
   any close, so a write can never land in a file the session didn't unlock.
9. **Upload of a large or garbage file.** Size limits at two layers, a temp file plus atomic rename, and
   read-only validation before the file is listed.

### 8.1 Migrating existing desktop `.checquery` files

No format change. Use **Upload** in the Open dialog, or `docker cp` / a bind mount, then Open the file with
its existing password. Its `node_id`, HLC state, and origins carry over. The first open adds an Origin for
(login name, client IP); that's expected. Migrations run on first open, as with any open.

---

## 9. CLAUDE.md rewrite outline (Phase 6)

- **Project state**: "single-user-household web app (Bun + Hono server, SolidJS client, up to two
  logins), deployed as one Docker image". Replaces the Electrobun description. Keep the feature inventory;
  note the October 2026 conversion and link this plan in `tasks/done/`.
- **Commands**: the §7.1 table, the §7.2 test guidance, `typecheck` (no more `three` caveat), Docker
  commands, the §4.1 env table, `hash-password`, and test mode (keep the explanation; add Q5's production
  refusal).
- **Architecture**:
  - the packages map;
  - the request flow: client wrapper → `hc` → Hono route → `requireLogin`/`requireUnlockedFile` →
    zxValidator → handler(session, params) → `LedgerStore.svcs` → TeeSvc;
  - the login/unlock session model and the one-open-file rule;
  - static serving + SPA fallback;
  - the persistence section, unchanged apart from paths;
  - the page map with the new paths and the `/login` route.
- **Remove**: the Electrobun build/copy flow, the dev-server probe, `views://`, and HashRouter mentions.

---

## 10. Interaction with other pending tasks

- **`tasks/todo/export-import.md`** assumes "a file-picker-selected new file". In the web app:
  - export = a `GET` returning JSON with `Content-Disposition: attachment` (a browser download);
  - import = `<input type=file>`, read client-side and `POST`ed as JSON. The same pattern as this plan's
    Upload.
  Plan export/import **after** this conversion merges.
- **`tasks/todo/code-review-2026-08-05.md`** cites `src/...` paths that will move: `src/bun` →
  `packages/server/src`, `src/mainview` → `packages/client/src`, `src/shared` → `packages/shared/src`. Its
  findings stay valid. Issue 1 (null-clearing of optional patch fields) will widen the Phase 2 params
  schemas from `.optional()` to `.nullable().optional()`; nothing here precludes that.

---

## 11. Follow-ups (out of scope; candidates for `tasks/todo/`)

1. **HTTPS** (D5.3): TLS in-container (`Bun.serve({ tls })` with mounted certs) or a documented reverse
   proxy recipe; then add `Secure` to the session cookie and enable the clipboard over the LAN.
2. Widen `ipAddressSchema` to accept IPv6 (a domain + action-log payload change).
3. Async `scrypt` to avoid blocking the event loop on open/unlock.
4. Backup retention (`CHECQUERY_BACKUP_KEEP=N`) (D12.1).
5. Download of a `.checquery` file or backup from the UI (the mirror of Upload).
6. Live cross-tab/user invalidation via SSE (D9), if staleness becomes annoying with two users.
7. Mutation responses returning the created/updated entity instead of 204.
