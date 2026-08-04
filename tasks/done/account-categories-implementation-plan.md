# Account Categories — Implementation Plan

> Covers introducing `AccountCategory` as the recursive hierarchy holder and making `Account` flat (per
> `account-categories.md`): every account always has a parent *category*, never a parent *account*. Net
> Worth becomes a real, seeded, singleton `EQUITY` account instead of a virtual childless root. This
> reverses the account-list-implementation-plan.md direction (Account-to-Account `parentId` trees) per the
> decision that the fully-hierarchical-accounts experiment had ramifications that weren't wanted — accounts
> go back to being flat, and only categories nest.

---

## 0. Governing constraints

- **Accounts never parent other accounts again.** `Account.parentId` (an `AcctId`) is removed entirely,
  replaced by `Account.parentCtgId` (an `AcctCtgId`), which is **required on every account, with no
  exceptions** — including Net Worth (see §3). There is no more "root account with no parent" concept;
  that job now belongs entirely to the five root *categories*.
- **`acctType` stays immutable**, exactly as today (`accountPatchEventSchema.omit({acctType: true})`) — this
  refactor doesn't touch that rule, just extends the same "immutable at creation, no patch field at all"
  treatment to `AccountCategory.acctType` too.
- **Net Worth is the only account that may sit directly under a root category.** Every other account must
  have at least one level of user-created categorization between it and its type's root. This means the
  page-header "add" affordance (today's single green "+" that creates a top-level *account*) can no longer
  create an account for Asset/Liability/Income/Expense pages — only a top-level *category* (§7).
- **Uniqueness is a client-side pre-check, not a schema or SQL constraint** (per your call on this) —
  category names and account names share one namespace per parent category, checked in the mainview before
  submit, mirroring the existing `isAccountInUse`-before-delete UI-guard pattern rather than adding a new
  service-layer rejection contract.
- **Migration 0002 is edited in place**, not superseded by a 0003 (per your call) — there's no real user
  data yet, so the "actions" lookup-table schema simply gains one more table up front, same as if it had
  been designed with categories from the start.

---

## 1. Domain layer

### 1a. `AcctCtgId` — `src/shared/domain/accountCategories/AcctCtgId.ts`

Mirrors `AcctId.ts` exactly: CUID2, length 28, prefix `'actg'`, `.brand('AcctCtgId')`, `genAcctCtgId()`.

### 1b. `AcctCtgRoot.ts` — `src/shared/domain/accountCategories/AcctCtgRoot.ts`

Takes over the role `AcctRoot.ts` plays today, but for categories:

- Five predefined, fixed `AcctCtgId` constants (padded literal strings, same style as today's
  `acctIdAssets` etc.): `acctCtgIdAssets`, `acctCtgIdLiabilities`, `acctCtgIdEquity`, `acctCtgIdIncome`,
  `acctCtgIdExpenses`.
- `acctCtgRootId: Record<AcctTypeStr, AcctCtgId>`.
- `acctCtgRootName: Record<AcctTypeStr, NameStr>` — `ASSET→"Assets"`, `LIABILITY→"Liabilities"`,
  `EQUITY→"Equity"` (not "Net Worth" — that name now belongs to the one account under this category),
  `INCOME→"Income"`, `EXPENSE→"Expenses"`.
- `isRootAcctCtgId()`, `acctTypeForRootCtgId()` — same shape as today's `isRootAcctId`/`acctTypeForRootId`.
- **These five stay virtual, never inserted as real rows** — exactly like today's five root accounts,
  which the investigation confirmed are never actually seeded anywhere; they exist purely as fixed IDs that
  child rows point at and that pickers special-case as a `"(top level)"` option. Nothing about this
  refactor changes that convention for categories.

### 1c. `NetWorthAccount.ts` — `src/shared/domain/accounts/NetWorthAccount.ts` (new, replaces `AcctRoot.ts`)

`AcctRoot.ts` is deleted outright — four of its five root accounts don't exist anymore (they're
categories now), and the uniform "one root account per type" `Record` it built no longer makes sense for a
set of one. What's left is a single fixed constant:

```ts
export const acctIdNetWorth: AcctId = acctIdSchema.parse("acctnetworth0000000000000000") // same literal as today
export const netWorthAccountName: NameStr = nameSchema.parse("Net Worth")
```

Unlike the virtual category roots, **Net Worth must be a real, insertable `Account` row** — unlike the old
virtual root accounts (which never received ledger entries directly), Net Worth is a genuine post-able
`EQUITY` account: things like an opening-balance equity entry need a real row to debit/credit. See §4 for
seeding.

### 1d. `AccountCategory` — `src/shared/domain/accountCategories/AccountCategory.ts`

Same three-schema shape as `Account.ts` (`accountCategoryReadSchema`, `accountCategoryCreationEventSchema`,
`accountCategoryDeletionEventSchema`, `accountCategoryPatchEventSchema`), fields: `id` (`AcctCtgId`),
`origId` (`OrigId`), `parentCtgId` (`AcctCtgId`, optional — absent **iff** this is one of the five roots),
`acctType` (`AcctTypeStr`, immutable — omitted from the patch schema exactly like `Account.acctType`),
`name` (`NameStr`), `description` (`DescriptionStr`). **No `isPrimary`** — that's an account-only,
dashboard-surfacing concept; categories are purely structural.

Refinements, mirroring `Account.ts`'s three almost exactly (renamed for categories):

- `noSelfParentCtg` — a category can't be its own parent (applies to read/creation/patch, same as today).
- `rootIffNoParentCtg` — a category has no parent iff it's one of the five predefined roots (read/creation
  only).
- `rootAcctTypeMatchesCtg` — a root category's `acctType` must match what it represents (read/creation
  only).

Same explicit non-goal as today's `Account.ts` comment: "parent's acctType must match" and "no cycles
through other categories" are **not** checked here (need the full category set) — enforced in application
code via a category-scoped parent picker (§6), same division of responsibility as today.

### 1e. `Account.ts` rewrite

- Delete `parentId` (`AcctId`); add `parentCtgId: AcctCtgId` (**required**, not `.optional()`).
- **Delete** `noSelfParent`, `rootIffNoParent`, `rootAcctTypeMatches` entirely — accounts no longer parent
  each other and no account is ever "the root with no parent," so none of these three invariants apply
  anymore.
- **Add** two new refinements (read/creation schemas only, same "can't check on a patch, `acctType`/`id`
  aren't both present" reasoning as today's immutability comments):
  - `equityAccountIsNetWorth` — if `acctType === 'EQUITY'`, then `id === acctIdNetWorth` and
    `parentCtgId === acctCtgIdEquity`. This is what makes Net Worth "the only equity account" a schema-level
    fact, not just a convention: nothing else can ever construct a valid `EQUITY` account.
  - `nonEquityAccountBeyondRoot` — if `acctType !== 'EQUITY'`, then `parentCtgId !== acctCtgRootId[acctType]`
    — enforces "every other account must have at least one level of categorization beyond the root."
- `accountPatchEventSchema`: `parentCtgId` becomes one of the `.partial()` fields (reparenting to a
  different same-type category), still no `acctType` field, still no way to touch `id`. No patch-side
  Net-Worth special case is needed at the schema level — there's no account-management page for `EQUITY` at
  all (info-architecture.md §4), so nothing in the UI can ever construct a patch that would move Net Worth;
  the constraint isn't reachable in practice, so it isn't worth a bespoke check with the resulting UX cost of
  a confusing rejection message.

### 1f. Nothing else in the domain layer changes

`Vendor.defaultAcctId`, `BalanceAssertion.acctId`, `Entry.acctId` all reference `AcctId`, and `Account`
remains a real leaf entity with a stable ID type — none of them need to change. `Origin` is untouched (it
references nothing account-related).

---

## 2. Schema & migrations

### 2a. Action log — `src/bun/persistence/actionLog/migrations/0002_actions.ts` (edit in place)

Add a sixth lookup table, same shape as the other five:

```sql
CREATE TABLE account_category_actions (
    actn_id     TEXT PRIMARY KEY REFERENCES actions (id),
    acct_ctg_id TEXT NOT NULL
)
CREATE INDEX account_category_actions_acct_ctg_id_idx ON account_category_actions (acct_ctg_id)
```

The `actions.action_type` CHECK constraint is already built dynamically from `ACTION_TYPES`
(`ACTION_TYPES.map(t => \`'${t}'\`).join(', ')`, line 5) — no separate edit needed there once §2c updates
the source array.

### 2b. Materialized store — `src/bun/persistence/materializedStore/schema.ts` (no migration; edit directly)

- Add an `account_categories` table:
  ```sql
  CREATE TABLE account_categories (
      id            TEXT PRIMARY KEY,
      orig_id       TEXT NOT NULL,
      parent_ctg_id TEXT REFERENCES account_categories (id),
      acct_type     TEXT NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL,
      is_deleted    INTEGER NOT NULL DEFAULT 0
  )
  CREATE INDEX account_categories_parent_ctg_id_idx ON account_categories (parent_ctg_id)
  ```
- Change `accounts.parent_id` → `parent_ctg_id TEXT NOT NULL REFERENCES account_categories (id)` (was
  nullable, referencing `accounts (id)`). `PRAGMA foreign_keys` is never turned on anywhere in this codebase
  today (confirmed), so this `REFERENCES` stays declarative-only — the same non-enforcement that already
  lets `parent_id` point at never-inserted virtual root ids continues to work for the virtual root
  *category* ids.

### 2c. `ActionType.ts` — `src/shared/domain/actions/ActionType.ts`

Add `'create-account-category' | 'update-account-category' | 'delete-account-category'` to the `ActionType`
union and the `ACTION_TYPES` array, same three-per-entity pattern as every other entity.

---

## 3. CRUD service layer (mirrors the `Account` stack file-for-file)

New files under `src/shared/crudServices/accountCategories/`:

| File | Mirrors |
|---|---|
| `IAccountCategoryQrySvc.ts` | `IAccountQrySvc.ts` — `findAccountCategoryById`, `findAccountCategoriesAll`, `countAccountCategoriesAll`, `isAccountCategoryInUse` |
| `IAccountCategoryCmdSvc.ts` | `IAccountCmdSvc.ts` — `createAccountCategory`, `patchAccountCategory`, `deleteAccountCategory` |
| `IAccountCategorySvc.ts` | `IAccountSvc.ts` |
| `AccountCategoryTeeSvc.ts` | `AccountTeeSvc.ts` — pure fan-out, no business logic |

