# Checquery — Action Log Persistence Specification

> Scope: the SQLite-backed, encrypted, append-only action log that backs a `.checquery` file, and the
> `IXxxCmdSvc` implementations built on top of it. This document supersedes the "Audit Log & Replay" section of
> `functional-spec.md` (§14), which described a YAML/server-based design from an earlier architecture; the
> current app is a single-file Electrobun desktop app with no server, and this SQLite design is what actually
> ships.

---

## 1. Purpose & Scope

Checquery stores each document as a single SQLite file (`*.checquery`). This spec covers:

- A portable `ActionLog` class — the core unit of this design — that knows nothing about files, passwords, or
  paths. It wraps *a* `Database` handle (file-backed or in-memory) plus an already-derived encryption key.
- The schema it manages: the existing `_checquery_meta` table plus a new `actions` table.
- Password-based encryption of every action's payload at rest.
- The forward-only migration mechanism that creates and evolves that schema.
- Replaying a log's actions to rebuild in-memory application state.
- The file-lifecycle layer (`src/bun/db.ts`'s `createNewFile` / `openExistingFile`) that turns a password and a
  path into an `ActionLog` instance.
- Why and how more than one `ActionLog` can be open at once — needed for **compaction** (reading a source log
  while writing a compacted destination log) and eventually **synchronization** of logs across devices — and how
  to construct one **in-memory**, with no file or password at all, for unit tests.

It also defines concrete `IXxxCmdSvc` implementations — one per entity (`Account`, `Vendor`, `Transaction`,
`BalanceAssertion`, `Origin`) — backed by an `ActionLog`. It deliberately does **not** implement any `IXxxQrySvc`:
queries are served by a separate in-memory materialized store, rebuilt by replaying a log (§10). This layer is
nearly write-only, by design.

---

## 2. Architectural Context

`src/shared/crudServices/` already defines, per entity, an `IXxxQrySvc`, an `IXxxCmdSvc`, and an `XxxTeeSvc` that
fans a single incoming command out to a list of `IXxxCmdSvc` implementations (see e.g. `AccountTeeSvc`). This
spec adds one more implementation to each entity's `cmdSvcs` list: an `ActionLog`-backed writer.

A typical write therefore fans out to (at least) two `IXxxCmdSvc` implementations in sequence, via the existing
`XxxTeeSvc`:

1. **An `ActionLog`** — appends an encrypted, durable record of the event. Source of truth.
2. **An in-memory store** — applies the event to queryable in-memory state, which is what `IXxxQrySvc` reads from.

Because `XxxTeeSvc` threads each `cmdSvc`'s return value into the next, and the `ActionLog` is the one that
resolves a missing `hlc` (§8), it should generally run **first** in each entity's `cmdSvcs` list, so the
in-memory store downstream of it sees the same resolved `hlc` that was persisted.

**File handling is a separate, layered concern.** `ActionLog` itself never opens a file, prompts for a password,
or knows what a `.checquery` path is — it only needs a `Database` and a key, both already resolved by its
caller. Everything file- and password-specific lives one layer up, in `src/bun/db.ts` (§4). This is what makes
§6 (in-memory logs for tests) and §7 (two logs at once, for compaction/sync) possible without any special-casing.

---

## 3. The `ActionLog` Class

```ts
// src/bun/actionLog/ActionLog.ts

class ActionLog {
    constructor(db: Database, key: Buffer, nodeId: string)

    // Durable append; resolves/stamps hlc per §8, encrypts per §9, inserts a row. Never returns null — see §11.
    appendAction<E extends { hlc?: HLClock }>(actionType: ActionType, event: E): Promise<E>

    // Low-level decrypted read, oldest-first. The building block for replay, compaction, and sync.
    readActions(afterHlc?: HLClock): IterableIterator<DecodedAction>

    // Convenience: readActions() + dispatch each one into target per §5's action-type -> method mapping.
    replayInto(target: CmdSvcBundle, afterHlc?: HLClock): Promise<void>

    // Five thin IXxxCmdSvc implementations, all delegating to appendAction above.
    readonly cmdSvcs: CmdSvcBundle
}

type DecodedAction = { id: number; actionType: ActionType; hlc: HLClock; payload: unknown }

type CmdSvcBundle = {
    accounts: IAccountCmdSvc
    vendors: IVendorCmdSvc
    transactions: ITransactionCmdSvc
    balanceAssertions: IBalanceAssertionCmdSvc
    origins: IOriginCmdSvc
}
```

Everything about *this specific log* — its master HLC (§8), its `Database` handle, its key — is instance state,
not module state. There is no module-level "the current log" inside `ActionLog.ts` itself; nothing prevents
constructing two, ten, or a throwaway in-memory one alongside the app's main document. (`db.ts` does keep a
single "currently open document" slot for its own UX purposes — see §4 — but that's a convenience one layer up,
not a constraint `ActionLog` imposes.)

