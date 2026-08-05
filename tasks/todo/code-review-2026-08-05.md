# Code Review — 2026-08-05

Whole-codebase review of checquery2 (persistence stack, RPC layer, shared domain, mainview UI,
yaml-import CLI, and build/config). Baseline health at time of review: `bun run test` passes
(1145 tests, 94 files), and `bunx tsc --noEmit` shows only the known pre-existing `three`
declaration error inside `node_modules/electrobun` (documented in CLAUDE.md).

Each issue is rated on three axes:

- **Severity** — how much it matters if left unfixed (High / Medium / Low)
- **Effort** — how much work the fix is (Large / Medium / Small)
- **Risk of Breakage** — how likely the fix is to break something else (High / Medium / Low)

---

## Issue 1: Optional fields can never be cleared once set (cleared date, vendor, description, default account)

**Severity: High · Effort: Medium · Risk of Breakage: Medium**

The patch pipeline treats `undefined` as "no change" at every layer, and there is no way to express
"set this field to nothing." The UI sends `field || undefined` for the optional fields, so blanking a
field produces `undefined`, which every layer then ignores. Concretely:

- A transaction's **cleared date** can never be removed once entered (e.g. after mis-clicking a date).
- A transaction's **vendor** can never be removed — only replaced with a different vendor.
- A transaction's **description** can never be blanked (relevant when a vendor is set and the
  description should go away).
- A vendor's **default account** can never be unset — and the picker explicitly offers a "(none)"
  option that silently does nothing when the vendor previously had a default account.

Fixing this needs a "clear" sentinel (e.g. `null`) threaded through the RPC params, the patch event
schemas, the ActionLog payload, the MaterializedStore patch SQL, and replay — hence the Medium effort
and Medium breakage risk (the action-log payload format is durable; a `null` is additive and old logs
stay readable, but replay and both store halves must agree on its meaning).

Code references:

- `src/mainview/components/transactions/EditableTransactionRow.tsx:116-119` — `clearedDate: form.clearedDate() || undefined`, `vndrId: form.vndrId() || undefined`, `description: form.description() || undefined`
- `src/mainview/components/vendors/EditableVendorRow.tsx:72` — `defaultAcctId: defaultAcctId() || undefined`, with the "(none)" option offered at `EditableVendorRow.tsx:50`
- `src/shared/rpc.ts:136-145` (`PatchTransactionParams`), `src/shared/rpc.ts:101-108` (`PatchVendorParams`) — optional-only, no null
- `src/shared/domain/transactions/Transaction.ts:105-118` (`transactionPatchEventSchema`), `src/shared/domain/vendors/Vendor.ts` (vendor patch schema) — `.partial()` with no nullable variant
- `src/bun/persistence/materializedStore/crudServices/TransactionMaterializedStoreSvc.ts:102-105`, `.../VendorMaterializedStoreSvc.ts:76-79` — `!== undefined` guards, no way to write NULL

---

## Issue 2: Save/delete failures are silently swallowed in all account and vendor forms

**Severity: Medium · Effort: Small · Risk of Breakage: Low**

The transaction rows correctly wrap their RPC calls in `try/catch` and surface the message
(`EditableTransactionRow.tsx:124`, `NewTransactionRow.tsx:128`). All eight account/vendor row
components instead use `try { … } finally { … }` with **no catch** for save, and no `try` at all for
delete. If the bun-side handler rejects (schema validation failure, "No file open", a tee-write
error), the rejection is unhandled: the modal stays open, the spinner resets, and the user gets no
indication anything failed — and for deletes, `onEdited()` is simply never reached with no feedback.

Code references (save paths without catch; the `handleConfirmDelete` in the same files have no
try/catch either):

