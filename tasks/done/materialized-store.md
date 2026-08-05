# Checquery — Materialized Store Specification

> Scope: the in-memory SQLite store that holds *current* entity state — the other branch of each entity's
> `XxxTeeSvc`, alongside the `ActionLog` (see `action-log.md`). Where the action log is a write-only, encrypted,
> append-only history, this store is an ordinary, unencrypted, read/write set of tables holding only the latest
> value of each entity. It is the sole implementation of every `IXxxQrySvc`, the replay target referenced
> throughout `action-log.md`, and the data source the UI queries directly.

---

## 1. Purpose & Scope

This spec covers:

- A `MaterializedStore` class wrapping an in-memory (`:memory:`) `bun:sqlite` `Database`, with ordinary tables for
  account categories, accounts, vendors, transactions (+ entries), balance assertions, and origins — each
  holding only current values, not history.
- How domain event types (`AccountCreationEvent`, `TransactionPatchEvent`, etc.) map onto SQL `INSERT`/`UPDATE`
  statements, implementing every `IXxxCmdSvc`.
- How every `IXxxQrySvc` (`findAccountById`, `findVendorsAll`, `isAccountInUse`, etc.) is implemented as SQL
  `SELECT`s against those same tables.
- Soft-delete semantics, and the value-mapping conventions (currency-as-cents, dates, booleans) that make the
  schema usable for the reporting queries this store exists to serve.
- What this store establishes but does **not** yet formalize: dedicated query interfaces for the register,
  balance sheet, and income statement views. §9 shows the schema already supports the SQL those views need;
  designing typed service interfaces around that SQL is left to a follow-up spec, the same way `action-log.md`
  established that its primitives were *sufficient* for sync without designing the full sync protocol.

---

## 2. Architectural Context

Per `action-log.md` §2, each entity's `XxxTeeSvc` fans a command out to a list of `IXxxCmdSvc` implementations.
This store is the **second** one in that list, after the `ActionLog`:

1. `ActionLog` — appends the durable, encrypted record and resolves the event's `hlc` if it wasn't already set.
2. **This store** — applies the (now fully resolved) event to its tables. This is what every `IXxxQrySvc` reads
   from; nothing else in the system answers a query.

It is also `action-log.md` §4.3 and §7's **replay target**: on file open, a fresh, empty `MaterializedStore` is
built, then `actionLog.replayInto(store.cmdSvcs)` drives every historical action back through the exact same
`IXxxCmdSvc` methods a live user action would use — there is no separate "replay mode" code path.

Like `ActionLog`, a `MaterializedStore` is an ordinary class with no module-level singleton state — its
`Database` handle and all state live on the instance. This matters for the same two reasons `action-log.md` §7
called out for `ActionLog`:

- **Compaction** needs a throwaway store to replay a source log into, purely to ask "what entities are currently
  live, and with what field values?" before re-emitting them as fresh `create-*` actions into a destination log.
  That throwaway store is constructed, used, and discarded — it never becomes "the" app's live store.
- **Tests** construct a `MaterializedStore` directly and drive it with hand-built events, with no file, password,
  or `ActionLog` involved at all.

Unlike `ActionLog`, there's no file-vs-memory fork to design here: this store is *always* in-memory, so the
"real" store and the "test" store are the same class used the same way — see §3.

---

## 3. Lifecycle

```ts
// src/bun/materializedStore/MaterializedStore.ts

class MaterializedStore {
    constructor()   // opens new Database(':memory:'), creates all tables (§4) — nothing to migrate, see below

    readonly cmdSvcs: CmdSvcBundle   // same shape as ActionLog.cmdSvcs (action-log.md §3)
    readonly qrySvcs: QrySvcBundle   // one property per entity's IXxxQrySvc
}

type QrySvcBundle = {
    accounts: IAccountQrySvc
    vendors: IVendorQrySvc
    transactions: ITransactionQrySvc
    balanceAssertions: IBalanceAssertionQrySvc
    origins: IOriginQrySvc
}
```

- **No migrations.** `action-log.md` §5 needs a migration system because a `.checquery` file persists across app
  upgrades and must evolve in place. This store is rebuilt from nothing every time the app opens a file (or a
  test starts) — there is never old data to migrate, so the constructor just runs one fixed `CREATE TABLE` script
  against the fresh `:memory:` database, every time.