The constructor is idempotent-schema-safe: it calls the same `runMigrations(db)` used by the file lifecycle
layer (§5) before doing anything else, so **any** `Database` handed to `ActionLog` — a real file, a fresh
in-memory database, or a scratch database being built for compaction — ends up with the current `actions` schema
regardless of whether its caller remembered to migrate it first. `runMigrations` is safe to call more than once
(§5), so this self-migration is a free safety net, not redundant work in the common case where the caller (e.g.
`db.ts`) already migrated it for its own reasons (needing `_checquery_meta` populated before it can derive a key
— see §4.3).

---

## 4. File Lifecycle (New / Open)

`src/bun/db.ts` owns everything file- and password-specific, and produces an `ActionLog` at the end. It already
implements bare-bones, unencrypted `createNewFile` / `openExistingFile` functions; this spec extends both.

### Updated signatures

```ts
export function createNewFile(folder: string, rawName: string, password: string): FileResult
export function openExistingFile(path: string, password: string): FileResult

export type FileResult =
    | { ok: true; path: string; fileId: string; name: string; actionLog: ActionLog }
    | { ok: false; error: string; code: FileErrorCode }

export type FileErrorCode =
    | 'already-exists'        // createNewFile: a file already exists at the target path
    | 'not-a-checquery-file'  // openExistingFile: missing/unreadable _checquery_meta
    | 'wrong-password'        // openExistingFile: password verification failed (§4.2)
    | 'unsupported-version'   // openExistingFile: file's schema_version is newer than this app understands
    | 'io-error'              // any other filesystem/SQLite failure
```

`db.ts` keeps a module-level "currently open document" — its own `ActionLog`, alongside `currentPath` — purely
because the app only ever edits one document at a time in its main window. That's an application-level
convenience, not something `ActionLog` requires; compaction (§7.1) and sync (§7.2) construct *additional*
`ActionLog` instances outside that slot.

### 4.1 Creating a new file

1. Validate the target path doesn't already exist (as today).
2. Open a new SQLite database and call `runMigrations(db)` (§5) — creates `_checquery_meta` and `actions`.
3. Generate and insert the file's per-instance data into `_checquery_meta`:
   - `file_id` — cuid2, as today.
   - `created_at` — ISO timestamp, as today.
   - `node_id` — 3 random hex characters (uppercase), used as the node component of every HLC this file ever
     writes (see `HLClock`'s 16-char layout: 10 ms + 3 counter + 3 node).
   - `kdf_salt` — 16 random bytes, base64-encoded.
   - `kdf_params` — JSON text, e.g. `{"N":32768,"r":8,"p":1,"keylen":32}` (stored per-file so future app
     versions can strengthen the default for *new* files without breaking older ones).
   - `verify_iv`, `verify_ciphertext` — see §4.2.
4. Derive the file's encryption key from `password` + `kdf_salt` + `kdf_params` (§9.1).
5. Construct `new ActionLog(db, key, node_id)` and return it as part of a successful `FileResult`. There's
   nothing to replay yet.

### 4.2 Password verification

Rather than storing a separate password hash, verification reuses the same derived key: at creation, encrypt a
fixed known plaintext (`"checquery-verify"`) with the freshly derived key and a random `verify_iv`, and store the
resulting ciphertext (which includes the GCM authentication tag) as `verify_ciphertext`.

To open a file: derive a candidate key from the entered password + the file's stored `kdf_salt`/`kdf_params`,
then attempt to decrypt `verify_ciphertext` with it. GCM's authentication tag makes this fail (loudly, and
correctly) whenever the password is wrong — without ever touching the (potentially large) `actions` table. This
also means a single mechanism handles both password verification and key derivation for actual row decryption.

This logic (`deriveKey`, `verifyPassword`, `generateFileCryptoMaterial`) lives in `src/bun/actionLog/crypto.ts`,
used only by `db.ts` — `ActionLog` itself never sees a password, only the resulting key (§3).

### 4.3 Opening an existing file

