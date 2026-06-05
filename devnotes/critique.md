# Codebase Critique — Prioritized Opportunities

## P1 — Bugs with Correctness Impact

### ~~1. `Transaxtion` table typo~~ ✓ Fixed
Renamed to `Transaction` across all SQL strings and the DDL.

### 2. Empty catch in `isAccountInUse`
`shared/src/database/accounts/AccountTxnRepo.ts:92-100` catches all errors with a `// TODO` comment and returns `true`, meaning any DB error silently prevents account deletion. The error should be re-thrown (or at minimum logged) so the caller knows something went wrong rather than thinking the account is legitimately in use.

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

### 7. Client has no bootstrap — relies solely on WebSocket replay
`client/src/index.tsx` creates an empty local PGLite DB and immediately starts the WsClient. The server's `WsManager.loadReplay()` pushes the full event log to new connections, so the client eventually becomes consistent — but only after replay completes. There is no loading indicator, no fallback, and no way to know when replay is done. If the WebSocket connection fails before replay finishes (e.g., server restart during load), the client is left in a partially-populated state with no recovery mechanism. Consider: a `replay-complete` sentinel message from the server, and/or an HTTP endpoint for initial bulk-load.

### 8. No WebSocket reconnect logic
`client/src/ws/WsClient.ts` sets `onclose` to a log message only. If the connection drops, the client goes stale permanently until the user manually refreshes. A simple exponential-backoff reconnect (with replay on reconnect) is needed for production use.

### 9. Tee services are not atomic
`shared/src/services/accounts/AccountTeeSvc.ts` (and the others) execute writes sequentially across services. If the DB write succeeds but the event-writer or WS-writer fails, the server's in-memory state diverges from the YAML log. For the current single-user use case this is low risk, but it means error recovery is undefined. At minimum, if a write to any tee fails, the error should propagate rather than be silent.

### 10. `transactionx` stores merged HLC but passes original to callback
`shared/src/database/PgLiteDb.ts:33-34` — on replay from an external HLC:
```ts
this.#hlc = mergeHLClock(this.#hlc, externalHlc)   // merge stored locally
return this.#db.transaction((tx) => callback(new PgLiteTxn(tx, externalHlc))) // but original passed to txn
```
The intent of the merge is to prevent the local clock from going backward after replay. However, the replayed rows end up stamped with `externalHlc`, not the merged value. Whether this is a bug or a deliberate "preserve original timestamps on replay" decision should be made explicit with a comment.

### 11. `AcctNetworth` uses a literal hardcoded ID
`shared/src/database/balancesheet/BalanceSheetRepo.ts:79` — `acctIdSchema.parse("acctnetworth0000000000000000")` hardcodes an account ID that looks like a manually-crafted CUID2. This will silently break if the net-worth pseudo-account ever gets a different ID, or if the ID validation schema changes. Define it as a named constant next to the schema.

---

## P3 — Code Quality

### ~~12. `zod.parse()` receives an invalid options argument~~ ✓ Fixed
Removed spurious `{reportInput: true}` second argument from three `.parse()` calls in `ChecqueryEventLoader.ts`.

### ~~13. Logger services are dead code~~ ✓ Fixed
Deleted `shared/src/logging/` entirely — all seven logger files were unreferenced.

### ~~14. `fromCents` comma-insertion relies on mutating intermediate string length~~ ✓ Fixed
Replaced with `Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'})` in `CurrencyAmt.ts`; uses `Math.abs` to normalise `-0`.

### 15. No centralized logging strategy
`console.log`, `console.info`, `console.error`, and `console.warn` are scattered throughout client and server with no consistent format. In a server process, structured logging (JSON to stdout) makes filtering and monitoring tractable. Even a thin wrapper (`logger.info(...)` → `console.error(JSON.stringify({level: 'info', ...}))`) is better than the current mix.

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
