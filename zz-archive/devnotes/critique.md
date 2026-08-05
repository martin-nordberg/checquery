# Codebase Critique — Prioritized Opportunities

## P1 — Bugs with Correctness Impact

### ~~1. `Transaxtion` table typo~~ ✓ Fixed
Renamed to `Transaction` across all SQL strings and the DDL.

### ~~2. Empty catch in `isAccountInUse`~~ ✓ Fixed
Removed the try/catch entirely in `AccountTxnRepo`; errors now propagate naturally from `Promise.all`.

### ~~3. Leap year logic hard-coded through 2048~~ ✓ Fixed
Replaced hardcoded cases with the standard formula in `Period.ts`.

### ~~4. `isoDateToday` uses UTC, not local time~~ ✓ Fixed
Replaced `toISOString().split('T')[0]` with `toLocaleDateString('sv')` in `IsoDate.ts`.

### ~~5. WsClient `dispatch()` fire-and-forget on async methods~~ ✓ Fixed
Split into `dispatch()` (sync, catches rejections) and `dispatchAsync()` (awaits all service calls) in `WsClient.ts`.

### ~~6. YAML appender doesn't escape special characters~~ ✓ Fixed
Expanded `maybeQuoteYaml` to detect newlines, ` #`, and leading YAML special characters; escapes `\`, `"`, `\n`, `\r` before quoting. Also applied `maybeQuoteYaml` to vendor name/description and transaction vendor/description fields that previously bypassed it.

---

## P2 — Design Issues

### ~~7. Client has no bootstrap — relies solely on WebSocket replay~~ ✓ Fixed
Added `GET /replay` endpoint on the server. Client now fetches all directives via HTTP at startup, populates the local DB, then connects WebSocket for live updates only. WsManager no longer replays history on connect. A "Loading…" gate prevents rendering until replay is complete.

### ~~8. No WebSocket reconnect logic~~ ✓ Fixed
`WsClient` now reconnects with exponential backoff (1s → 30s cap). On each reconnect it re-fetches `GET /replay` to catch up, then re-opens the WebSocket. An `onStatusChange` callback drives an `isConnected` signal in `index.tsx`; a fixed amber banner shows "Reconnecting…" while disconnected.

### 9. Tee services are not atomic
`shared/src/services/accounts/AccountTeeSvc.ts` (and the others) execute writes sequentially across services. If the DB write succeeds but the event-writer or WS-writer fails, the server's in-memory state diverges from the YAML log. For the current single-user use case this is low risk, but it means error recovery is undefined. At minimum, if a write to any tee fails, the error should propagate rather than be silent.

### ~~10. `transactionx` stores merged HLC but passes original to callback~~ ✓ Fixed
`PgLiteDb.transactionx` now passes `this.#hlc` (the merged value) to the transaction instead of `externalHlc`, so rows are stamped with the post-merge clock.

### ~~11. `AcctNetworth` uses a literal hardcoded ID~~ ✓ Fixed
Added `acctIdNetWorth` constant to `AcctId.ts`; `BalanceSheetRepo` now references it instead of the inline string literal.

---

## P3 — Code Quality

### ~~12. `zod.parse()` receives an invalid options argument~~ ✓ Fixed
Removed spurious `{reportInput: true}` second argument from three `.parse()` calls in `ChecqueryEventLoader.ts`.

### ~~13. Logger services are dead code~~ ✓ Fixed
Deleted `shared/src/logging/` entirely — all seven logger files were unreferenced.

### ~~14. `fromCents` comma-insertion relies on mutating intermediate string length~~ ✓ Fixed
Replaced with `Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'})` in `CurrencyAmt.ts`; uses `Math.abs` to normalise `-0`.

### ~~15. No centralized logging strategy~~ ✓ Fixed
Added `server/src/logger.ts` — thin wrapper writing newline-delimited JSON to stdout/stderr. All server `console.*` calls replaced; structured log lines added for startup, event log load (with count and duration), WS connect/disconnect (with client count), and every API mutation (action + entity ID).

### 16. TODOs that affect correctness are open
- `AccountRepo.ts:45` and `AccountTxnRepo.ts:75` — both note `// TODO: save a flag isDeletable instead`, suggesting the current `isAccountInUse` query approach is a placeholder.
- `IsoDate.ts:16-17` — timezone issue (addressed in P1 above).

These should be resolved or converted to GitHub issues rather than left as inline comments.

### 17. YAML appender field order is action-specific if-chains
`ChecqueryYamlAppender.ts` has four large `if/else if` blocks, one per action group, manually listing fields in a specific order. Adding a new field to any event type requires updating the appender. A data-driven approach (ordered list of fields per schema) would be more maintainable and less error-prone.

---

## P4 — Missing Guardrails

### 18. Reconciled statements have no enforcement
`shared/src/domain/statements/Statement.ts` — `isReconciled: z.boolean()` exists but nothing prevents patching or deleting a reconciled statement, or modifying transactions that belong to one. For a personal finance app this is low risk, but reconciliation is the primary integrity checkpoint.

### ~~19. Vendor deletion doesn't check transactions~~ ✓ Already fixed
`isVendorInUse` is fully implemented in `VendorTxnRepo`, `VendorRepo`, `VendorTeeSvc`, and `VendorRoutes` — returns 409 if any transactions reference the vendor.

### 20. Soft-delete schema is inconsistent across tables
`CheckqueryPgDdl.ts` — `Account`, `Transaction`, and `Vendor` tables all have an `isDeletedHlc` column for HLC-tracked soft deletes. The `Entry` table has `isDeleted` but no `isDeletedHlc`. If HLC-based conflict resolution is ever extended to entries, this gap will require a migration.