1. Open the SQLite file; if `_checquery_meta` is missing or unreadable, fail with `not-a-checquery-file` (as
   today).
2. Read `schema_version`. If it's higher than the newest migration this app build knows about, fail with
   `unsupported-version`. Otherwise call `runMigrations(db)` (§5).
3. Verify the password per §4.2. On failure, fail with `wrong-password`.
4. Construct `new ActionLog(db, key, node_id)`.
5. Call `actionLog.replayInto(inMemoryStoreCmdSvcs)` to rebuild in-memory state (§10).
6. Return success with the `ActionLog`.

---

## 5. Migrations

- Location: `src/bun/actionLog/migrations/NNNN_description.ts`, one file per migration, numbered sequentially
  starting at `0001`.
- Each file exports a single forward step: `export function up(db: Database): void`. No `down` — this is a
  local, single-user file with no rollback scenario; a schema mistake is corrected by adding a new forward
  migration, not by reverting a user's already-open financial data.
- Migrations define **schema only** (DDL). Per-file instance data (the crypto material in §4.1, `file_id`,
  `created_at`) is inserted by `createNewFile` itself, immediately after migrations run — not by a migration.
- `export function runMigrations(db: Database): void` reads `schema_version` from `_checquery_meta` (treating a
  missing meta table as version `0`), and runs every migration numbered higher than that, in order, each inside
  its own transaction, updating `schema_version` after each one commits. **It is idempotent** — calling it again
  with nothing pending is a cheap no-op — which is what lets both `db.ts` (which must migrate *before* it can
  read `kdf_salt` to derive a key) and `ActionLog`'s constructor (which self-migrates as a safety net, §3) call
  it without coordinating who goes first.
- If a migration throws, `runMigrations` stops immediately — the database is left at its last successfully
  applied version, and the caller (`createNewFile`/`openExistingFile`) fails with `io-error`.
- `0001` — create `_checquery_meta` (the table `db.ts` already creates today).
- `0002` — create `actions` and its `actions_hlc_idx` index (§6).

Opening a file created by an earlier, pre-encryption development build (i.e. one with only `file_id` /
`created_at` in its meta table, and no `actions` table at all) is out of scope for this version — see §13.

---

## 6. Schema

### 6.1 `_checquery_meta`

Unchanged in shape (`key TEXT PRIMARY KEY, value TEXT NOT NULL`); the new keys it holds are listed in §4.1.
Binary values (`kdf_salt`, `verify_iv`, `verify_ciphertext`) are stored base64-encoded, consistent with
`encrypted_payload` below.

### 6.2 `actions`

```sql
CREATE TABLE actions (
    id                INTEGER PRIMARY KEY,
    action_type       TEXT NOT NULL CHECK (action_type IN (
                          'create-account', 'update-account', 'delete-account',
                          'create-vendor', 'update-vendor', 'delete-vendor',
                          'create-transaction', 'update-transaction', 'delete-transaction',
                          'create-balance-assertion', 'update-balance-assertion', 'delete-balance-assertion',
                          'create-origin'
                      )),
    hlc               TEXT NOT NULL,
    iv                TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL
);

CREATE UNIQUE INDEX actions_hlc_idx ON actions (hlc);
```