- `src/mainview/components/accounts/NewAccountRow.tsx:36-55`
- `src/mainview/components/accounts/NewAccountCategoryRow.tsx:37-55`
- `src/mainview/components/accounts/EditableAccountRow.tsx:36-58` (delete at `:76`)
- `src/mainview/components/accounts/EditableAccountCategoryRow.tsx:34-53` (delete at `:67-71`)
- `src/mainview/components/vendors/NewVendorRow.tsx:62-81`
- `src/mainview/components/vendors/NewVendorCategoryRow.tsx:28-44`
- `src/mainview/components/vendors/EditableVendorRow.tsx:57-79` (delete at `:93-97`)
- `src/mainview/components/vendors/EditableVendorCategoryRow.tsx:31-48` (delete at `:66`)

A shared helper (or copying the transaction rows' catch-and-display pattern, e.g. into the existing
`setErrorAlert` modal) would cover all eight.

---

## Issue 3: No error boundary; a bad route or failed fetch blanks the page

**Severity: Medium · Effort: Medium · Risk of Breakage: Low**

There is no `<ErrorBoundary>` anywhere, no page checks its resources' `.error` state, and three pages
call `schema.parse()` on raw route params during render. Any of the following currently produces a
broken/blank page with no recovery path:

- Restarting the app while the hash route still points at a data page (`#/register/...`): no file is
  open, so `findTransactionsByAccount` throws "No file open" bun-side, the resource errors, and
  reading it throws during render. (The `HashRouter` persists the last route across reloads, so this
  is a realistic sequence, not just a hand-edited URL.)
- A malformed or stale URL segment: `isoDateSchema.parse(params.endingDate)`,
  `periodSchema.parse(params.period)`, and `acctTypeSchema.parse(params.acctType)` all throw during
  render on bad input.

Suggested shape: an app-level `ErrorBoundary` in `App.tsx` as a backstop, plus redirect-to-home (or a
friendly message) for unparseable params and unavailable sessions.

Code references:

- `src/mainview/main.tsx:21-45` — router setup, no ErrorBoundary
- `src/mainview/App.tsx:9-19` — root component, no ErrorBoundary
- `src/mainview/pages/balancesheet/BalanceSheetPage.tsx:53` — `isoDateSchema.parse(params.endingDate)` in render
- `src/mainview/pages/incomestatement/IncomeStatementPage.tsx:63` — `periodSchema.parse(params.period)` in render
- `src/mainview/pages/accounts/AccountListPage.tsx:28` — `acctTypeSchema.parse(params.acctType)` in render
- `src/mainview/components/transactions/TransactionLog.tsx:47-55` — resources with no `.error` handling
- `src/bun/currentSession.ts:7-14` — the "No file open" throw that reaches these pages after restart

---

## Issue 4: `ActionLog.appendAction` performs two dependent inserts without a transaction

**Severity: Medium · Effort: Small · Risk of Breakage: Low**

Each append writes the `actions` row and then the per-entity lookup row (`account_actions`,
`transaction_actions`, …) as two separate `db.run` calls. A crash, power loss, or SQL error between
them durably persists the action while omitting it from its entity's lookup table, so every
`readActionsForXxx()` history query silently misses that action forever (full replay via
`readActions()` is unaffected, which makes the corruption particularly hard to notice). SQLite makes
this free to fix: wrap both inserts in `db.transaction(...)`, as `runMigrations` already does.

Code references:

- `src/bun/persistence/actionLog/ActionLog.ts:143-152` — the two un-wrapped inserts
- `src/bun/persistence/actionLog/migrations/runMigrations.ts:33-36` — the existing transaction pattern to copy

(The larger non-atomicity — log write succeeding while the MaterializedStore write then fails — is a
documented, accepted design decision per `LedgerStore.ts:18-20` and functional-spec §14, and is not
re-raised here.)

---

## Issue 5: Domain invariants are enforced only in the webview; the RPC layer accepts violating writes

**Severity: Medium · Effort: Medium · Risk of Breakage: Medium**

Several invariants that the UI carefully enforces are not checked bun-side, so the actual persistence
API will happily record violating actions. Today the webview is the only caller, but the RPC handler
layer is the real contract (and the seam any future feature, import, or test goes through). Gaps:

- **Delete-in-use guards**: `handleDeleteAccount` / `handleDeleteAccountCategory` /
  `handleDeleteVendor` don't call `isXxxInUse` — only the UI does, as a pre-check
  (`EditableAccountCategoryRow.tsx:56`, `EditableVendorRow.tsx:82`). A delete request for an in-use
  entity is accepted, orphaning transaction entries or child rows.
- **Sibling/vendor name uniqueness**: only checked client-side
  (`siblingNameConflict.ts:10-13` says so explicitly); no unique constraint exists in
  `materializedStore/schema.ts` and no handler re-checks.
- **Category reparent cycles**: excluded only by the UI picker
  (`AccountCategoryParentPicker.tsx:27`); `handlePatchAccountCategory` accepts any `parentCtgId`,
  including a descendant — which would hang `categoryAndDescendants`-free tree builds downstream
  (`buildAccountCategoryTree` would silently drop the orphaned subtree).
- **Transaction patch cross-field rule**: `transactionPatchEventSchema` cannot check
  `hasVendorOrDescription` against stored state, so a patch can leave a transaction with neither.
- **Patching soft-deleted rows**: the materialized `UPDATE ... WHERE id = ?` statements don't filter
  `is_deleted`, so a patch against a deleted entity "succeeds" and mutates the tombstoned row.

Fix direction: move (or duplicate) these checks into the bun-side handlers, where the current session
already has query access. Rated Medium risk because server-side rejections change the error behavior
the UI observes.

Code references:

- `src/bun/accountHandlers.ts:38-45`, `src/bun/vendorHandlers.ts` (delete handlers), `src/bun/accountCategoryHandlers.ts`, `src/bun/vendorCategoryHandlers.ts`
- `src/mainview/accountCategories/siblingNameConflict.ts:10-13`
- `src/mainview/components/accounts/AccountCategoryParentPicker.tsx:26-28`
- `src/shared/domain/transactions/Transaction.ts:105-118`
- `src/bun/persistence/materializedStore/crudServices/TransactionMaterializedStoreSvc.ts:124`, `.../AccountMaterializedStoreSvc.ts:84`, `.../VendorMaterializedStoreSvc.ts:86` — patch UPDATEs without `is_deleted = 0`

---

## Issue 6: A failed `createNewFile` leaves a partial file on disk

**Severity: Medium · Effort: Small · Risk of Breakage: Low**

`createNewFile` creates the SQLite file first, then runs migrations, seeds crypto material, and
bootstraps the Origin and Net Worth account. If anything after `new Database(path, { create: true })`
throws, the catch block closes the database but never deletes the file. Two consequences:

1. Retrying the same name then fails with "A file already exists at: …" even though the file is junk.
2. Worse, if the failure lands between origin bootstrap and Net Worth seeding, the leftover file is a
   *valid-looking* checquery file that opens successfully but violates the "Net Worth exists"
   invariant every report and opening-balance flow assumes.

The yaml-import CLI already does this correctly (`rmSync(result.path, { force: true })` on failure) —
`createNewFile`'s catch should do the same (including SQLite `-wal`/`-shm` siblings if present).

Code references:

- `src/bun/persistence/db.ts:185-228` — create path; catch at `:221-228` closes but doesn't unlink
- `src/bun/persistence/db.ts:211-213` — origin/Net-Worth bootstrap that can throw after the file is durable
- `yaml-import/import.ts:62-67` — the existing cleanup pattern to mirror

---

## Issue 7: `isAccountInUse` ignores balance assertions

**Severity: Low · Effort: Small · Risk of Breakage: Low**

The in-use check that gates account deletion looks at transaction entries and vendor default-account
references, but not `balance_assertions.acct_id`. An account referenced only by balance assertions is
deletable, orphaning the assertions. Today no UI creates balance assertions (see Issue 12), so this
is latent — but the backend fully supports creating them, and the check will be wrong the day the
feature is wired up.

Code references:

- `src/bun/persistence/materializedStore/crudServices/AccountMaterializedStoreSvc.ts:117-132` — the two EXISTS clauses; needs a third against `balance_assertions ... is_deleted = 0`
- `src/bun/persistence/materializedStore/schema.ts:89-99` — the referencing table