- **Rebuild = replay.** On file open: construct an empty `MaterializedStore`, then
  `await actionLog.replayInto(store.cmdSvcs)` (`action-log.md` §10). Once replay finishes, the same `cmdSvcs`
  bundle keeps receiving live commands through the entities' `XxxTeeSvc`s — replay and live operation are the
  same code path, just different callers.
- **Testing** is simply `new MaterializedStore()` — the production constructor *is* the test constructor. Tests
  call `store.cmdSvcs.accounts.createAccount(...)` directly and assert against `store.qrySvcs.accounts.find...`,
  with no `ActionLog`, password, or file in the picture.

---

## 4. Schema

### Value mapping

| Domain type | SQL column type | Mapping |
|---|---|---|
| Branded ID (`AcctId`, `AcctCtgId`, `VndrId`, `TxnId`, `AsrtId`, `OrigId`) | `TEXT` | stored as-is — already a validated string |
| `NameStr` / `DescriptionStr` | `TEXT` | stored as-is |
| `IsoDate` | `TEXT` | stored as-is; `'YYYY-MM-DD'` sorts lexically the same as chronologically |
| `AcctTypeStr` (enum) | `TEXT` | stored as-is |
| `CurrencyAmt` (e.g. `"$1,234.56"`) | `INTEGER` (cents) | `toCents()` on write, `fromCents()` on read — see below |
| `boolean` | `INTEGER` (`0`/`1`) | straightforward cast |
| optional field (`X \| undefined`) | nullable column | `undefined` ↔ `NULL` |

Amounts are stored as integer cents, not as `CurrencyAmt` strings, specifically so report queries can `SUM()`
and `GROUP BY` them directly in SQL (§9) rather than pulling every row into JS first — the reason to use SQLite
here at all rather than a plain in-memory `Map`. `toCents`/`fromCents` already exist in
`src/shared/domain/core/CurrencyAmt.ts` and are the conversion boundary in both directions.

### 4.1 `account_categories` and `accounts`

Accounts are flat leaves; the recursive hierarchy lives in `account_categories` instead (an earlier design
made accounts themselves hierarchical via a self-referencing `parent_id` -- that was reverted in favor of
this split, see `documentation/account-categories-implementation-plan.md`). Every account's `parent_ctg_id`
is required and always references a category, never another account.

```sql
CREATE TABLE account_categories (
    id            TEXT PRIMARY KEY,
    orig_id       TEXT NOT NULL,
    parent_ctg_id TEXT REFERENCES account_categories (id),
    acct_type     TEXT NOT NULL,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL,
    is_deleted    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX account_categories_parent_ctg_id_idx ON account_categories (parent_ctg_id);

CREATE TABLE accounts (
    id            TEXT PRIMARY KEY,
    orig_id       TEXT NOT NULL,
    parent_ctg_id TEXT NOT NULL REFERENCES account_categories (id),
    acct_type     TEXT NOT NULL,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL,
    is_primary    INTEGER NOT NULL,
    is_deleted    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX accounts_parent_ctg_id_idx ON accounts (parent_ctg_id);
```

The five root categories (one per `AcctTypeStr`) are virtual, fixed IDs (`AcctCtgRoot.ts`) never inserted as
real rows -- same convention the old per-type root accounts used. Net Worth (`acctIdNetWorth`) is the one
exception on the `accounts` side: it *is* a real, seeded row (the only `EQUITY` account, a direct child of
the Equity root category), since real ledger entries can post to it directly.

### 4.2 `vendors`

```sql
CREATE TABLE vendors (
    id              TEXT PRIMARY KEY,
    orig_id         TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    default_acct_id TEXT REFERENCES accounts (id),
    is_active       INTEGER NOT NULL,
    is_deleted      INTEGER NOT NULL DEFAULT 0
);
```

### 4.3 `transactions` and `entries`