- `id` — plain SQLite rowid alias, **local to this one log**. It is never compared or copied across logs (§7) —
  two different `ActionLog`s will happily both have a row with `id = 1`. Nothing outside a single log's own
  queries references an action by this ID, so a client-generated ID (unlike every domain entity's cuid2) isn't
  warranted.
- `action_type` — plaintext; see §10's table for the full vocabulary. Constrained by `CHECK` to the known values
  so a bad value fails fast at insert time rather than surfacing as a decode error during replay.
- `hlc` — plaintext, fixed-width 16-character uppercase hex (`hlcSchema`), so lexical ordering matches temporal
  ordering. `UNIQUE` catches any bug that reuses a clock value *within this log*; across two different logs, the
  per-file random `node_id` (§4.1) is what keeps their HLCs from colliding when actions are ever copied between
  them (§7.2).
- `iv` — base64-encoded 12 random bytes, fresh per row (GCM requires a unique IV per encryption under a given
  key).
- `encrypted_payload` — base64-encoded `ciphertext || authTag` (§9.2), decrypting to the JSON-encoded event
  payload for `action_type` (§8 table).

Leaving `action_type` and `hlc` unencrypted is intentional: it lets the app sort, filter, and paginate the log
without decrypting every row, while the actual financial data (amounts, names, account structure) stays
encrypted in `encrypted_payload`.

---

## 7. Multiple Simultaneous Action Logs

Nothing in `ActionLog` assumes it is the only one, or that its `Database` came from a file. Two use cases need
more than one instance open at a time, plus a way to spin one up with no file at all:

### 7.1 Compaction

Over time, an entity's row is superseded by later patches, or the entity is deleted entirely — the log still
carries every intermediate action forever. Compaction rebuilds a smaller, equivalent log: replay a **source**
`ActionLog` into an in-memory materialized store, then, for each entity still live at the end, emit a single
synthetic `create-*` action (with its current field values) into a **destination** `ActionLog`, skipping deleted
entities and their superseded history entirely.

This requires a source and a destination log open at once — both are ordinary `ActionLog` instances, nothing
special:

```ts
const source = new ActionLog(openDb(oldPath), key, nodeId)
const dest = new ActionLog(openDb(scratchPath), key, nodeId)  // fresh, empty; runMigrations() runs automatically

const store = buildInMemoryStore()
await source.replayInto(store.cmdSvcs)
for (const entity of store.liveEntities()) {
    await dest.appendAction(entity.createActionType, entity.asCreationEvent())
}
// close both; atomically rename scratchPath over oldPath
```

`dest` reuses the *same* `key` and `node_id` as `source` — compaction doesn't change the file's password or
identity, just its history. (A future key-rotation feature — §13 — would look almost identical, except `dest`
gets a freshly generated key instead.)

### 7.2 Synchronization

A future multi-device story needs to merge actions appended to one file into another. Unlike compaction, the two
logs here are genuinely different files with independently generated `kdf_salt`/key/`node_id` — so merging is
**not** a matter of copying `encrypted_payload` bytes across. Each row must be decrypted under its *source* log's
key and re-encrypted (with a fresh IV) under the *destination* log's key:

```ts
for (const action of remoteLog.readActions(lastSyncedHlc)) {
    await localLog.appendAction(action.actionType, action.payload) // payload already carries its original hlc
}
```

Because `action.payload` (a domain event) already carries its own `hlc` from the source log, `appendAction` takes
the "already has an hlc" branch (§8) — it's merged into the destination's master clock via `mergeHLClock` rather
than replaced, so the event's original ordering is preserved across logs. This is exactly why every log gets an
independently random `node_id`: two logs' HLCs are vanishingly unlikely to collide when interleaved this way.

This document doesn't design the full sync protocol (conflict resolution, bidirectional merge, transport) — only
confirms that `ActionLog`'s primitives (`readActions`, `appendAction`, independent keys, independent `node_id`s)
are sufficient building blocks for it later.

### 7.3 Testing: in-memory action logs

```ts
// src/bun/actionLog/inMemory.ts
export function createInMemoryActionLog(opts?: { key?: Buffer; nodeId?: string }): ActionLog {
    const db = new Database(':memory:')
    const key = opts?.key ?? randomBytes(32)
    const nodeId = opts?.nodeId ?? randomNodeId()
    return new ActionLog(db, key, nodeId)  // self-migrates, per §3
}
```

No password, no `.checquery` path, no `_checquery_meta` bookkeeping — a test just wants a working `ActionLog` to
exercise `appendAction`/`readActions`/`replayInto`/`cmdSvcs` against. Because `ActionLog` never imports anything
from `db.ts` or `crypto.ts` (the dependency runs the other way: `db.ts` depends on `ActionLog`), this helper is
the *entire* test setup — a raw random key stands in perfectly well for a password-derived one, since `ActionLog`
can't tell the difference and doesn't need to.

Running the real `0001`/`0002` migrations against `:memory:` (rather than hand-rolling a test-only schema) means
tests exercise the exact same `actions` table shape production does — schema drift between test and production
setup isn't possible by construction.

---

## 8. Hybrid Logical Clock

Every action row's `hlc` is produced using `src/shared/domain/core/HybridLogicalClock.ts`'s existing
`getHLClock` / `advanceHLClock` / `mergeHLClock` functions, keyed by the log's `nodeId` (constructor parameter,
§3; sourced from `_checquery_meta.node_id` for a file-backed log, §4.1).