---

## Issue 8: Sessions restored to a data route have no "no file open" story (RPC `maxRequestTime: Infinity` compounds it)

**Severity: Low · Effort: Small · Risk of Breakage: Low**

Related to but distinct from Issue 3: `maxRequestTime: Infinity` is applied to the *entire* RPC
channel, not just the two prompt requests that need it (the stated reason at `index.ts:81-83`). Any
bun-side handler that hangs (e.g. a future long query, or an Electrobun transport hiccup) leaves the
webview awaiting forever with no timeout, no error, and no way to distinguish "slow" from "dead."
Scoping the long timeout to `promptNewFileName`/`promptPassword` (or introducing per-request
timeouts if the RPC library allows) restores fail-fast behavior for the ~35 data requests.

Code references:

- `src/bun/index.ts:80-84` — `maxRequestTime: Infinity` on the whole channel

---

## Issue 9: `IsoDate` only accepts years 2000–2099

**Severity: Low · Effort: Small · Risk of Breakage: Low**

`isoDateRegex` is hard-coded to `20\d\d`. Any pre-2000 date is rejected everywhere — including in the
yaml-import path, where a decades-old personal-finance log could legitimately contain 199x
transactions; the import would fail fast on the first one. It also sets a time bomb for 2100, which
is admittedly less pressing. If the constraint is intentional (checquery1 data provably starts after
2000), it deserves a comment saying so; otherwise widen to `\d{4}` (the calendar-validity refinement
already handles real validation).

Code references:

- `src/shared/domain/core/IsoDate.ts:6` — `/^20\d\d-…/`
- `yaml-import/importState.ts:315-325` — import path that inherits the restriction via `transactionCreationEventSchema`

---

## Issue 10: Concurrent access to one file is neither supported nor prevented

**Severity: Low · Effort: Medium · Risk of Breakage: Low**

The design explicitly contemplates a `.checquery` file used from more than one machine over a network
share (`db.ts:43-45`, the whole Origin concept), but nothing prevents two app instances opening the
same file *simultaneously*. Both would load the same `node_id` and the same starting HLC, mint
colliding HLCs, and the second writer would hit the `actions_hlc_idx` UNIQUE constraint (an opaque
crash at best) — while both in-memory MaterializedStores silently diverge from the shared log. A
simple advisory lock (lock file beside the `.checquery`, or SQLite `BEGIN EXCLUSIVE` probe on open)
with a clear "already open elsewhere" error would make the sequential-use assumption explicit.

Code references:

- `src/bun/persistence/db.ts:233-236` — open path, no exclusivity check
- `src/bun/persistence/actionLog/migrations/0002_actions.ts:15` — `actions_hlc_idx` UNIQUE index that turns a collision into a crash
- `src/bun/persistence/actionLog/ActionLog.ts:114-117` — per-process master HLC loaded once at open

---

## Issue 11: Encrypted files leak activity metadata in plaintext

**Severity: Low · Effort: Large · Risk of Breakage: Medium**

Only the action *payload* is encrypted. In a `.checquery` file, the following are readable without
the password: every action's type (`create-transaction`, `delete-vendor`, …), its HLC (a precise
timestamp), and — via the plaintext lookup tables — the full entity-id graph of which action touched
which account/vendor/transaction. An attacker with the file learns transaction counts, exact
activity timing, and entity cardinalities, though no amounts, names, or descriptions. This looks like
a deliberate tradeoff (the lookup tables exist precisely so per-entity history can be located without
decrypting the whole log), but it isn't stated anywhere visible; at minimum it belongs in the
action-log architecture doc as an accepted limitation, and any future "encrypt harder" pass would
need to restructure the lookup scheme.

Code references:

- `src/bun/persistence/actionLog/migrations/0002_actions.ts:6-15` — plaintext `action_type` (with a CHECK constraint enumerating all types) and `hlc`
- `src/bun/persistence/actionLog/migrations/0002_actions.ts:19-73` — plaintext per-entity lookup tables
- `src/bun/persistence/actionLog/ActionLog.ts:145-152` — what gets written where