An `Entry` (`src/shared/domain/transactions/Entry.ts`) has no domain ID of its own — it's never independently
addressed, and `TransactionPatchEvent`'s `entries` field replaces the *entire* set on any change that touches it
("Changes to entries replace the entire set of entries for that transaction," per `functional-spec.md` §6).
`entries` is therefore its own table with a surrogate key, keyed only by the parent transaction, with an
`ordinal` column to preserve display order (SQL row order isn't otherwise guaranteed).

```sql
CREATE TABLE transactions (
    id           TEXT PRIMARY KEY,
    orig_id      TEXT NOT NULL,
    post_date    TEXT NOT NULL,
    cleared_date TEXT,
    code         TEXT NOT NULL,
    vndr_id      TEXT REFERENCES vendors (id),
    description  TEXT NOT NULL,
    needs_review INTEGER NOT NULL,
    is_deleted   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX transactions_post_date_idx ON transactions (post_date);
CREATE INDEX transactions_vndr_id_idx ON transactions (vndr_id);

CREATE TABLE entries (
    id             INTEGER PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions (id),
    ordinal        INTEGER NOT NULL,
    acct_id        TEXT NOT NULL REFERENCES accounts (id),
    debit_cents    INTEGER NOT NULL,
    credit_cents   INTEGER NOT NULL
);

CREATE INDEX entries_transaction_id_idx ON entries (transaction_id);
CREATE INDEX entries_acct_id_idx ON entries (acct_id);
```

`entries.id` is a SQL-only implementation detail — it never appears in the `Entry` domain type and is never
exposed through any `IXxxQrySvc`. `entries` has no `is_deleted` of its own; a deleted transaction's entries stay
in the table but are excluded from every query the moment it joins through `transactions` and filters
`is_deleted = 0` (§7, §9) — there's no separate flag to keep in sync.

### 4.4 `balance_assertions`

```sql
CREATE TABLE balance_assertions (
    id            TEXT PRIMARY KEY,
    orig_id       TEXT NOT NULL,
    acct_id       TEXT NOT NULL REFERENCES accounts (id),
    cleared_date  TEXT NOT NULL,
    balance_cents INTEGER NOT NULL,
    is_deleted    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX balance_assertions_acct_id_idx ON balance_assertions (acct_id);
```

### 4.5 `origins`

```sql
CREATE TABLE origins (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    ip_address TEXT NOT NULL
);
```

No `orig_id` (an origin doesn't attribute itself to another origin) and no `is_deleted` — origins are immutable
and never deleted (`src/shared/domain/origins/Origin.ts`; `action-log.md` §10 has no `delete-origin` action).

### Constraint strictness

Foreign keys, `NOT NULL`, and `PRIMARY KEY` are enforced structurally, as above. Business rules that the domain
layer already checks when an event is constructed — account/vendor name uniqueness, an entry's debit-xor-credit,
a transaction's balanced entries — are **not** re-enforced here (e.g. no `UNIQUE(name)`). This store trusts the
Zod-validated events it's handed; duplicating those rules at the SQL layer risks the two definitions drifting
apart, for no real safety gain given every write already passed through schema validation to become an event in
the first place.

---

## 5. Soft Deletion

Every entity that supports deletion (`Account`, `AccountCategory`, `Vendor`, `Transaction`, `BalanceAssertion` — not `Origin`, which
has no delete action at all) carries `is_deleted`. A `delete-*` action sets `is_deleted = 1` and updates `orig_id`
to the deleting event's `origId` (deletion is itself a "touch," same as a patch); it never clears other columns —
"soft-delete... data is retained so that historical transactions remain valid" (`functional-spec.md` §3.1).

This produces one deliberate asymmetry across the query methods:

- **`findXById` includes soft-deleted rows.** Something that already has an entity's ID in hand — a register row
  whose account was later deleted, an old transaction naming a since-deactivated vendor — needs to still resolve
  it for display. Filtering these out here would silently break exactly the "historical data stays valid"
  guarantee soft-delete exists to provide.
- **`findXAll` excludes them.** The whole point of a plain listing (an account picker, a vendor autocomplete) is
  to show what's currently choosable, matching `functional-spec.md`'s "shows all non-deleted accounts" (§4).

`isAccountInUse` / `isVendorInUse` only count *live* references: an account referenced solely by a since-deleted
transaction, or a vendor that was itself a since-deleted vendor's default account, is no longer "in use" — once
nothing live points at it, it becomes deletable. Concretely:

```sql
-- isAccountInUse(acctId)
SELECT EXISTS (
    SELECT 1 FROM entries e JOIN transactions t ON t.id = e.transaction_id
    WHERE e.acct_id = ? AND t.is_deleted = 0
) OR EXISTS (
    SELECT 1 FROM vendors WHERE default_acct_id = ? AND is_deleted = 0
);

-- isVendorInUse(vndrId)
SELECT EXISTS (
    SELECT 1 FROM transactions WHERE vndr_id = ? AND is_deleted = 0
);
```

---

## 6. Command Service Implementations

Each entity gets a thin `IXxxCmdSvc` implementation translating an event into `INSERT`/`UPDATE` statements.

### Create

A straight `INSERT`, e.g.:

```ts
createAccount(e: AccountCreationEvent) {
    db.run(
        `INSERT INTO accounts (id, orig_id, parent_ctg_id, acct_type, name, description, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        e.id, e.origId, e.parentCtgId, e.acctType, e.name, e.description, e.isPrimary ? 1 : 0
    )
    return e
}
```

`createTransaction` additionally inserts one `entries` row per entry (`ordinal` 0..n-1, amounts via `toCents`).
`createOrigin` is the only command `IOriginCmdSvc` defines — origins have no patch or delete.

### Patch

An `UPDATE` touching only the columns present on the patch event — every `*PatchEvent` schema already models
"absent means unchanged" this way, so the SQL just mirrors it directly (build the `SET` clause from whichever
keys are present, always including `orig_id`, which every patch carries per its non-optional `origId`). For
`patchTransaction`, if `entries` is present, `DELETE FROM entries WHERE transaction_id = ?` and re-insert the new
array fresh (new `ordinal`s, new surrogate `entries.id`s) — a full replace, matching the domain semantics in §4.3
exactly; if `entries` is absent, the existing entry rows are untouched.

### Delete

An `UPDATE ... SET is_deleted = 1, orig_id = ?` (§5) — never a `DELETE FROM`.

### Failure contract

Matches `action-log.md` §11's "Mutation Tee" principle exactly, and matters more here because this store
normally runs *second* in each `XxxTeeSvc`'s `cmdSvcs` list, after the `ActionLog` has already durably committed
the same event:

- A patch or delete that affects zero rows (an `id` the store doesn't have) is treated as a hard inconsistency,
  not a silent no-op — throw. This should never legitimately happen (the log is authoritative and both replay
  and live writes apply events in the order they were created), so if it does, something upstream is wrong and
  needs to be loud about it rather than leaving the store silently out of sync with the log.
- Any other write failure (a constraint violation, a driver error) throws rather than returning `null` — a
  `null` return from an `IXxxCmdSvc` method reads as "this stage intentionally declined the write," which is
  never true here; every genuine failure is an exception.

---

## 7. Query Service Implementations

Each `IXxxQrySvc` method is a direct `SELECT`, applying §5's soft-delete asymmetry:

```ts
findAccountById(id: AcctId)   { /* SELECT * FROM accounts WHERE id = ?              (no is_deleted filter) */ }
findAccountsAll()             { /* SELECT * FROM accounts WHERE is_deleted = 0 ORDER BY name */ }
isAccountInUse(id: AcctId)    { /* §5 */ }

findAccountCategoryById(id: AcctCtgId)  { /* SELECT * FROM account_categories WHERE id = ?    (no is_deleted filter) */ }
findAccountCategoriesAll()              { /* SELECT * FROM account_categories WHERE is_deleted = 0 ORDER BY name */ }
isAccountCategoryInUse(id: AcctCtgId)   { /* true iff any live child category or child account references id */ }

findVendorById(id: VndrId)    { /* SELECT * FROM vendors WHERE id = ?               (no is_deleted filter) */ }
findVendorsAll()               { /* SELECT * FROM vendors WHERE is_deleted = 0 ORDER BY name */ }
isVendorInUse(id: VndrId)      { /* §5 */ }

findTransactionById(id: TxnId) { /* transaction row + its entries (ORDER BY ordinal), no is_deleted filter */ }

findBalanceAssertionById(id: AsrtId)  { /* SELECT * FROM balance_assertions WHERE id = ? */ }
findBalanceAssertionsAll()            { /* ... WHERE is_deleted = 0 */ }

findOriginById(id: OrigId)    { /* SELECT * FROM origins WHERE id = ? */ }
findOriginsAll()               { /* SELECT * FROM origins */ }
```

Reassembling a row into its domain type reverses §4's value mapping (`fromCents`, `0`/`1` → `boolean`, `NULL` →
`undefined`), and for transactions, folds in its ordered `entries` rows. None of these throw for "not found" —
`findXById` resolves `null`, `findXAll` resolves `[]`; only a genuine SQL/driver failure throws.

---

## 8. Multiple Simultaneous Stores & In-Memory Testing

Covered inline above (§2, §3) rather than as a separate mechanism, since — unlike `ActionLog` — there's no
file/memory fork to design: every `MaterializedStore` is already the "in-memory" variant. The same guarantee
`action-log.md` §7 established for `ActionLog` (no module-level singleton, so compaction and tests can construct
extra instances freely) holds here by the same reasoning: all state lives on the instance, so nothing prevents a
throwaway store used only to answer "what's currently live?" during compaction, alongside the app's one real
live store, alongside however many a test suite constructs.

---

## 9. Report-Query Readiness (illustrative, non-normative)

Per this spec's scope (§1), no `IRegisterQrySvc`/`IReportQrySvc`-style interfaces are defined here — only that
the schema in §4 already supports the queries those interfaces will eventually wrap. For example:

```sql
-- Register: every entry posted to one account, oldest first, with a running balance
SELECT t.id, t.post_date, t.code, t.vndr_id, t.description, e.debit_cents, e.credit_cents,
       SUM(e.debit_cents - e.credit_cents) OVER (ORDER BY t.post_date, t.id) AS running_balance_cents
FROM entries e
JOIN transactions t ON t.id = e.transaction_id
WHERE e.acct_id = ? AND t.is_deleted = 0
ORDER BY t.post_date, t.id;

-- Balance sheet: net balance per account, as of a date
SELECT a.id, a.name, a.acct_type, SUM(e.debit_cents - e.credit_cents) AS balance_cents
FROM entries e
JOIN transactions t ON t.id = e.transaction_id
JOIN accounts a ON a.id = e.acct_id
WHERE t.is_deleted = 0 AND t.post_date <= ?
GROUP BY a.id;

-- Income statement: net activity per account, within a period
SELECT a.id, a.name, a.acct_type, SUM(e.debit_cents - e.credit_cents) AS balance_cents
FROM entries e
JOIN transactions t ON t.id = e.transaction_id
JOIN accounts a ON a.id = e.acct_id
WHERE t.is_deleted = 0 AND t.post_date BETWEEN ? AND ? AND a.acct_type IN ('EXPENSE', 'INCOME')
GROUP BY a.id;
```

Two real design questions remain open for that follow-up spec, deliberately unresolved here:

- **Hierarchical rollup.** Categories form a parent/child tree under five predefined root categories
  (`src/shared/domain/accountCategories/AcctCtgRoot.ts`), with accounts as leaves under them; a balance sheet
  section total needs an account's balance rolled up into its category ancestors, which the per-account query
  above doesn't do (a recursive CTE over `account_categories.parent_ctg_id` joined out to `accounts` is the
  likely shape, but isn't designed here).
- **Where a running balance is computed.** The register example above uses a SQL window function; whether that's
  the actual implementation or an application-level running total is an open call for that spec, not this one.

---

## 10. Error Handling

| Situation | Behavior |
|---|---|
| Patch/delete affects zero rows | Throw — a hard inconsistency, not a no-op (§6) |
| Constraint violation or other write failure | Throw; propagates through `XxxTeeSvc` as a failed command |
| `findXById` / `findOriginById` for a nonexistent ID | Resolves `null` — not an error |
| `findXAll` with no matching (non-deleted) rows | Resolves `[]` — not an error |
| Genuine SQL/driver failure during a query | Throws |

---

## 11. Non-Goals (this version)

- **No persistence, no migrations.** Purely in-memory; rebuilt from nothing on every construction (§3).
- **No new report/register query interfaces.** Established as supportable (§9), not designed.
- **No hierarchical rollup logic** for balance-sheet section totals — deferred alongside §9.
- **No HLC-based conflict resolution.** Replay and live writes both apply events in creation order today, so
  last-write-wins comparison isn't needed yet; `action-log.md` §7.2 already notes this is a natural extension
  point once real multi-device sync exists, and nothing here forecloses adding it later.
- **No SQL-level re-enforcement of domain business rules** (name uniqueness, balanced entries, debit-xor-credit)
  — trusts the Zod-validated events it's given (§4's "Constraint strictness").
