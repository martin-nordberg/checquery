# File | Info — Implementation Plan

## Requirement (original note)

> I would like to add an "Info" option to the "File" menu. It should show the following:
> - The file name, last modification date, and size.
> - A count of each entity type (not counting deleted items): Accounts, Vendors, Transactions, Origins, BalanceAssertions
> - The total number of action log entries
> - A table of all the key/value entries in `_checquery_meta`

## Current state relevant to this feature

- `src/bun/menu.ts` builds the native "File" menu (`New...`, `Open...`, `Exit`) via `ApplicationMenu.setApplicationMenu`
  and handles clicks through an `application-menu-clicked` listener. It talks to the mainview only through the RPC
  schema in `src/shared/rpc.ts` — requests (`promptNewFileName`, `promptPassword`) for input it needs back, and
  messages (`fileOpened`) for one-way pushes.
- The mainview (`src/mainview/rpc.ts`, `NewFileModal.tsx`, `PasswordModal.tsx`, `App.tsx`) mirrors that: a signal per
  pending prompt, a modal component that `<Show>`s when the signal is set, Tailwind-styled.
- `src/bun/persistence/db.ts` owns the one open file's state: `currentPath`, `currentLedgerStore`
  (`getCurrentFile()`, `getCurrentLedgerStore()`), but does not currently expose the raw `Database` handle or file
  stats to anything outside itself.
- Entity counts: `LedgerStore.svcs.{accounts,vendors,origins,balanceAssertions}` each already have a
  `findXxxAll()` that excludes soft-deleted rows (`WHERE is_deleted = 0` in the materialized store). **Transactions
  are the exception** — `ITransactionQrySvc` only has `findTransactionById`; there is no bulk query at all today.
- `ActionLog` has no count of its own rows — only `readActions()`, which decrypts every row (fine for replay, wasteful
  for a count).
- `_checquery_meta` access lives entirely in `src/bun/persistence/actionLog/meta.ts` today, as single-key
  `getMetaValue`/`setMetaValue`; there's no "read every row" function.

## Plan

### 1. New/changed shared type — `src/shared/rpc.ts`

Add a `FileInfoPayload` type and a one-way `showFileInfo` message (mirrors `FileOpenedPayload`/`fileOpened` — no
response needed, so a message, not a request):

```ts
export type FileInfoPayload = {
    name: string;
    path: string;
    sizeBytes: number;
    lastModifiedIso: string; // ISO-8601, from the OS file mtime
    entityCounts: {
        origins: number;
        accounts: number;
        vendors: number;
        transactions: number;
        balanceAssertions: number;
    };
    actionLogEntryCount: number;
    meta: Array<{ key: string; value: string }>;
};
```

`AppSchema.webview.messages` gains `showFileInfo: FileInfoPayload`.

### 2. `src/bun/persistence/actionLog/meta.ts`

Add:
```ts
export function getAllMetaEntries(db: Database): Array<{ key: string; value: string }> {
    return db.query(`SELECT key, value FROM _checquery_meta ORDER BY key`).all() as Array<{ key: string; value: string }>
}
```
(No secrets leak here — `kdf_salt`/`verify_iv`/`verify_ciphertext` are meant to be non-secret; the derived key and the
password itself are never stored.)

### 3. `src/bun/persistence/actionLog/ActionLog.ts`

Add a cheap count, alongside the existing `readActions`:
```ts
/** Total number of rows in the actions table -- a lightweight count, unlike readActions() which decrypts every row. */
countActions(): number {
    const row = this.db.query(`SELECT COUNT(*) as n FROM actions`).get() as { n: number }
    return row.n
}
```

### 4. Add a `countXxxAll()` query to all five entities (not just transactions)

Decision: rather than counting accounts/vendors/origins/balanceAssertions by calling their existing `findXxxAll()`
and taking `.length` (which maps every row into a full domain object just to throw the objects away), add a
dedicated `SELECT COUNT(*)` query for every entity, transactions included (which has no bulk-read capability at
all today — only `findTransactionById`). Per entity:

| Entity | Table | Soft-delete filter |
|---|---|---|
| accounts | `accounts` | `WHERE is_deleted = 0` |
| vendors | `vendors` | `WHERE is_deleted = 0` |
| transactions | `transactions` | `WHERE is_deleted = 0` |
| balanceAssertions | `balance_assertions` | `WHERE is_deleted = 0` |
| origins | `origins` | *(no `is_deleted` column — origins are immutable, never deleted; confirmed in `schema.ts`)* |

For each of the five `IXxxQrySvc.ts` files: add `countXxxAll(): Promise<number>`.
For each of the five `XxxMaterializedStoreSvc.ts` files: implement it with the query above.
For each of the five `XxxTeeSvc.ts` files: delegate straight to `this.qrySvc.countXxxAll()`, same as their other
pure reads (e.g. `findAccountsAll`).
Each `XxxMaterializedStoreSvc.test.ts` gets one new test: create a couple, delete one (where deletion exists), count
reflects only the live ones.

