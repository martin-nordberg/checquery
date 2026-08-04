# Action Log Changes — Implementation Plan

> Refactoring plan for `src/bun/actionLog/**` (built and committed). Confirmed with the user: no new
> crudServices interfaces for Action, `payload` stays `unknown`, lookup tables record only an entity's own
> direct create/patch/delete actions (not cross-referenced from other entity types), and this pass includes a
> read-side query method per entity. Since migration `0002` has never shipped in any real file, it's edited in
> place — no `0003`.

---

## 1. `Action` becomes a domain entity

New folder `src/shared/domain/actions/`, following the `Origin` pattern (`src/shared/domain/origins/`) as the
closest precedent — immutable, no patch/delete lifecycle.

### `ActnId.ts`

Exact mirror of `AcctId.ts`/`VndrId.ts`/etc: `actnIdPrefix = 'actn'`, `actnIdLength = 28`, `actnIdSchema` (cuid2,
branded `'ActnId'`), `genActnId()`.

### `ActionType.ts` (moved from `src/bun/actionLog/ActionType.ts`)

Moves here because `Action`'s own schema needs to validate its `actionType` field, the same reason `AcctType.ts`
sits next to `Account.ts` rather than living wherever happened to consume it first. Gains a real Zod schema to
match that pattern (today it's a bare TS union + array, no schema):

```ts
export const actionTypeSchema = z.enum([...ACTION_TYPES] as [ActionType, ...ActionType[]])
export type ActionType = 'create-account' | 'update-account' | ... // unchanged, 13 values
export const ACTION_TYPES: readonly ActionType[] = [...]            // unchanged
```

Every current importer of `./ActionType` under `src/bun/actionLog/` (the migration, `ActionLog.ts`, all five
`XxxActionLogCmdSvc.ts`) switches to the new path.

### `Action.ts`

One schema, not the usual read/creation split. Every other entity splits because *something external* builds a
partial creation event before the entity's full state exists (e.g. a UI supplies `AccountCreationEvent` without
`hlc`, and `ActionLog.appendAction` fills it in later). Action has no such moment: `ActionLog` mints its `id`
(`ActnId`) and resolves its `hlc` together, atomically, immediately before constructing the row — there is never
a partially-formed `Action` for a second schema to describe. So:

```ts
const actionAttributesSchema = z.strictObject({
    id: actnIdSchema,
    actionType: actionTypeSchema,
    hlc: hlcSchema,
    payload: z.unknown(),
})

export const actionReadSchema = actionAttributesSchema.readonly()
export type Action = z.infer<typeof actionReadSchema>
```

This directly replaces `DecodedAction` in `ActionLog.ts` (same four fields, `id` now `ActnId` instead of
`number`, `hlc` required rather than the ad hoc inline shape).

