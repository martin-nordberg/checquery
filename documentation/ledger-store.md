# LedgerStore — Implementation Plan

## Purpose

Combine `ActionLog` (durable, encrypted, append-only event log) and `MaterializedStore` (in-memory, current-state,
queryable cache) behind one object per open `.checquery` file:

- Writes go to **both**: the log first (it mints the HLC and the `ActnId`), then the materialized store (persisted
  with that same HLC).
- Reads come from the materialized store only.
- On open, the log is replayed into a fresh (empty) materialized store before the combined object is handed out.

This is the piece described informally in the original note as a "combined data store." Naming below is final:
**`LedgerStore`**.

## Why this ordering, concretely

`AccountActionLogCmdSvc.createAccount` calls `ActionLog.appendAction`, which mints a fresh HLC (or merges an
existing one) and returns the event stamped with it. `AccountMaterializedStoreSvc.createAccount` just persists
whatever event object it's handed — it does not mint anything. Every `XxxTeeSvc` (already implemented, see below)
threads the result of each `cmdSvc` in its array into the next. So the array **must** be
`[actionLog.cmdSvcs.xxx, materializedStore.cmdSvcs.xxx]`, log first, or the materialized row would be stamped with
no HLC / a stale one.

Per functional-spec §14 ("Mutation Tee"), if the log write succeeds and the store write then throws, the system is
allowed to end up inconsistent — that's surfaced as an error, not rolled back. The existing `XxxTeeSvc`
implementations already do exactly this (a bare `for` loop of `await`s, no transaction wrapping), so `LedgerStore`
doesn't need to add anything extra here.

## What already exists (nothing to change)

- `src/shared/crudServices/{accounts,vendors,transactions,balanceAssertions,origins}/XxxTeeSvc.ts` — all five,
  uniform shape: `constructor(qrySvc, cmdSvcs: IXxxCmdSvc[])`.
- `src/shared/crudServices/CmdSvcBundle.ts` / `QrySvcBundle.ts` — one `IXxxCmdSvc` / `IXxxQrySvc` per entity.
- `ActionLog.cmdSvcs: CmdSvcBundle` (`src/bun/persistence/actionLog/ActionLog.ts`) and
  `MaterializedStore.{cmdSvcs, qrySvcs}` (`src/bun/persistence/materializedStore/MaterializedStore.ts`) already
  match those bundle shapes.
- `ActionLog.replayInto(target: CmdSvcBundle, afterHlc?)` — already does exactly the replay-into-a-cmdSvcBundle
  work needed to hydrate a `MaterializedStore` on open; already exercised generically in `replayDispatch.test.ts`.

None of this is currently wired together anywhere in the app — that's the gap `LedgerStore` fills.

## New files

### 1. `src/shared/crudServices/SvcBundle.ts`

One `IXxxSvc` (the Tee-facing interface, query+command) per entity, mirroring `CmdSvcBundle`/`QrySvcBundle`:

```ts
export type SvcBundle = {
    accounts: IAccountSvc
    vendors: IVendorSvc
    transactions: ITransactionSvc
    balanceAssertions: IBalanceAssertionSvc
    origins: IOriginSvc
}
```

### 2. `src/bun/persistence/ledgerStore/LedgerStore.ts`

```ts
export class LedgerStore {
    readonly svcs: SvcBundle

    constructor(
        readonly actionLog: ActionLog,
        readonly materializedStore: MaterializedStore,
    ) {
        this.svcs = {
            accounts: new AccountTeeSvc(
                materializedStore.qrySvcs.accounts,
                [actionLog.cmdSvcs.accounts, materializedStore.cmdSvcs.accounts],
            ),
            vendors: new VendorTeeSvc(
                materializedStore.qrySvcs.vendors,
                [actionLog.cmdSvcs.vendors, materializedStore.cmdSvcs.vendors],
            ),
            transactions: new TransactionTeeSvc(
                materializedStore.qrySvcs.transactions,
                [actionLog.cmdSvcs.transactions, materializedStore.cmdSvcs.transactions],
            ),
            balanceAssertions: new BalanceAssertionTeeSvc(
                materializedStore.qrySvcs.balanceAssertions,
                [actionLog.cmdSvcs.balanceAssertions, materializedStore.cmdSvcs.balanceAssertions],
            ),
            origins: new OriginTeeSvc(
                materializedStore.qrySvcs.origins,
                [actionLog.cmdSvcs.origins, materializedStore.cmdSvcs.origins],
            ),
        }
    }

    /**
     * Builds a LedgerStore whose MaterializedStore has been hydrated by replaying the given ActionLog into it
     * first. This is how every LedgerStore over a real (possibly non-empty) file must be constructed -- the plain
     * constructor alone leaves the store empty regardless of what's in the log.
     */
    static async open(actionLog: ActionLog, materializedStore: MaterializedStore = new MaterializedStore()): Promise<LedgerStore> {
        await actionLog.replayInto(materializedStore.cmdSvcs)
        return new LedgerStore(actionLog, materializedStore)
    }
}
```