---

## Issue 12: BalanceAssertion is backend-complete but unreachable from the app

**Severity: Low · Effort: Large · Risk of Breakage: Low**

The BalanceAssertion entity has a full vertical slice bun-side — domain schemas, ActionLog command
service, MaterializedStore service, TeeSvc, replay dispatch, migrations, File-Info count — but no RPC
requests in `AppSchema`, no mainview client, and no UI. The yaml-import even deliberately skips the
old app's statements (`statementsSkipped`). Until the reconciliation UI exists, the entire slice is
dead code that every cross-cutting change (like Issues 1 and 5) still has to be threaded through.
This is presumably planned work; recording it here so the cost is a conscious choice. Either
prioritize the UI task or note the slice as intentionally dormant.

Code references:

- `src/shared/rpc.ts:147-186` — `AppSchema` has no balance-assertion requests
- `src/shared/domain/balanceAssertions/`, `src/bun/persistence/*/crudServices/BalanceAssertion*` — the dormant slice
- `yaml-import/importState.ts:106-110` — statements skipped on import
- `src/mainview/FileInfoModal.tsx:67-72` — the only UI surfacing (a count)

---

## Issue 13: `AmountInput` parsing quirks: float rounding, multiple dots, stripped signs

**Severity: Low · Effort: Small · Risk of Breakage: Low**

`parseToCents` cleans with `raw.replace(/[^0-9.]/g, "")` then does `Math.round(parseFloat(x) * 100)`:

- Binary-float rounding: `"1.005"` → `1.005 * 100 = 100.4999…` → **100** cents, not 101. Any 3+-decimal
  entry can round the wrong way.
- `"1.2.3"` silently parses as `1.2` (parseFloat stops at the second dot) instead of erroring.
- A minus sign is stripped, so `"-5"` silently becomes `$5.00` (probably intended, since debit/credit
  are separate columns — but silent sign-dropping is surprising; rejecting would be clearer).
- A European-style decimal comma is stripped as if it were a thousands separator: `"1,50"` → `$150.00`.

A string-based cents parser (split on the dot, validate at most one dot / two decimals) fixes the
rounding and the multi-dot case in one go.

Code references:

- `src/mainview/components/transactions/AmountInput.tsx:12-18`

---

## Issue 14: Packaging still ships the starter template's identity

**Severity: Low · Effort: Small · Risk of Breakage: Low**

The packaged app still identifies as the Electrobun/SolidJS starter: `package.json` is
`"electrobun-solid"` v1.0.0, and `electrobun.config.ts` names the app `"solid-app"` with identifier
`"solidapp.electrobun.dev"` at version 0.0.1. The identifier in particular is what the OS uses for
app identity (and what the updater channel hangs off), so it's worth fixing before any build is
shared or installed anywhere permanent — changing it later orphans installed-app state.

Code references:

- `package.json:2-5` — `"name": "electrobun-solid"`, `"description": "Electrobun app with SolidJS and Vite HMR"`
- `electrobun.config.ts:4-8` — `name: "solid-app"`, `identifier: "solidapp.electrobun.dev"`, `version: "0.0.1"`

---

## Issue 15: `find…ById` queries don't filter soft-deleted rows

**Severity: Low · Effort: Small · Risk of Breakage: Low**