**Tests**: `ActnId.test.ts` mirrors `AcctId.test.ts`. `Action.test.ts` mirrors `Origin.test.ts`'s read-schema
half only (no creation-event tests, since there isn't one) — valid parse, each field's rejection case, unknown
properties rejected, `payload` accepts arbitrary values (it's `z.unknown()`).

---

## 2. Schema changes (edit `migrations/0002_actions.ts` in place)

`actions.id` changes from `INTEGER PRIMARY KEY` (autoincrement rowid) to `TEXT PRIMARY KEY` (an `ActnId`, minted
by `ActionLog` the same way `genAcctId()` etc. are minted by whoever builds those entities — except here, the
"whoever" is `ActionLog.appendAction` itself, since nothing external ever constructs an `Action`).

Five new lookup tables, one per entity, each a minimal two-column table mapping an action back to the one entity
it directly acted on — **not** populated by any other action type (a `create-transaction`'s entries touching
accounts A and B does *not* add rows to `account_actions`; only `account_actions`' own create/patch/delete
actions do, per the confirmed scope):

```sql
CREATE TABLE actions (
    id                TEXT PRIMARY KEY,
    action_type       TEXT NOT NULL CHECK (action_type IN (...)),
    hlc               TEXT NOT NULL,
    iv                TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL
);
CREATE UNIQUE INDEX actions_hlc_idx ON actions (hlc);

CREATE TABLE account_actions (
    actn_id TEXT PRIMARY KEY REFERENCES actions (id),
    acct_id TEXT NOT NULL
);
CREATE INDEX account_actions_acct_id_idx ON account_actions (acct_id);

-- vendor_actions(actn_id PK, vndr_id)             + vendor_actions_vndr_id_idx
-- transaction_actions(actn_id PK, txn_id)          + transaction_actions_txn_id_idx
-- balance_assertion_actions(actn_id PK, asrt_id)   + balance_assertion_actions_asrt_id_idx
-- origin_actions(actn_id PK, orig_id)              + origin_actions_orig_id_idx
```

`actn_id` is the table's own primary key (not a surrogate) because the relationship is genuinely 1:1 under this
scope — each action populates exactly one lookup table, exactly one row, since every action type maps to exactly
one entity type. This is also what makes the `id`/`orig_id`/etc. column names asymmetric with `materialized-store.md`'s
tables on purpose: these are pure lookup indexes, not entities, so there's no `is_deleted`, no `orig_id` (the
*origin* concept), nothing beyond "which action, which entity."

**`runMigrations.test.ts`** gains assertions for all five new tables' existence/columns, alongside the existing
`actions` table check (which now expects `id` to accept `TEXT`, i.e. no schema-level test change needed there
beyond confirming the column list is unchanged in *name*).

---

## 3. `ActionLog.ts` changes

- **`appendAction`'s generic constraint widens** from `E extends { hlc?: HLClock }` to
  `E extends { id: string, hlc?: HLClock }`. Safe: every `*CreationEvent`/`*PatchEvent`/`*DeletionEvent` across
  all five entities already has a required, non-optional `id`. This lets `appendAction` read
  `resolvedEvent.id` generically to populate the right lookup table, without threading an extra parameter
  through every `XxxActionLogCmdSvc` call site (which don't change at all).
- **`appendAction` additionally**: mints `const id = genActnId()`; inserts it as the `actions` row's `id`; looks
  up `{table, column}` for the given `actionType` from a small exhaustive `Record<ActionType, {table: string,
  column: string}>` (13 entries, all real — no `null` case, since all five entities get a lookup table); inserts
  `(actn_id, <column>) VALUES (id, resolvedEvent.id)` into that table.
- **Row decoding** (decrypt → `JSON.parse` → construct) is currently inlined in `readActions`. Pulled out into a
  private `decodeRow(row: ActionRow): Action` so the five new query methods (below) can reuse it instead of
  duplicating the try/catch-and-throw-with-row-context logic six times.
- **Five new query methods**, one per entity, each a thin generator joining that entity's lookup table back to
  `actions`, oldest-first, decoded the same way as `readActions`:

  ```ts
  *readActionsForAccount(acctId: AcctId): IterableIterator<Action> {
      const rows = this.db.query(`
          SELECT a.id, a.action_type, a.hlc, a.iv, a.encrypted_payload
          FROM actions a JOIN account_actions la ON la.actn_id = a.id
          WHERE la.acct_id = ?
          ORDER BY a.hlc ASC
      `).all(acctId) as ActionRow[]
      for (const row of rows) yield this.decodeRow(row)
  }
  ```

  `readActionsForVendor`, `readActionsForTransaction`, `readActionsForBalanceAssertion`,
  `readActionsForOrigin` follow identically. `DecodedAction` is deleted; every place that referenced it now
  references `Action`.

**Test ripple** (mechanical, but real): `ActionLog.test.ts`'s local `fixture()` helper and
`replayDispatch.test.ts`'s per-action-type fixtures currently build payloads like `{ name: 'Jane' }` with no
`id` — these need an `id` added (e.g. `genOrigId()`/a placeholder string) now that `appendAction` requires one.
New tests: each `readActionsForXxx` returns only that entity's own actions, in hlc order, and excludes actions
for a *different* instance of the same entity type (e.g. two accounts, only one shows up when queried).

---

## 4. Explicitly out of scope

- **`MaterializedStore`**: untouched. It only ever sees `action.payload` (an already-typed domain event) via
  `replayInto`'s dispatch, never the row's own new `ActnId` or the lookup tables — those are purely
  `ActionLog`-internal.
- **Cross-referencing** (a transaction's entries populating `account_actions`, its `vndrId` populating
  `vendor_actions`, a balance assertion populating `account_actions`): confirmed out of scope. `account_actions`
  answers "when was this account itself created/edited/deleted," not "every transaction that ever touched it" —
  the latter would need `MaterializedStore`'s `entries` table (already join-able for exactly this) once a
  register-style query is built there, not a second copy of the same information in `ActionLog`.
- **`payload` typing**: stays `unknown`, cast at the point of use (`dispatchAction`) exactly as today.

---

## 5. Verification

1. `bun test` — full suite green, including new `ActnId.test.ts`, `Action.test.ts`, expanded
   `runMigrations.test.ts`, and new `readActionsForXxx` coverage in `ActionLog.test.ts`.
2. `bun x tsc --noEmit -p tsconfig.json` — clean aside from the pre-existing unrelated `three` module warning.
3. A quick end-to-end sanity check: append a `create-account`, a `patch-account`, and a `create-vendor` into one
   `ActionLog`; confirm `readActionsForAccount` returns exactly the first two (in order) and
   `readActionsForVendor` returns exactly the third.
