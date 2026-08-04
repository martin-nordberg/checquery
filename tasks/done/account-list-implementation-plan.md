# Account List Pages — Implementation Plan

> Covers turning `AccountListPage.tsx` (currently a "coming soon" stub) into the real, editable account
> tree described in `info-architecture.md` §5, for all four applicable account types. Net Worth (`EQUITY`)
> is excluded per that doc — see §4's note on why.

---

## 0. Governing constraint: account type is never user-settable

Every account list page is scoped to exactly one `acctType`, forced by the route (`/accounts/:acctType`).
Nothing in this plan introduces a type selector anywhere:

- The inline **create** row has no type field — the caller fills in `acctType` from the current page's
  route param before calling `createAccount`, not from anything the user picked.
- The inline **edit** row has no type field, and can't grow one by accident: `accountPatchEventSchema`
  (`src/shared/domain/accounts/Account.ts`) now **omits `acctType` entirely** from the patch shape
  (`.omit({acctType: true})`, not `.partial({acctType: true})` as before) — a patch payload that includes
  `acctType` at all is rejected as an unrecognized field, and `AccountPatchEvent` no longer has the property
  at the type level, so code that tried to set it wouldn't compile. This part is already done (see the
  commit that lands alongside this plan).
- The **parent picker** (§4 below) is scoped to the same `acctType` as the current page — you can reparent
  within a type's tree, never across types.

## 1. Prerequisites (not yet built, and not account-specific)

Two pieces of shared infrastructure block this work and don't exist yet. Neither is account-specific —
Vendors/Transactions/Balance Assertions will need the same things — but this is the first feature that
actually requires them, so this plan is where they get built.

### 1a. RPC bridge for account data

`src/shared/rpc.ts`'s `bun` schema currently has no data-query/command surface at all — only the file
lifecycle requests (`startNewFile`, `getFileInfo`, etc.). The webview cannot fetch, create, patch, or
delete an account yet. Needed:

- Add to `AppSchema.bun.requests`: `findAccountsAll`, `createAccount`, `patchAccount`, `deleteAccount`,
  `isAccountInUse` (mirrors `IAccountSvc` = `IAccountQrySvc & IAccountCmdSvc`).