- **Master HLC**: held in memory for the instance's lifetime. On construction, initialized to `MAX(hlc)` over the
  log's own `actions` table (fixed-width hex encoding means `MAX` by string ordering equals `MAX` by clock
  value), or via `getHLClock(nodeId)` if the table is empty. It is *not* separately persisted in
  `_checquery_meta` — the table itself is the source of truth, and is naturally scoped per-instance (two logs
  never share a master HLC).
- **Event carries an `hlc` already** (the domain event schemas all have an optional `hlc` field — this is the
  common case when copying actions between logs, §7.2): use it as-is for the row, and advance the master via
  `mergeHLClock(master, event.hlc)`.
- **Event has no `hlc`** (the common case for a fresh user edit): generate one via `advanceHLClock(master)`, use
  it for the row, update the master, and stamp it back onto the event object returned from `appendAction` — so
  any `cmdSvc` running after this one in the same `XxxTeeSvc` chain (e.g. the in-memory store) sees the same
  resolved value.

---

## 9. Encryption

### 9.1 Key derivation

- KDF: **scrypt** (`node:crypto`'s `scryptSync`, available under Bun's Node compatibility), with parameters
  stored per-file in `_checquery_meta.kdf_params` (default `N=32768, r=8, p=1, keylen=32`), so future builds can
  strengthen the default for new files without breaking existing ones.
- Input: the user's password + the file's `kdf_salt`.
- Output: a 32-byte key. This is the `key` an `ActionLog` is constructed with — key derivation itself happens in
  `db.ts`/`crypto.ts`, one layer above `ActionLog` (§4.2).
- Held in memory only for as long as its owning `ActionLog` (and, for the app's main document, its `db.ts`
  session) is alive. Never written to disk; not derivable from the file alone.

### 9.2 Row encryption

- Cipher: **AES-256-GCM**.
- Each row gets a fresh random 12-byte IV (`crypto.randomBytes(12)`), stored alongside it (encryption is not
  meaningfully weakened by a public IV — only key secrecy and IV *uniqueness* matter).
- `encrypted_payload = base64(cipher.update(json) + cipher.final() + cipher.getAuthTag())`. Decryption splits the
  last 16 bytes off as the auth tag before calling `decipher.setAuthTag(...)`.
- A failed auth-tag check (wrong key, or a corrupted/tampered row) throws — see §11.

### 9.3 Threat model

This protects data at rest against someone who obtains the `.checquery` file without the password. It does not
protect against a compromise of the running process while a log is open (its key lives in process memory for as
long as the `ActionLog` instance does) — an accepted tradeoff for a personal, single-user finance app.

Key rotation / changing a file's password is **not** implemented by this version, but §7.1's compaction flow
(replay into a fresh log with a new key) is the natural mechanism a future version would use — see §13.

---

## 10. Replay

`replayInto` (§3) is `readActions` plus dispatch: for each `DecodedAction`, call the matching method on the
matching service in `target` (an `IXxxCmdSvc` bundle) per this table:

| Action | Description | Decrypted payload shape | Dispatches to |
|---|---|---|---|
| `create-account` | Create a new account with all fields | `AccountCreationEvent` | `target.accounts.createAccount` |
| `update-account` | Patch one or more fields of an existing account | `AccountPatchEvent` | `target.accounts.patchAccount` |
| `delete-account` | Soft-delete an account | `AccountDeletionEvent` | `target.accounts.deleteAccount` |
| `create-vendor` | Create a new vendor with all fields | `VendorCreationEvent` | `target.vendors.createVendor` |
| `update-vendor` | Patch one or more fields of an existing vendor | `VendorPatchEvent` | `target.vendors.patchVendor` |
| `delete-vendor` | Soft-delete a vendor | `VendorDeletionEvent` | `target.vendors.deleteVendor` |
| `create-transaction` | Create a transaction with its full entry set | `TransactionCreationEvent` | `target.transactions.createTransaction` |
| `update-transaction` | Replace one or more fields of a transaction, including its full entry set | `TransactionPatchEvent` | `target.transactions.patchTransaction` |
| `delete-transaction` | Soft-delete a transaction | `TransactionDeletionEvent` | `target.transactions.deleteTransaction` |
| `create-balance-assertion` | Create a balance assertion | `BalanceAssertionCreationEvent` | `target.balanceAssertions.createBalanceAssertion` |
| `update-balance-assertion` | Patch one or more fields of a balance assertion | `BalanceAssertionPatchEvent` | `target.balanceAssertions.patchBalanceAssertion` |
| `delete-balance-assertion` | Soft-delete a balance assertion | `BalanceAssertionDeletionEvent` | `target.balanceAssertions.deleteBalanceAssertion` |
| `create-origin` | Create an origin | `OriginCreationEvent` | `target.origins.createOrigin` |