Every entity's `findXxxAll`/`countXxxAll` filters `is_deleted = 0`, but every `findXxxById` selects
`WHERE id = ?` with no deletion filter, returning tombstoned entities as if live. Nothing currently
depends on the discrepancy (the by-id finders aren't exposed over RPC), but it's an inconsistency
waiting to become a bug the first time a caller assumes "found ⇒ live." Either filter them, or — if
resolving deleted entities is intentional for historical display — say so in the interface docs
(`IXxxQrySvc`) so both store halves and future callers share the assumption.

Code references:

- `src/bun/persistence/materializedStore/crudServices/AccountMaterializedStoreSvc.ts:102-105`
- `src/bun/persistence/materializedStore/crudServices/TransactionMaterializedStoreSvc.ts:155-159`
- `src/bun/persistence/materializedStore/crudServices/VendorMaterializedStoreSvc.ts:104-107`
- `src/bun/persistence/materializedStore/crudServices/AccountCategoryMaterializedStoreSvc.ts:94-97`
- `src/bun/persistence/materializedStore/crudServices/BalanceAssertionMaterializedStoreSvc.ts:95-100`

---

## Issue 16: Replay trusts action-log payloads without schema validation

**Severity: Low · Effort: Medium · Risk of Breakage: Low**

`dispatchAction` casts each decrypted payload straight to its event type (`action.payload as
AccountCreationEvent`, etc.) and the MaterializedStore services interpolate the fields into SQL
bind parameters unvalidated. Writes are Zod-validated on the way *in* (the RPC handlers parse), so
today's logs are clean — but replay is exactly the path that will someday consume logs written by
older/newer builds, merged from other files (action-log.md §7), or corrupted on disk. AES-GCM
authentication protects against tampering but not against a well-formed payload from a buggy or
future writer. Parsing each payload through its event schema during replay (or at least behind a
debug flag) would turn silent drift into a loud, row-named error, matching the fail-fast philosophy
`decodeRow` already applies to decrypt/JSON failures.

Code references:

- `src/bun/persistence/actionLog/ActionLog.ts:258-322` — `dispatchAction`'s unchecked casts
- `src/bun/persistence/actionLog/ActionLog.ts:156-174` — `decodeRow`, which validates everything *except* the payload shape

---

## Issue 17: Duplicated date/period helpers across the mainview

**Severity: Low · Effort: Small · Risk of Breakage: Low**

Small DRY debt, harmless individually but four copies deep:

- `currentMonthPeriod()` is defined identically in four files.
- The leap-year computation exists twice with independent implementations.

One `src/mainview/dates.ts` (or additions to `Period.ts`) would collapse them.

Code references:

- `src/mainview/main.tsx:16-19`, `src/mainview/pages/HomePage.tsx:35-38`, `src/mainview/pages/balancesheet/BalanceSheetPage.tsx:16-19`, `src/mainview/pages/incomestatement/IncomeStatementPage.tsx:15-18` — `currentMonthPeriod` ×4
- `src/shared/domain/core/IsoDate.ts:8-9` and `src/shared/domain/core/Period.ts:76-78` — leap-year logic ×2

---

## Summary table

| # | Issue | Severity | Effort | Risk |
|---|-------|----------|--------|------|
| 1 | Optional fields can never be cleared via patch | High | Medium | Medium |
| 2 | Save/delete failures swallowed in account/vendor forms | Medium | Small | Low |
| 3 | No error boundary; bad route or failed fetch blanks the page | Medium | Medium | Low |
| 4 | `appendAction`'s two inserts aren't atomic | Medium | Small | Low |
| 5 | Invariants enforced only in webview, not at RPC layer | Medium | Medium | Medium |
| 6 | Failed `createNewFile` leaves a partial file on disk | Medium | Small | Low |
| 7 | `isAccountInUse` ignores balance assertions | Low | Small | Low |
| 8 | `maxRequestTime: Infinity` applies to every RPC request | Low | Small | Low |
| 9 | `IsoDate` only accepts years 2000–2099 | Low | Small | Low |
| 10 | Concurrent open of one file neither supported nor prevented | Low | Medium | Low |
| 11 | Encrypted files leak activity metadata in plaintext | Low | Large | Medium |
| 12 | BalanceAssertion slice is backend-complete but unreachable | Low | Large | Low |
| 13 | `AmountInput` float rounding / multi-dot / sign-stripping quirks | Low | Small | Low |
| 14 | Packaging still ships starter-template identity | Low | Small | Low |
| 15 | `find…ById` doesn't filter soft-deleted rows | Low | Small | Low |
| 16 | Replay trusts log payloads without schema validation | Low | Medium | Low |
| 17 | Duplicated date/period helpers | Low | Small | Low |