- Handlers in `src/bun/index.ts`, backed by `getCurrentLedgerStore()?.svcs.accounts` (already the right
  object — `AccountTeeSvc` implements `IAccountSvc`, writing through to both the action log and the
  materialized store). Guard the "no file open" case (should be unreachable in practice since these pages
  only render once `currentFile()` is set, but the handler shouldn't crash if it happens).
- No push/broadcast needed — unlike the old checquery client (multi-tab, WebSocket-synced), checquery2 is
  single-window. A simple request → mutate → refetch `findAccountsAll()` pattern in the webview is enough;
  there's no second tab to keep in sync.
- Mainview side: a small `src/mainview/accounts/accountsClient.ts` wrapping `rpc.request.*` calls, mirroring
  the existing `requestNewFile`/`requestCloseFile` wrapper pattern in `rpc.ts` — gives the page components
  a plain async-function API and, just as importantly, something mockable in tests via `mock.module`
  (there's no example of mocking the RPC layer in the test suite yet; this is the first page that needs
  real data, so it's the first to need that mocking pattern).

### 1b. A "current origin" for this session — reused across sessions when possible

Every `AccountCreationEvent`/`AccountPatchEvent`/`AccountDeletionEvent` requires an `origId` referencing a
real `Origin` (name + IP — see `Origin.ts`). **Nothing in the codebase creates one today** — `db.ts` tracks
`currentPath`/`currentDb`/`currentLedgerStore` for the open file, but no origin is bootstrapped when a file
is opened or created. This blocks every mutation, not just accounts.

**Decision: reuse an existing `Origin` instance whenever one already matches this session's identity,
rather than minting a new one on every launch.** Concretely, when `createNewFile`/`openExistingFile`
succeeds:

1. Compute this session's identity: `name` from `os.userInfo().username`, `ipAddress` from
   `os.networkInterfaces()` — the first non-internal IPv4 address found (i.e. the machine's actual LAN
   address, e.g. `192.168.1.42`), not a loopback placeholder. This matters if the `.checquery` file ever
   lives on a network share and gets opened from more than one machine — a real address is what makes
   "where" in the audit trail actually mean something. Fall back to `127.0.0.1` only if no such interface
   exists at all (e.g. networking disabled) — `ipAddressSchema` requires *some* valid IPv4 value, and this
   is the one edge case where nothing better is available.
2. Call `svcs.origins.findOriginsAll()` and look for an existing `Origin` whose `(name, ipAddress)` already
   matches. Origins are few (one per distinct user/machine identity that's ever touched this file) and this
   only runs once per file-open, so a linear scan needs no new indexed query.
3. If found, reuse that `Origin`'s id. If not (first time this identity has touched this file), create a
   new one via `svcs.origins.createOrigin(...)`.
4. Hold the resulting id alongside `currentLedgerStore` in `db.ts`, exposed via a `getCurrentOrigId()`
   accessor the RPC handlers use to stamp every mutation.

This means the common case (one person, one machine, opening the same file repeatedly) accumulates exactly
one `Origin` no matter how many times the app is launched — "File Info"'s origin count stays meaningful
(distinct identities that have touched the file) rather than growing by one every session. A file opened by
a genuinely different user or machine still gets its own `Origin`, since the `(name, ipAddress)` won't
match — the audit trail still tells them apart correctly.

## 2. Component architecture

`AccountListPage.tsx` is already the single, route-parameterized component serving all four pages
(`/accounts/ASSET`, `/accounts/LIABILITY`, `/accounts/INCOME`, `/accounts/EXPENSE`) — the reuse the prompt
asked about already exists at the page level from the earlier navigation-structure pass. The work here is
entirely inside that page and its children; no new page components are needed, and no fifth page for
`EQUITY` (it already redirects home).

New files, all under `src/mainview/components/accounts/`:

| Component | Responsibility |
|---|---|
| `AccountTree.tsx` | Renders a list of `AccountTreeNode`s recursively: indentation by depth, expand/collapse caret, click-to-edit. Owns no data fetching — takes the tree as a prop. |
| `AccountTreeRow.tsx` | One row, either display mode or (when it's the row being edited) delegates to `EditableAccountRow`. |
| `NewAccountRow.tsx` | Inline creation row. Takes `acctType` and `parentId` as fixed props (not user input) — name, description, `isPrimary` are the only editable fields. |
| `EditableAccountRow.tsx` | Inline edit form for an existing account: name, description, `isPrimary`, parent (via `AccountParentPicker`). No `acctType` field, full stop. |
| `AccountParentPicker.tsx` | Picks a parent from accounts of the *same* `acctType` as the page (parent's type must match child's — an existing invariant noted as "enforced in application code" in `Account.ts`'s comments, not yet actually coded anywhere; this picker is where that gets enforced for the create/edit paths specifically). |

`info-architecture.md` §9 already flags that the Vendor List's `defaultAcctId` picker should probably reuse
"whatever autocomplete/typeahead the tree view uses." To make that reuse actually possible later without
duplicating logic, put the type-filtering in `AccountParentPicker` itself (a thin wrapper) around a lower,
type-agnostic `AccountPicker.tsx` that just picks *any* account from a given flat list — Vendor List can
import `AccountPicker` directly without ever pulling in the parent/hierarchy-specific logic.

## 3. Tree-building logic

A pure function, independent of any component:

```ts
// src/mainview/accounts/buildAccountTree.ts
function buildAccountTree(accounts: Account[], acctType: AcctTypeStr): AccountTreeNode[]
```

- Filters `accounts` to the given type, then nests by `parentId`, rooted at that type's fixed root id
  (`acctRootId[acctType]` from `AcctRoot.ts`). The root account itself is never rendered as a row — only its
  children become the tree's top-level nodes.
- Pure and synchronous, so it gets ordinary `bun test` unit tests with no rendering/RPC mocking at all —
  cheapest tests in this whole plan, write them first.
- Sort order within a level: alphabetical by name for v1 (`info-architecture.md` §5 flags this as TBD;
  picking alphabetical now, revisit if it turns out wrong once there's real data to look at).

## 4. Flows

**Create**: `NewAccountRow` submits `{name, description, isPrimary}`; the page fills in `acctType` (from
the route) and `parentId` (from where the "add" action was invoked — top-level add under a type ⇒ the
type's root id; "add child of this node" ⇒ that node's id) before calling `createAccount`.

**Edit**: `EditableAccountRow` submits a patch with whichever of `{name, description, isPrimary, parentId}`
changed. Never `acctType` — can't, per §0.

**Delete**: call `isAccountInUse` first; if true, block with a message (matches the existing
account/vendor in-use rule already described in `info-architecture.md` §5). Soft-delete otherwise.

## 5. Testing

- `buildAccountTree` — pure unit tests, no DOM.
- `AccountListPage` smoke tests, `@solidjs/testing-library` + the existing `renderPage` helper, with the
  new `accountsClient` module mocked via `mock.module` (need to add this pattern — first page in the app
  that needs it): renders a small fixed account list, expand/collapse, create/edit/delete round-trips
  against the mock.
- One test specifically asserting there's no type-related input anywhere in the create/edit rows (guards
  against the constraint in §0 regressing silently) — e.g. `queryByLabelText(/type/i)` returns null.

## 6. Suggested order of work

1. §1a RPC bridge (accounts only) + §1b origin bootstrap — verify end-to-end with a throwaway manual test
   (create one account, confirm it round-trips through `findAccountsAll`) before building any UI on top.
2. `buildAccountTree` + its unit tests.
3. Read-only `AccountTree`/`AccountTreeRow` rendering in `AccountListPage` (no editing yet) — replaces the
   "coming soon" stub with real (if not yet editable) data.
4. `NewAccountRow` (create, type forced).
5. `EditableAccountRow` + `AccountParentPicker` (edit, type immutable).
6. Delete + in-use guard.
7. Smoke tests for the assembled page.

## 7. Explicitly out of scope for this pass

- Drag-and-drop reparenting — picker-only for v1 (`info-architecture.md` §5 already flags this as TBD).
- Any reuse work on Vendor List's account picker beyond making it *possible* later (§2's `AccountPicker`
  split) — actually wiring Vendor List up to it is separate, unscheduled work.
- Live-update push between windows/tabs — not applicable, single-window app.
