# Balance Assertions + Transaction Date

> **Implemented as planned**, with one naming difference: the mainview client landed at
> `src/mainview/balanceAssertions/balanceAssertionsClient.ts` (the plan's own preferred option in §2, chosen
> for symmetry with `transactionsClient.ts`'s sibling placement). `bunx tsc --noEmit` and the full suite (1089
> tests, including new coverage for the checkbox-creates-assertion flow, the pencil-edit dialog's save/delete,
> the gray assertion row's matched/mismatched rendering, and the historical-clamp/tie-break cases from §1/§1c)
> are all clean. One test-infrastructure wrinkle worth recording: `bun test`'s `mock.module` mocks leak across
> test files within a single run, so every existing test file that renders a `showBalance` `TransactionLog`
> (`TransactionLog.crud.test.tsx`, `RegisterPage.test.tsx`) needed its own explicit (empty-returning)
> `balanceAssertionsClient` mock added alongside the new `TransactionLog.balanceAssertions.test.tsx` — not a
> plan change, just an implementation detail worth knowing before adding a fourth such file. Not independently
> verified: actually clicking through it in a running Electrobun window -- no automated driver for that exists
> in this codebase (same caveat as calculator-implementation-plan.md).

Source task: `tasks/todo/balance-assertions.md`. This plan covers three tied-together changes: (1) a new
`postDate <= clearedDate` constraint plus a `transactionDate` computed domain concept, (2) surfacing the
already-fully-built `BalanceAssertion` backend in the mainview register for the first time, and (3) a new
per-row "balance check" column that lets the user create/inspect assertions inline.

## 0. Decisions and assumptions (read first)

- **Scope: Register only, not Income Log/Expense Log.** Confirmed with the user. `TransactionLog` (shared by
  all three pages) already gates the *existing* Balance column behind `showBalance`, which only `RegisterPage`
  sets — Income Log/Expense Log deliberately have no running-balance column at all (`transactions-register-
  implementation-plan.md` §0: an Income/Expense account has no periodic closing entry, so a lifetime running
  total isn't meaningful there — the same reasoning as this app's Net Worth account, see CLAUDE.md's Domain
  Model Notes). Balance assertions are inherently about pinning a real account balance to a bank statement, so
  the whole feature (assertion rows, the new checkmark column, the pencil dialog, the create-on-checkbox flow)
  is gated behind the same `showBalance` flag as the existing Balance column, adding nothing to Income Log/
  Expense Log beyond the DATE-column merge below (which *does* apply everywhere).
- **The DATE-column merge and the new `transactionDate` sort apply to all three pages.** That part of the
  source task isn't balance-assertion-specific — every register/log screen currently shows separate
  Posted/Cleared columns and sorts by `postDate`; both change everywhere.
- **Running balance switches from postDate order to transactionDate order.** Not explicitly asked for, but a
  necessary consequence: `buildRegisterLineItems` already computes a running balance by accumulating entries
  in ascending display order. Once display order changes from postDate to transactionDate, the running balance
  must accumulate in that same new order, or the Balance column and the DATE column would disagree about
  chronology. This only touches the mainview's `buildRegisterLineItems` (and `findTransactionsByAccount`'s
  fetch order, for same-transaction-date tie-break correctness — see §2). **`findAccountBalancesAsOf`/
  `findAccountBalancesForPeriod`/`findTransactionsForPeriod` (Balance Sheet, Income Statement) are untouched**
  — those stay on `postDate`, which is explicitly the reporting-purposes date per `Transaction.ts`'s own doc
  comment. Only the register/log's own chronological display and the balance-assertion cutoff use
  `transactionDate`.