### 5. `src/bun/persistence/db.ts` — assemble the payload

This is where `currentPath`/`currentLedgerStore` already live, so the aggregation belongs here rather than in
`menu.ts` (which stays thin, matching how it already just calls `createNewFile`/`openExistingFile` and forwards the
result):

```ts
export async function getCurrentFileInfo(): Promise<FileInfoPayload | null> {
    if (!currentPath || !currentLedgerStore || !currentDb) return null

    const stats = statSync(currentPath)
    const { svcs, actionLog } = currentLedgerStore
    const [origins, accounts, vendors, transactions, balanceAssertions] = await Promise.all([
        svcs.origins.countOriginsAll(),
        svcs.accounts.countAccountsAll(),
        svcs.vendors.countVendorsAll(),
        svcs.transactions.countTransactionsAll(),
        svcs.balanceAssertions.countBalanceAssertionsAll(),
    ])

    return {
        name: basename(currentPath),
        path: currentPath,
        sizeBytes: stats.size,
        lastModifiedIso: stats.mtime.toISOString(),
        entityCounts: { origins, accounts, vendors, transactions, balanceAssertions },
        actionLogEntryCount: actionLog.countActions(),
        meta: getAllMetaEntries(currentDb),
    }
}
```

(`statSync` from `node:fs`, added to the existing `node:fs` import.)

New `db.test.ts` coverage: `null` when no file is open; after `createNewFile`, correct name/size>0/recent mtime, all
counts 0, `actionLogEntryCount` reflecting appended actions, `meta` containing the expected keys
(`file_id`, `created_at`, `node_id`, `encrypted`, ...).

### 6. `src/bun/menu.ts` — menu item + handler

Add to the `File` submenu, after `Open...`, with a separator before `Exit`:
```ts
{ label: "Open...", action: "file:open", accelerator: "CmdOrCtrl+O" },
{ label: "Info...", action: "file:info" },
{ type: "separator" },
{ label: "Exit", action: "file:exit", accelerator: "Alt+F4" },
```
(`ApplicationMenuItemConfig` supports `{ type: "separator" }` — confirmed in `electrobun`'s type definitions.)

Dispatch:
```ts
} else if (action === "file:info") {
    void handleFileInfo(rpc);
}
```

Handler:
```ts
async function handleFileInfo(rpc: AppRpc) {
    const info = await getCurrentFileInfo();
    if (!info) {
        rpc.send.showError({ title: "No File Open", message: "Open or create a file first." });
        return;
    }
    rpc.send.showFileInfo(info);
}
```
`AppRpc.send` gains `showFileInfo: (payload: FileInfoPayload) => void` and `showError: (payload: ErrorAlertPayload) => void`.
The "no file open" case is **not** a native `Utils.showMessageBox` — see the UI policy note below. The same
`showError` message also replaced the two pre-existing `Utils.showMessageBox` calls in `handleNewFile`/`handleOpenFile`
("Cannot Create File" / "Cannot Open File"), for consistency.

### 7. Mainview — `FileInfoModal.tsx` and `ErrorAlertModal.tsx`

New signals in `src/mainview/rpc.ts`:
```ts
export const [fileInfo, setFileInfo] = createSignal<FileInfoPayload | null>(null);
export const [errorAlert, setErrorAlert] = createSignal<ErrorAlertPayload | null>(null);
```
message handlers: `showFileInfo: (payload) => setFileInfo(payload)`, `showError: (payload) => setErrorAlert(payload)`.

New `src/mainview/FileInfoModal.tsx`, styled like `NewFileModal`/`PasswordModal` but display-only (a single "Close"
button that just does `setFileInfo(null)` — no `resolve`, since this isn't a request):
- Header: file name
- Path, size (humanized, e.g. "12.3 KB"), last modified (localized date/time)
- A small table: one row per entity (Origins/Accounts/Vendors/Transactions/BalanceAssertions) → count
- Action log entry count
- A scrollable key/value table of every `_checquery_meta` row

New `src/mainview/ErrorAlertModal.tsx`: a generic title+message dialog with an "OK" button (`setErrorAlert(null)`),
used for every bun-side error that used to be a native message box.

Both registered in `App.tsx` next to the other modals.

## Decisions

- **No file open**: the menu item is always enabled; clicking it with no file open shows an in-app error dialog
  (`ErrorAlertModal`, via the new `showError` message), not a native OS dialog. No dynamic menu rebuilding.
- **Entity counts**: every entity gets a dedicated `countXxxAll()` query (see §4) rather than reusing `findXxxAll().length`,
  for efficiency — no point building full domain objects just to count them.
- **UI policy**: user-facing interaction stays on the web (mainview/SolidJS) side wherever there's a choice —
  `Utils.showMessageBox` is out for anything an in-app modal can do (errors, info, confirmations). Native OS
  dialogs are reserved for the handful of things only the OS can provide, e.g. `Utils.openFileDialog` (folder/file
  pickers). This applies going forward, not just to this feature.