`isAccountCategoryInUse` is a **new kind of "in use" check**, structural rather than reference-based: a
category is in use (can't be deleted) if it has any live (non-deleted) child category *or* child account —
unlike `isAccountInUse`, which checks transaction/vendor references, not children. Same
throw-on-hard-inconsistency / resolve-`false`-on-genuinely-unused contract as the rest of §5/§6 of
`materialized-store.md`.

New persistence-layer files:

- `src/bun/persistence/actionLog/crudServices/AccountCategoryActionLogCmdSvc.ts` — mirrors
  `AccountActionLogCmdSvc.ts` (three `appendAction` calls, nothing else).
- `src/bun/persistence/materializedStore/crudServices/AccountCategoryMaterializedStoreSvc.ts` — mirrors
  `AccountMaterializedStoreSvc.ts`. `isAccountCategoryInUse` query:
  ```sql
  SELECT EXISTS (
      SELECT 1 FROM account_categories WHERE parent_ctg_id = ? AND is_deleted = 0
  ) OR EXISTS (
      SELECT 1 FROM accounts WHERE parent_ctg_id = ? AND is_deleted = 0
  ) AS in_use
  ```
- Update `AccountMaterializedStoreSvc.ts`'s row mapping for the renamed, now-required `parent_ctg_id`
  column (drop the `?? null`/optional handling on create; drop the `!== undefined` guard on patch since
  reparenting is still optional-on-patch but the column itself is `NOT NULL`).

Wiring (all mechanical, one line each, mirroring the existing `accounts` entry in each file):

- `SvcBundle.ts` — add `accountCategories: IAccountCategorySvc`.
- `MaterializedStore.ts` — add `accountCategories` to both `cmdSvcs` and `qrySvcs`.
- `ActionLog.ts` — add `accountCategories: new AccountCategoryActionLogCmdSvc(this)` to its `cmdSvcs`.
- `LedgerStore.ts` — add the `accountCategories: new AccountCategoryTeeSvc(...)` entry to `this.svcs`,
  `[actionLog.cmdSvcs.accountCategories, materializedStore.cmdSvcs.accountCategories]` ordering, same as
  every other entity.

---

## 4. Net Worth seeding

Nothing seeds anything today except `Origin` (`bootstrapCurrentOrigin`, called from both `createNewFile` and
`openExistingFile` in `db.ts`). Net Worth needs the same treatment, but **only on `createNewFile`** — an
existing file's Net Worth account is already in its action log from whenever it was created, and replay
reconstructs it; re-running a bootstrap on every open would be redundant (and wrong, since `openExistingFile`
has no business minting fresh entities into someone's existing ledger).

Add to `db.ts`, called once from `createNewFile` right after `bootstrapCurrentOrigin`:

```ts
async function bootstrapNetWorthAccount(store: LedgerStore, origId: OrigId): Promise<void> {
    await store.svcs.accounts.createAccount(accountCreationEventSchema.parse({
        id: acctIdNetWorth,
        origId,
        parentCtgId: acctCtgIdEquity,
        acctType: 'EQUITY',
        name: netWorthAccountName,
        isPrimary: false,
    }))
}
```

No existence check needed — `createNewFile` only ever runs against a brand-new, empty file, so there's
never a prior Net Worth row to collide with.

---

## 5. RPC bridge (mirrors §1a of `account-list-implementation-plan.md`, now for categories)

- `src/shared/rpc.ts` — add to `AppSchema.bun.requests`: `findAccountCategoriesAll`, `createAccountCategory`,
  `patchAccountCategory`, `deleteAccountCategory`, `isAccountCategoryInUse`, plus `CreateAccountCategoryParams`
  / `PatchAccountCategoryParams` types (mirrors `CreateAccountParams`/`PatchAccountParams` minus `isPrimary`).
- `src/bun/accountCategoryHandlers.ts` — mirrors `accountHandlers.ts` line-for-line: `handleFindAccountCategoriesAll`,
  `handleCreateAccountCategory`, `handlePatchAccountCategory`, `handleDeleteAccountCategory`,
  `handleIsAccountCategoryInUse`.
- `src/bun/index.ts` — wire the five new handlers to the five new RPC requests.
- `src/mainview/accountCategories/accountCategoriesClient.ts` — mirrors `accountsClient.ts`.

---

## 6. Tree-building & pickers rework

The existing Account-to-Account tree infrastructure is repurposed for categories, and simplified for
accounts (which are leaves now, so cycle-prevention no longer applies to them at all):

- **`buildAccountTree.ts` → `buildAccountCategoryTree.ts`** (`src/mainview/accountCategories/`). Produces a
  tree of a new discriminated node type:
  ```ts
  export type AccountTreeNode =
      | { kind: 'category'; category: AccountCategory; children: AccountTreeNode[] }
      | { kind: 'account'; account: Account }
  ```
  Nests `accountCategories` by `parentCtgId` (rooted at `acctCtgRootId[acctType]`, root itself never
  rendered — same convention as today), then attaches each category's direct child accounts (filtered by
  `account.parentCtgId === category.id`) as leaf nodes alongside its child categories. Sort order: fully
  interleaved alphabetical by name within each level (categories and accounts share one namespace anyway per
  the uniqueness rule, so this reads naturally, like a file system that doesn't force folders-before-files).
  Pure/synchronous, unit-tested first, same as today's `buildAccountTree.ts`.
- **`accountDescendants.ts` → `accountCategoryDescendants.ts`**. Only categories can have descendants now
  (accounts are leaves) — `categoryAndDescendants(categories, excludeId)` computes a category id + all its
  descendant category ids, for excluding invalid reparent targets. No account-side equivalent is needed
  anymore: an account being edited never needs to exclude "itself and descendants" from its own parent
  picker, because it has none.
- **`AccountParentPicker.tsx`** (reworked) — now picks a *category* as an account's parent: filtered to the
  same `acctType`, **excluding the type's root category** (§0 — an account can never sit directly under
  root except Net Worth, which has no picker at all since it has no edit UI). No self/descendant exclusion
  needed (an account has no descendants).
- **`AccountCategoryParentPicker.tsx`** (new) — picks a *category* as another category's parent: filtered to
  the same `acctType`, offering the root as `"${acctCtgRootName[acctType]} (top level)"`, excluding the
  category being edited and all its descendants via `categoryAndDescendants` (this is the direct analogue of
  today's `AccountParentPicker`, just retargeted at categories).

---

## 7. UI components

Add-affordance approach (per your call): **two separate `+` links per category row**, no type toggle inside
either modal — consistent with this codebase's existing rule that context, not a form field, determines
type (`acctType` is never user-facing in the account forms today; the same now applies to "is this a
category or an account," decided by which link was clicked).

- **`AccountTreeRow.tsx`** — branches on `node.kind`:
  - **Category row**: folder-style presentation (bold name, expand/collapse caret — same as today),
    edit-pencil icon (opens `EditableAccountCategoryRow`), and on hover: `+ Add category` and `+ Add account`
    links side by side, both passing this category's id as the new node's `parentCtgId`.
  - **Account row**: same as today's single row (name, description, ★ primary, edit-pencil), **no**
    expand/collapse caret (never has children) and **no** add-links (a leaf can't contain anything).
- **`NewAccountCategoryRow.tsx`** (new) — modal, mirrors `NewAccountRow.tsx`'s shape minus `isPrimary`: name,
  description, fixed `acctType` (from route) and `parentCtgId` (from which `+ Add category` was clicked).
- **`EditableAccountCategoryRow.tsx`** (new) — modal, mirrors `EditableAccountRow.tsx`: name, description,
  reparent via `AccountCategoryParentPicker`, delete guarded by `isAccountCategoryInUse` (message: "contains
  accounts or subcategories" rather than "referenced by a transaction entry").
- **`NewAccountRow.tsx` / `EditableAccountRow.tsx`** — same shape as today, just: parent field now uses the
  reworked `AccountParentPicker` (categories only, root excluded), and the save handler runs the client-side
  uniqueness pre-check (§8) before calling `accountsClient.createAccount`/`patchAccount`.
- **`AccountTreeContext.tsx`** — extend `AccountTreeActions`: `categories: Accessor<AccountCategory[]>`
  alongside the existing `accounts` accessor; `addingParentCtgId`/`requestAdd` need to also carry *which
  kind* is being added (category vs. account), and `editingId`/`requestEdit` similarly need to resolve to
  either a category or an account before rendering the right modal.
- **`AccountListPage.tsx`** — the page-header green `+` icon changes from "add top-level account" to **"add
  top-level category"** only (§0 — no account can ever be created directly under root for these four types).
  Root-level account creation is no longer reachable from anywhere in the UI, which is correct: it would
  violate `nonEquityAccountBeyondRoot` (§1e) if it somehow were.

---

## 8. Uniqueness pre-check

New helper, `src/mainview/accountCategories/siblingNameConflict.ts`:

```ts
function hasSiblingNameConflict(
    categories: readonly AccountCategory[],
    accounts: readonly Account[],
    parentCtgId: AcctCtgId,
    name: NameStr,
    excludeId?: AcctCtgId | AcctId,
): boolean
```

Filters both lists to live siblings under `parentCtgId` (excluding `excludeId`, the node being renamed, if
any), compares `name` case-sensitively (matching `nameSchema`, which doesn't normalize case) against both
lists combined — categories and accounts share one namespace per parent, "like a file system with folders
and files" (per `account-categories.md`). Called from `NewAccountRow`/`EditableAccountRow`/
`NewAccountCategoryRow`/`EditableAccountCategoryRow`'s save handlers, before the RPC call, surfaced via the
same `setErrorAlert` pattern already used for the `isAccountInUse` delete-guard.

---

## 9. Testing

- Domain: `Account.test.ts` — replace the "Account hierarchy invariants" block (today's self-parent/root
  tests) with tests for `equityAccountIsNetWorth` and `nonEquityAccountBeyondRoot`. `AccountCategory.test.ts`
  (new) — mirrors the retired `Account.ts` hierarchy tests almost exactly (self-parent, root-iff-no-parent,
  root-type-match), since that's exactly the invariant set that moved from accounts to categories.
- `buildAccountCategoryTree.test.ts` (new, replaces `buildAccountTree.test.ts`) — pure unit tests: mixed
  category/account nesting, root never rendered, interleaved alphabetical sort.
- `accountCategoryDescendants.test.ts` (replaces `accountDescendants.test.ts`).
- `siblingNameConflict.test.ts` (new) — pure unit tests, no DOM: category vs. category, category vs.
  account, and account vs. account name collisions, scoped correctly per `parentCtgId`, excluding the node
  being renamed.
- `AccountCategoryMaterializedStoreSvc.test.ts`, `MaterializedStore.test.ts`, `schema.test.ts`,
  `runMigrations.test.ts` — extend for the new table/action types, same shape as the existing `Account`
  coverage.
- `AccountListPage` smoke tests (extend `AccountListPage.crud.test.tsx`) — render a small mixed
  category/account tree; add category, add account under a category, attempt add-account at root level is
  unreachable (no UI path), reparent a category, delete blocked on non-empty category, uniqueness conflict
  blocks save with an inline error.

---

## 10. Suggested order of work

1. Domain layer (§1) — `AcctCtgId`, `AccountCategory`, `AcctCtgRoot`, `NetWorthAccount`, `Account.ts`
   rewrite. Pure, no I/O — write and pass these tests before touching persistence.
2. Schema/migration edits (§2) — `0002_actions.ts`, `schema.ts`, `ActionType.ts`.
3. CRUD service layer + wiring (§3).
4. Net Worth seeding (§4) — verify end-to-end with a throwaway manual test (create a new file, confirm
   `findAccountsAll()` includes Net Worth with the right `parentCtgId`) before building UI on top, same
   verification style as §6 of the account-list plan.
5. RPC bridge (§5).
6. Tree-building + pickers (§6).
7. UI components (§7) + uniqueness pre-check (§8).
8. Tests (§9) throughout, not just at the end — per the existing convention, the pure pieces (domain,
   `buildAccountCategoryTree`, `siblingNameConflict`) are cheapest and should be written alongside their
   implementation, not deferred.
9. Cleanup: delete `AcctRoot.ts`, `buildAccountTree.ts`, `accountDescendants.ts`, `AccountParentPicker.tsx`'s
   old descendant-exclusion logic, and their superseded tests. Update `info-architecture.md` §0's diff table
   with a new row for this change, and §4/§5's account-list description to reflect categories as the tree
   structure and accounts as leaves.

---

## 11. Explicitly out of scope for this pass

- **Balance Sheet / Income Statement category rollup** (subtotals per category) — stays deferred, per your
  call; `materialized-store.md` §9/§11 already flagged this as an open, unscheduled follow-up before this
  refactor existed, and nothing here changes that.
- **Drag-and-drop reparenting** — picker-only, same as today's already-deferred decision.
- **Migrating pre-existing action-log data** from the old `Account.parentId` scheme — there's no real user
  data yet; the existing sample file gets deleted and recreated under the new schema.
- **Service-layer (as opposed to client-side) uniqueness enforcement** — per your call, matches the existing
  UI-side-guard convention (`isAccountInUse` before delete) rather than introducing a new validation-failure
  contract into the command-service layer.