- **A balance assertion's date is immutable once created.** The source task's pencil dialog only ever offers
  "chang[e] the asserted balance or delet[e] the assertion entirely" — never move its date. Combined with the
  fact that the *only* way to create an assertion is the per-row checkbox (never a free-standing "add
  assertion" button), this sidesteps the uniqueness question `BalanceAssertion.ts`'s doc comment flags
  (uniqueness of `(acctId, assertionDate)` isn't schema-enforced): the checkbox only ever appears on a date
  with no existing assertion, and the edit dialog can't move a date onto a collision.
- **Assertion row placement: topmost for its date.** Register order is newest-first; an assertion pins the
  balance as of the *end* of its date, so it's placed directly above (before) that date's transactions — right
  where the qualifying checkbox row used to be, visually replacing it once the assertion exists.
- **The Amount column is blank for an assertion row.** The source task's row-content list names "+", DATE,
  DESCRIPTION, BALANCE as populated and NUMBER/CATEGORY/VENDOR as explicitly unused, but doesn't mention
  Amount at all. An assertion has no debit/credit of its own, so Amount is treated as unused too, same as
  NUMBER/CATEGORY/VENDOR.
- **The historical-data fixup runs at materialization time, not as a log rewrite.** "For any existing replayed
  actions, if an action would leave cleared date < posted date, set cleared date to the same value as posted
  date" — the `ActionLog` is treated as immutable elsewhere in this codebase (see `0002_actions.ts`'s frozen
  CHECK constraint), and replay (`ActionLog.replayInto`) dispatches straight into
  `MaterializedStore.cmdSvcs.transactions.createTransaction`/`patchTransaction` with no schema re-validation
  in between (`ActionLog.ts`'s `replayDispatch`, just an `as TransactionCreationEvent` cast). So the fix
  belongs inside `TransactionMaterializedStoreSvc.createTransaction`/`patchTransaction` themselves — the one
  place both a fresh write and a replayed historical action both funnel through. This also acts as ordinary
  defense-in-depth for any future write that reaches the materialized store with `clearedDate < postDate`
  despite the new UI/schema checks below.

## 1. Domain layer: `transactionDate`, the `postDate <= clearedDate` constraint, and the historical fixup

### 1a. `src/shared/domain/transactions/Transaction.ts`

Add a computed helper, not a schema field (it's fully derived, so a stored/branded field would just be a
second source of truth to keep in sync):

```ts
/** The date used for register/log display, sorting, and balance-assertion cutoffs: clearedDate when present,
 *  otherwise postDate. Deliberately a plain function, not a schema field, since it has no storage of its own
 *  -- see tasks/done/balance-assertions-implementation-plan.md §1a. */
export function transactionDate(txn: { postDate: IsoDate; clearedDate?: IsoDate }): IsoDate {
    return txn.clearedDate ?? txn.postDate
}
```

Add a cross-field refine, mirroring the existing `hasVendorOrDescription` pattern, applied to both
`transactionCreationEventSchema` and `transactionPatchEventSchema`:

```ts
function postDateOnOrBeforeClearedDate(txn: { postDate?: IsoDate; clearedDate?: IsoDate }) {
    if (txn.postDate === undefined || txn.clearedDate === undefined) return true
    return txn.postDate <= txn.clearedDate // ISO "YYYY-MM-DD" strings compare lexically
}
const postDateOnOrBeforeClearedDateMessage = "Posted date must be on or before cleared date."
```

This is a real (if narrow) safety net: the mainview always submits both dates together on save (see 1b), so
in practice this refine sees both fields whenever either is being set, and rejects a same-request violation
before it ever reaches the tee/materialized-store layer. It does **not** run during replay (replay bypasses
`.parse()` entirely — see §0), so it can't reject historical data; that's handled separately in §1c.

### 1b. `src/mainview/components/transactions/useTransactionRowForm.ts`

Add to `validateForSave()`, after the existing "Posted date is required" check:

```ts
if (postDate() && clearedDate() && postDate() > clearedDate()) {
    setError("Posted date must be on or before cleared date.")
    return null
}
```

Placed after defaulting is irrelevant here (unlike the RPC layer, the form's `postDate`/`clearedDate` signals
are compared as literally entered) — if the user leaves Posted blank, `performSave`'s
`form.postDate() || form.clearedDate()` will default it to the same value as Cleared, which trivially
satisfies the constraint either way.

No changes needed to `NewTransactionRow.tsx`/`EditableTransactionRow.tsx` beyond this — they already surface
`form.error()` as inline red text, which is how every other cross-field validation in this hook is reported.

### 1c. `src/bun/persistence/materializedStore/crudServices/TransactionMaterializedStoreSvc.ts`

Add a small private helper and call it from both `createTransaction` and `patchTransaction`:

```ts
/** Clamps clearedDate up to postDate when it would otherwise be earlier -- covers both a defensive fresh
 *  write and a historical replayed action from before this constraint existed (see §0/§1c of the balance-
 *  assertions plan). Returns the (possibly adjusted) clearedDate, still possibly undefined. */
function normalizeClearedDate(postDate: IsoDate, clearedDate: IsoDate | undefined): IsoDate | undefined {
    if (clearedDate !== undefined && clearedDate < postDate) return postDate
    return clearedDate
}
```

- `createTransaction`: compute `postDate = transactionCreation.postDate`, `clearedDate =
  normalizeClearedDate(postDate, transactionCreation.clearedDate)`, insert using the normalized value.
- `patchTransaction`: unlike create, a patch can touch only one of the two date fields, so the normalization
  needs the *current* stored row when only one is supplied. Read `post_date`/`cleared_date` from the existing
  row first (a cheap extra `SELECT` — patch already does an `UPDATE ... WHERE id = ?` right after), resolve
  `postDate = transactionPatch.postDate ?? current.post_date`, `clearedDate = transactionPatch.clearedDate !==
  undefined ? transactionPatch.clearedDate : (current.cleared_date ?? undefined)`, normalize, and — whenever
  either date field is part of the incoming patch — write both resolved columns (not just the one(s) the
  caller supplied), so the clamp is never silently skipped by a partial patch. If the transaction id doesn't
  exist, the existing "no transaction with id" error path is unaffected (current-row read happens before the
  `UPDATE`, so it throws in the same place, just slightly earlier).

Update the doc comment on `findTransactionsByAccount` and change its `ORDER BY` from `t.post_date, t.rowid` to
`COALESCE(t.cleared_date, t.post_date), t.rowid` — i.e. transaction-date order. This is the one SQL-level
change this plan needs: `buildRegisterLineItems` (§3) re-sorts its input in JS regardless, but that sort is a
*stable* sort, so same-transaction-date ties are broken by whatever order the rows arrived in. Two
transactions that share a `transactionDate` but have different `postDate`s (one has a `clearedDate` equal to
the other's bare `postDate`, say) would otherwise be fetched in `post_date` order and only coincidentally end
up in entry order — leaving "last entered still used as tie-breaker" (source task, Transaction Dates §) wrong
in that specific case. Ordering by `COALESCE(cleared_date, post_date)` at the SQL level fixes it at the
source. `findTransactionsForPeriod`/`findAccountBalancesAsOf`/`findAccountBalancesForPeriod` are untouched —
see §0.

### 1d. Tests

- `Transaction.test.ts`: `transactionDate()` returns `clearedDate` when present, `postDate` otherwise; the new
  refine rejects `postDate > clearedDate` on both creation and patch events, and allows equal dates and a
  missing `clearedDate`.
- `TransactionMaterializedStoreSvc.test.ts`: `createTransaction` clamps `clearedDate` up to `postDate` when
  given `clearedDate < postDate` (the "historical replayed action" case, since replay calls this same method
  with an unvalidated payload); `patchTransaction` clamps correctly both when both dates are in the same patch
  and when only one is (reading the other from the existing row); `findTransactionsByAccount`'s tie-break test
  gets a companion case where two transactions share a `transactionDate` via different `postDate`/`clearedDate`
  combinations and must still come back in entry order.

## 2. Backend + RPC: `findBalanceAssertionsByAccount`

The `BalanceAssertion` backend (action log actions, materialized store, tee service) is already fully built
end-to-end (see `IBalanceAssertionQrySvc`/`CmdSvc`/`TeeSvc`, `BalanceAssertionMaterializedStoreSvc`,
`BalanceAssertionActionLogCmdSvc`) — it has just never been wired to an RPC endpoint or a mainview client.
`findBalanceAssertionsAll` exists but an unscoped fetch on every Register page load is wasteful once any real
number of accounts have assertions; add a by-account query mirroring `findTransactionsByAccount`:

- **`IBalanceAssertionQrySvc.ts`**: add `findBalanceAssertionsByAccount(accountId: AcctId):
  Promise<BalanceAssertion[]>`.
- **`BalanceAssertionMaterializedStoreSvc.ts`**: implement with `WHERE acct_id = ? AND is_deleted = 0 ORDER BY
  assertion_date` (+ test, mirroring `findTransactionsByAccount`'s test shape).
- **`BalanceAssertionTeeSvc.ts`**: passthrough to `this.qrySvc.findBalanceAssertionsByAccount(...)`, same as
  its `findBalanceAssertionsAll`.
- **New `src/bun/balanceAssertionHandlers.ts`** (no such file exists yet, unlike `transactionHandlers.ts`):
  `handleFindBalanceAssertionsByAccount`, `handleCreateBalanceAssertion`, `handlePatchBalanceAssertion`,
  `handleDeleteBalanceAssertion` — same shape as the corresponding `transactionHandlers.ts` functions
  (`requireCurrentSession()`, schema `.parse()` with a fresh `genAsrtId()`/`origId` for create, `store.svcs
  .balanceAssertions.*`). Params kept minimal to what the UI actually sends (see §4's dialog/checkbox, which
  never touch `acctId`/`assertionDate` on patch):
  ```ts
  export type CreateBalanceAssertionParams = { acctId: string; assertionDate: string; balance: string };
  export type PatchBalanceAssertionParams = { id: string; balance: string };
  ```
- **`src/shared/rpc.ts`**: add the four request entries under `bun.requests` (`findBalanceAssertionsByAccount`,
  `createBalanceAssertion`, `patchBalanceAssertion`, `deleteBalanceAssertion`), plus the two `Params` types
  above, plus importing `BalanceAssertion`.
- **`src/bun/index.ts`**: wire the four handlers in, same pattern as the transaction ones.
- **New `src/mainview/transactions/balanceAssertionsClient.ts`** (or `balanceAssertions/balanceAssertionsClient
  .ts` — matches the one-folder-per-entity convention CLAUDE.md describes; either is fine, picking
  `src/mainview/balanceAssertions/balanceAssertionsClient.ts` for symmetry with `transactionsClient.ts`'s
  sibling placement relative to its feature folder):
  ```ts
  export const balanceAssertionsClient = {
      findBalanceAssertionsByAccount: (accountId: string): Promise<BalanceAssertion[]> =>
          rpc.request.findBalanceAssertionsByAccount({ accountId }),
      createBalanceAssertion: (params: CreateBalanceAssertionParams): Promise<void> =>
          rpc.request.createBalanceAssertion(params),
      patchBalanceAssertion: (params: PatchBalanceAssertionParams): Promise<void> =>
          rpc.request.patchBalanceAssertion(params),
      deleteBalanceAssertion: (id: string): Promise<void> => rpc.request.deleteBalanceAssertion({ id }),
  };
  ```

## 3. Pure logic: `buildRegisterLineItems` + new `buildRegisterRows`

### 3a. `src/mainview/transactions/buildRegisterLineItems.ts`

- Add `transactionDate: IsoDate` to `RegisterLineItem`, computed once per item via the new domain helper.
- Change the initial sort key from `a.postDate.localeCompare(b.postDate)` to `(transactionDate(a) as
  string).localeCompare(transactionDate(b) as string)` — this is what makes the running-balance accumulation
  (and the final display order, after the existing `.reverse()`) follow transaction date instead of post date,
  per §0. The tie-break behavior (stable sort over the caller's input order) is unchanged in kind, just now
  meaningful over `transactionDate` ties instead of `postDate` ties — backed by §1c's SQL ordering change.
- Update the doc comment accordingly (it currently says "Stably sorts by postDate only").

### 3b. New `src/mainview/transactions/buildRegisterRows.ts` (+ test)

Register-only (§0), so only used where `showBalance` is true. Merges `RegisterLineItem[]` (already
descending, from `buildRegisterLineItems`) with `BalanceAssertion[]` for the same account into one display
list, and decides checkbox/checkmark eligibility per row.

```ts
export type RegisterRow =
    | { kind: "transaction"; item: RegisterLineItem; isLastOfDate: boolean; hasAssertionForDate: boolean }
    | {
          kind: "assertion";
          assertion: BalanceAssertion;
          runningBalance: CurrencyAmt; // the account's running balance through assertion.assertionDate
          matches: boolean;
          delta: CurrencyAmt; // assertion.balance - runningBalance
      };

export function buildRegisterRows(
    lineItemsDescending: readonly RegisterLineItem[],
    balanceAssertions: readonly BalanceAssertion[],
): RegisterRow[]
```

Algorithm:
1. Group `lineItemsDescending` by `transactionDate` into a `Map<string, RegisterLineItem[]>`, preserving
   order (so each group's first entry is the topmost/last-entered one for that date).
2. `balanceAsOf(date)`: the running balance for "all transactions with transaction date on or before `date`"
   — the target date's group's first item's `.balance` if that date has transactions, otherwise the same
   lookup on the closest earlier date that does, otherwise `$0.00` (handles an assertion dated before any
   transaction, or on a date with none of its own — not reachable via the checkbox flow today, but the
   `BalanceAssertion` schema doesn't forbid it, and `findBalanceAssertionsAll`'s existing doc comment already
   anticipates assertions living independently of any transaction).
3. Union the transaction-date keys and the assertion dates, sort descending (ISO strings sort lexically).
4. Walk that date list; for each date, if there's an assertion for it, emit an `"assertion"` row first
   (`runningBalance = balanceAsOf(date)`, `matches = toCents(assertion.balance) === toCents(runningBalance)`,
   `delta = fromCents(toCents(assertion.balance) - toCents(runningBalance))`), then emit that date's
   transaction rows in their existing (descending/last-entered-first) order, `isLastOfDate: true` only for the
   first one, `hasAssertionForDate` set from whether this date had an assertion.

At most one assertion per date is assumed (§0's immutable-date argument); if application data somehow has more
than one for the same `(acctId, date)`, the later one in `balanceAssertions`'s input order wins silently —
not worth guarding given how assertions can only ever be created today.

Tests: mirror `buildRegisterLineItems.test.ts`'s style — a date with a matching assertion (both matching and
mismatched balance), a date with transactions but no assertion (`isLastOfDate` on the right row only), an
assertion on a date with no transactions of its own (carries the prior date's balance forward), and an
assertion before any transactions exist (`$0.00`).

## 4. Mainview: columns, rows, and the two new interactions

### 4a. Column layout changes (all three pages, via `TransactionLog.tsx`)

Replace the separate "Posted"/"Cleared" `<th>`s with a single "Date" header. Add one new `<th>` after Balance,
shown only `Show when={showBalance()}`, containing a green checkmark glyph (✓) as its heading, per the source
task. Update the `columnCount` memo's comment and formula: base count drops from 7 to 6 (Posted+Cleared merged
into one), and the new column adds 1 whenever `showBalance` (so the net formula becomes `6 + (showCode() ? 1 :
0) + (showBalance() ? 2 : 0)` — Balance and the new checkmark column both ride on `showBalance`).

### 4b. `TransactionRow.tsx`

- Replace the Posted/Cleared `<td>`s with one `<td>{props.lineItem.transactionDate}</td>`.
- New optional props: `isLastOfDate: boolean`, `hasAssertionForDate: boolean`, `onCreateAssertion: () => void`
  (only meaningful/passed when `showBalance`).
- New trailing `<td>` (`Show when={props.showBalance}`):
  - `isLastOfDate && !hasAssertionForDate`: a checkbox, unchecked, `onChange` fires `onCreateAssertion` (no
    dialog — the source task is explicit: "no dialog needed"). Disable it while a creation is in flight (see
    4d) to prevent a double-click from creating two assertions for the same date.
  - otherwise: empty cell, no functionality (covers "not last of date" and "last of date but already
    asserted").

### 4c. New `src/mainview/components/transactions/BalanceAssertionRow.tsx`

```ts
type BalanceAssertionRowProps = {
    row: Extract<RegisterRow, { kind: "assertion" }>;
    showCode: boolean;
    columnCount: number;
    editDisabled: boolean;
    onEdit: () => void;
};
```

Renders one `<tr class="bg-gray-100 font-bold">` (gray background, bold text, per the source task):
- "+"/pencil column: a pencil button (reuse the same icon/button styling `TransactionRow`'s edit pencil
  uses), `disabled={props.editDisabled}`, opens the edit dialog (4e) on click.
- Date column: `row.assertion.assertionDate`.
- Number column (only `Show when={showCode}`, for alignment): empty.
- Category, Vendor columns: empty.
- Description column: `"Cleared Balance"` when `row.matches`; otherwise `Out of Balance: {row.delta}` in
  `text-orange-600` (per source task).
- Amount column: empty (§0).
- Balance column: `row.assertion.balance`.
- Checkmark column: a green ✓ glyph when `row.matches`, an orange ⚠/! glyph otherwise (source task: "orange
  exclamation point icon").

### 4d. `TransactionLog.tsx` wiring

- Fetch balance assertions only when relevant:
  ```ts
  const [balanceAssertions, { refetch: refetchBalanceAssertions }] = createResource(
      () => (showBalance() ? props.accountId : undefined),
      (accountId) => balanceAssertionsClient.findBalanceAssertionsByAccount(accountId),
  );
  ```
- `const registerRows = createMemo(() => buildRegisterRows(lineItems(), showBalance() ? balanceAssertions() ??
  [] : []));` — replaces the `<For each={lineItems()}>` loop; branch per `row.kind` between the existing
  `TransactionRow`/`EditableTransactionRow`/`NewTransactionRow` machinery (keyed off `row.item.txnId` inside
  the `"transaction"` branch, unchanged from today) and the new `BalanceAssertionRow` (Register-only, but
  `registerRows()` is just `lineItems()` wrapped as all-`"transaction"` rows with `isLastOfDate`/
  `hasAssertionForDate` both `false` when `!showBalance`, so no branching needed in the template itself).
- `[assertionCreating, setAssertionCreating] = createSignal<IsoDate | null>(null)` — tracks which date's
  checkbox is mid-flight, both for the disabled-while-saving behavior (4b) and to avoid a duplicate assertion
  from a fast double click. `handleCreateAssertion(item: RegisterLineItem)`:
  ```ts
  const handleCreateAssertion = async (item: RegisterLineItem) => {
      setAssertionCreating(item.transactionDate);
      try {
          await balanceAssertionsClient.createBalanceAssertion({
              acctId: props.accountId,
              assertionDate: item.transactionDate,
              balance: item.balance,
          });
          await refetchBalanceAssertions();
      } finally {
          setAssertionCreating(null);
      }
  };
  ```
  Errors aren't expected in normal use (the checkbox only ever targets a date that was just computed as
  assertion-free) but aren't swallowed either — left to surface as an unhandled rejection consistent with how
  other fire-and-forget mainview actions in this codebase behave today; revisit only if this turns out to be
  reachable in practice.
- `[editingAssertionId, setEditingAssertionId] = createSignal<AsrtId | null>(null)` for the pencil dialog (4e),
  mutually exclusive with `editingTxnId`/`isAddingNew` the same way those two already are with each other
  (disable the assertion pencil while a transaction row is being edited/added, and vice versa — reuse the
  existing `isDirty()`/`isAddingNew()` gate already passed to `TransactionRow`'s `editDisabled`).

### 4e. New `src/mainview/components/transactions/BalanceAssertionEditDialog.tsx`

A small modal, styled like `ConfirmDialog.tsx`/other existing modals (fixed inset overlay, white rounded
panel): shows the assertion's date (read-only text, not an input — the date is immutable, §0), an
`AmountInput` bound to a local `balance` signal seeded from `props.assertion.balance`, and three actions:
Save (`patchBalanceAssertion({ id, balance })`), Delete (opens a nested `ConfirmDialog` — "Delete this balance
assertion? This can't be undone.", `deleteBalanceAssertion(id)`), Cancel. On successful save/delete, calls
`props.onDone()` which `TransactionLog` wires to `refetchBalanceAssertions` + closing the dialog.

## 5. Suggested order of work

1. `Transaction.ts`'s `transactionDate()` + the `postDateOnOrBeforeClearedDate` refine, and their tests (§1a,
   §1d's schema tests).
2. `useTransactionRowForm.ts`'s client-side check (§1b).
3. `TransactionMaterializedStoreSvc.ts`'s clamp + `findTransactionsByAccount` ordering change, and their tests
   (§1c, §1d).
4. `buildRegisterLineItems.ts`'s sort-key change + doc comment + test update (§3a).
5. Backend balance-assertion plumbing end to end: `IBalanceAssertionQrySvc`/`BalanceAssertionMaterializedStoreSvc`
   /`BalanceAssertionTeeSvc`'s `findBalanceAssertionsByAccount`, `balanceAssertionHandlers.ts`, `rpc.ts`,
   `index.ts`, `balanceAssertionsClient.ts` (§2).
6. `buildRegisterRows.ts` + tests (§3b) — pure logic, no UI yet.
7. `TransactionLog.tsx`'s column-header/`columnCount` changes and the Date-column merge in `TransactionRow.tsx`
   (§4a/§4b's date cell only) — ships the DATE-column merge for all three pages independent of everything
   balance-assertion-specific.
8. `BalanceAssertionRow.tsx`, `BalanceAssertionEditDialog.tsx`, the rest of `TransactionRow.tsx`'s new column,
   and `TransactionLog.tsx`'s `registerRows`/checkbox/pencil wiring (§4b–§4e) — Register only.
9. Component/page tests: `TransactionLog`'s existing tests plus new coverage for the checkbox-creates-
   assertion flow, the pencil dialog's edit/delete, and the gray assertion row's matched/mismatched rendering;
   confirm `IncomeLogPage.test.tsx`/`ExpenseLogPage.test.tsx` still pass unchanged (no Balance/checkmark column
   for them).