Notes:
- `actionLog` and `materializedStore` are kept as public `readonly` fields (not just closed over) so later work
  (audit views via `readActionsForAccount`, compaction, export) can reach them without changing `LedgerStore`'s
  API again.
- Replay goes through `materializedStore.cmdSvcs` directly, **not** `this.svcs` — so replayed actions are read
  from the log and applied to the store only, never re-appended to the log itself.
- `open` takes an optional `materializedStore` (defaulting to a fresh one) purely to make the replay-into-a-store
  test case easy to write against a pre-populated log.

### 3. `src/bun/persistence/ledgerStore/LedgerStore.test.ts`

- **Round trip**: `svcs.accounts.createAccount(...)` → visible via `svcs.accounts.findAccountsAll()`, and also
  present in `actionLog.readActionsForAccount(id)` with a matching HLC.
- **Replay-on-open**: build a bare `ActionLog` via `createInMemoryActionLog()`, append several actions across a
  couple of entity types directly (bypassing `LedgerStore`), then `LedgerStore.open(log)` and confirm
  `svcs.*.findXxxAll()` reflects that pre-existing history.
- **Patch/delete flow**: create → patch → delete on one entity (accounts), checking `findAccountById` /
  `isAccountInUse` reflect each step.
- **Error propagation**: patching a non-existent account should reject (matches
  `AccountMaterializedStoreSvc.patchAccount`'s existing throw) — confirms the "surface an error, no rollback"
  contract from functional-spec §14 without `LedgerStore` adding special-case handling.

## Changed files

### 4. `src/bun/persistence/db.ts`

- Import `MaterializedStore` and `LedgerStore`.
- Module state: `currentActionLog: ActionLog | null` → `currentLedgerStore: LedgerStore | null`.
- `getCurrentActionLog()` → `getCurrentLedgerStore(): LedgerStore | null` (old name dropped; only `db.test.ts`
  currently calls it).
- `closeCurrent()` clears `currentLedgerStore` instead of `currentActionLog`.
- `FileResult`'s success arm: `actionLog: ActionLog` → `store: LedgerStore`.
- `createNewFile` and `openExistingFile` become `async`; right before returning, both do:
  ```ts
  const store = await LedgerStore.open(actionLog)
  ```
  (`createNewFile`'s log is always empty, so its replay is a trivial no-op loop — not worth special-casing away
  for a one-line simplification.)
- Everything else in `db.ts` (path handling, encryption/codec setup, migrations) is unchanged.

### 5. `src/bun/menu.ts`

`handleNewFile`/`handleOpenFile` already run inside `async` functions; add `await` in front of
`createNewFile(...)` / `openExistingFile(...)`. No other change — neither handler currently touches
`result.actionLog`/`result.store`.

### 6. `src/bun/persistence/db.test.ts`

Mechanical update to the new async signatures and the `getCurrentLedgerStore` / `result.store` names; same
assertions otherwise.

## Naming recap

- Class: **`LedgerStore`**, folder `src/bun/persistence/ledgerStore/`.
- Bundle type: **`SvcBundle`** (mirrors `CmdSvcBundle` / `QrySvcBundle`).

## Explicitly out of scope here

- No IPC/RPC handlers wire `LedgerStore.svcs` to the frontend yet — there is no such layer in the app at all yet;
  that's a separate task once the UI needs live data.
- No compaction/export logic — `actionLog`/`materializedStore` are exposed as public fields specifically so that
  can be built later without another `LedgerStore` API change.