There is no `update-origin` or `delete-origin`: origins are immutable once created (see
`src/shared/domain/origins/Origin.ts`). "Soft-delete" for the other entities is a read-model concern — a
`delete-*` action is just another appended event; nothing about the log itself is "soft."

`target` is always a **separate** in-memory store's `IXxxCmdSvc` bundle — never the same `ActionLog` being read
from (or any other `ActionLog`, for that matter). Replaying a log into another `ActionLog` via `replayInto` would
durably re-append every event under a fresh, unrelated `hlc`; cross-log copying is what `readActions` +
`appendAction` are for instead (§7.2), specifically because that path preserves the original `hlc`.

A decrypt failure (bad auth tag) or a JSON/schema failure halts replay immediately with an error identifying the
offending row's `id` and `hlc` — consistent with `functional-spec.md`'s existing replay semantics ("a replay
failure halts the process with an error indicating the offending directive").

`readActions(afterHlc?)` without an argument replays everything (used on file open, §4.3); passing the last
`hlc` a consumer has already seen supports incremental replay (used by sync, §7.2).

---

## 11. Command Service Implementations

`ActionLog.cmdSvcs` (§3) exposes five thin `IXxxCmdSvc` implementations, all delegating to `appendAction`, e.g.:

```ts
class AccountActionLogCmdSvc implements IAccountCmdSvc {
    constructor(private log: ActionLog) {}

    createAccount(e: AccountCreationEvent) { return this.log.appendAction('create-account', e) }
    patchAccount(e: AccountPatchEvent)     { return this.log.appendAction('update-account', e) }
    deleteAccount(e: AccountDeletionEvent) { return this.log.appendAction('delete-account', e) }
}
```

(`VendorActionLogCmdSvc`, `TransactionActionLogCmdSvc`, `BalanceAssertionActionLogCmdSvc`, and
`OriginActionLogCmdSvc` — the last implementing only `createOrigin` — follow the same shape.)

`appendAction` itself:

1. Resolves the event's `hlc` per §8 (using or generating one, advancing the master).
2. Encrypts `JSON.stringify(event)` per §9.2 with a fresh IV.
3. Inserts the row.
4. Returns the event, with `hlc` populated if it wasn't already.

This layer performs no validation beyond what the Zod schemas already enforced upstream, and no uniqueness or
conflict checks — it is a pure append. It therefore never intentionally returns `null`; a `Promise` that resolves
means the row is durably written, and any failure (encryption, I/O) throws rather than resolving to `null`. This
matches the "Mutation Tee" principle in `functional-spec.md` §14: a log write that fails must surface as an
error, not be silently swallowed.

---

## 12. Error Handling

| Situation | Behavior |
|---|---|
| Wrong password on open | `openExistingFile` returns `{ok: false, code: 'wrong-password'}` before touching `actions` (§4.2) |
| File missing/unreadable `_checquery_meta` | `code: 'not-a-checquery-file'` |
| `schema_version` newer than this app build supports | `code: 'unsupported-version'`; refuse to open |
| Migration throws mid-run | Abort; database remains at its last successfully-applied `schema_version`; file-lifecycle callers surface `io-error` |
| Auth-tag failure decrypting a row during replay or cross-log copy | Halt immediately; error names the offending row's `id`/`hlc` |
| Any other encryption/SQLite failure during a write | Throw; propagates through `XxxTeeSvc` as a failed command, per the Mutation Tee principle |

---

## 13. Non-Goals (this version)

- **No `IXxxQrySvc` implementation.** All queries are served by a separate in-memory store, rebuilt via replay.
- **No support for pre-encryption files.** Files created by development builds that predate this spec (only
  `file_id` / `created_at` in `_checquery_meta`, no `actions` table) are not migratable; recreate them.
- **No password change / key rotation, and no built sync protocol.** §7 establishes that `ActionLog`'s
  primitives are sufficient to build both on top of later (compaction into a freshly-keyed log; cross-log
  `readActions`/`appendAction` copying); neither is fully designed or implemented here.
- **No multi-process file locking** beyond what SQLite itself provides. One reader/writer per file at a time for
  the app's main document; compaction/sync scenarios that hold two files open are expected to manage their own
  short-lived locking around the atomic swap in §7.1.
