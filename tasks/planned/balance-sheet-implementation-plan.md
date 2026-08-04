# Balance Sheet — Implementation Plan

> Covers turning `BalanceSheetPage.tsx` (currently a "coming soon" stub, breadcrumbs already wired — see
> `documentation/info-architecture.md` §10) into the real Assets/Liabilities/Net Worth snapshot described
> there, following `../checquery/client`'s `BalanceSheetPage`/`BalanceSheet` as closely as checquery2's
> changed domain model allows, per `tasks/todo/balance-sheet.md`. Deltas from the prior effort, per the todo:
> accounts are categorized (not directly hierarchical) so the report walks the `AccountCategory` tree per
> `account-categories-implementation-plan.md`, and section rows get **indentation for category hierarchy**
> plus **roll-up subtotals by category and subcategory** — the two things `materialized-store.md` §9/§11
> explicitly flagged as designed-for-but-not-built when that spec was written.
>
> **Revision note:** an earlier draft of this plan had Net Worth computed by summing the Net Worth account's
> own ledger entries, reasoning that — unlike the old app's virtual, unpostable Equity root — checquery2's
> Net Worth is a real, postable account. That reasoning was wrong: see `CLAUDE.md`'s "Domain Model Notes"
> (added alongside this revision). The Net Worth account is only a posting target for opening balances and
> ad hoc asset revaluations; this app never runs a periodic closing entry to move net income into it, so its
> own balance does **not** track actual net worth once any income/expense activity has occurred. §0/§2 below
> now match the old app exactly: Net Worth is always the computed value `Assets − Liabilities`, never a sum
> of that account's entries.

---

## 0. Decisions from this planning pass

- **Net Worth is a computed plug (`Assets − Liabilities`), never queried from the Net Worth account's own
  entries.** Per `CLAUDE.md`'s Domain Model Notes: the Net Worth account exists solely so opening-balance and
  asset-revaluation postings have something to debit/credit against, and — because this app has no periodic
  "closing the books" step — its running balance silently diverges from actual net worth as soon as any
  income/expense transaction changes an Asset balance with no offsetting Equity entry. `Assets − Liabilities`
  is the only value that is actually correct at any point in time, so it's what this plan computes, exactly
  matching the old app's `BalanceSheetRepo` (`../checquery/shared/src/database/balancesheet/BalanceSheetRepo.ts`,
  `totalEquity = totalAssets − totalLiabilities`) even though checquery2's Net Worth account is technically
  postable where the old app's Equity root wasn't. One consequence: `info-architecture.md` §10's "Grand-total
  check: Total Assets = Total Liabilities + Total Net Worth" is a tautology under this definition (it can
  never fail), not a real integrity check — so this plan doesn't build a balanced/unbalanced indicator (§2/§3
  drop it entirely; the earlier draft's `isBalanced` field is gone).
- **The Net Worth account itself never appears in the report — not as a linked row, not as an unlinked row,
  not at all.** It's not merely "a row with no link" (the earlier draft's framing); per `CLAUDE.md`, it
  should never be visible outside of transaction entry. Net Worth is represented purely as a derived
  `CurrencyAmt` total, not a `BalanceSheetLine` with an `acctId` — there is no account-shaped row to
  accidentally wire a link onto in the first place, which is a stronger guarantee than "the link happens to
  be omitted."
- **New backend report query, not a client-side fold over `findTransactionsByAccount`.** Register/Income
  Log/Expense Log compute their view (`buildRegisterLineItems.ts`) from transactions already scoped to one
  account — a reasonable amount of data to pull client-side. A balance sheet spans every Asset/Liability
  account's entire history at once; `materialized-store.md` §9 already flags `SUM()`/`GROUP BY` in SQL as
  *the* reason this store uses SQLite instead of a plain in-memory `Map`. So this plan adds one aggregate
  query, `findAccountBalancesAsOf`, rather than fetching full transaction lists for every account and summing
  in JS.
- **The query stays generic (every account, not just Asset/Liability) and untyped by `acctType`** — it's a
  reusable low-level primitive (raw per-account debit/credit totals as of a date), the same shape as
  `materialized-store.md` §9's illustrative SQL. The balance-sheet-specific decision — that only `ASSET`/
  `LIABILITY` rows get used, and the Net Worth account's row (if any) is deliberately never looked up — lives
  entirely in `buildBalanceSheet.ts` (§2), not in the query. This keeps the domain rule ("don't report Net
  Worth's own balance") in one pure, unit-tested place rather than baked into SQL where it'd be invisible to
  anything else that might reuse the query later.
- **The query returns raw per-account debit/credit totals, not pre-signed balances.** Mirroring
  `buildRegisterLineItems.ts`'s existing `isDebitBalance` convention (debit-normal for `ASSET`, credit-normal
  for `LIABILITY`), the SQL just sums `debit_cents`/`credit_cents` per account with no type-aware sign logic
  in SQL at all — that logic lives in one place, a new pure mainview function, matching this codebase's
  established split (thin bun-side queries, view-shaping in pure client functions — see the
  transactions-register plan's §0 "bun handlers stay thin wrappers over the store" rule).
- **Category rows show their own roll-up subtotal directly in the Amount column — no separate "Total X"
  row.** This is the simpler of two plausible layouts (the other being a QuickBooks-style blank-then-total
  pair of rows per category) and it matches how this codebase's own account-list tree already presents a
  category row (bold name, one row, per `AccountTreeRow.tsx`) — reusing that mental model rather than
  inventing a second one. A category's row is its subtotal; its children render indented beneath it.
  Indentation reuses the exact convention `AccountTreeRow.tsx` already established:
  `style={{ "padding-left": \`${depth * 1.5}rem\` }}`.
- **The account/category tree is built with the existing `buildAccountCategoryTree`, reused as-is.** No new
  tree-building logic — `buildAccountCategoryTree(categories, accounts, acctType)` already produces exactly
  the nested structure (categories as branches, accounts as leaves, sorted, rooted at the type's fixed root)
  this report needs to walk for Assets and Liabilities. A new function only needs to *flatten* that tree into
  report lines with rolled-up amounts. **Only called for `"ASSET"` and `"LIABILITY"`** — never `"EQUITY"`,
  since Net Worth has no tree to walk (§0 above).
- **Zero-activity accounts still appear, at $0.00.** The old SQL used a `LEFT JOIN` so every live account
  showed even with no entries; this plan's SQL (§1a) does the equivalent by having the mainview default any
  account absent from the query result to zero, rather than restricting the tree walk to only accounts that
  happen to have a balance row.
- **Out of scope, per the todo (only these three deltas were requested):** no drill-through beyond the
  existing Register link, no CSV/print export, no per-category collapse/expand (the whole tree renders flat,
  matching the old app's always-expanded single-level list — collapsing is an `AccountTreeRow`-only affordance
  today, not requested here), no changes to the date-dropdown breadcrumb (already correct/working in the
  current stub).
- **Not touched in this pass:** `info-architecture.md` §10's "Grand-total check" wording now describes a
  tautology rather than a real check (see above) — its phrasing could be tightened to "Net Worth is displayed
  as the derived value Total Assets − Total Liabilities" in a later documentation pass, but rewriting that
  doc isn't part of this task.

---

## 1. Backend: `findAccountBalancesAsOf` report query

### 1a. `src/shared/domain/transactions/AccountBalance.ts` (new)

```ts
import type { AcctId } from "../accounts/AcctId";
import type { CurrencyAmt } from "../core/CurrencyAmt";

/** Net debit/credit totals for one account as of some date -- raw output of
 *  ITransactionQrySvc.findAccountBalancesAsOf. Not a persisted entity (no creation/patch/deletion variants,
 *  no schema) -- just a query DTO assembled from already-validated domain types, the same non-schema
 *  treatment the prior effort gave BalSheetLineItem/BalanceSheet. Spans every account type touched by any
 *  entry, including EQUITY -- callers that build reports (see buildBalanceSheet.ts) are responsible for
 *  filtering to the account types that are actually meaningful to report, and per CLAUDE.md's Domain Model
 *  Notes, the Net Worth (EQUITY) row here must never be used for that purpose. */
export type AccountBalance = {
	acctId: AcctId;
	debit: CurrencyAmt;
	credit: CurrencyAmt;
};
```

### 1b. `ITransactionQrySvc.ts` — add one method

```ts
/** Net debit/credit totals (not sign-flipped for account normal balance -- see buildBalanceSheet.ts) for
 *  every account with at least one live entry whose transaction's postDate is on or before asOfDate.
 *  Accounts with no qualifying entries are simply absent from the result, not zero-rows -- the caller
 *  defaults them to $0.00. Spans every account type, not just ASSET/LIABILITY; the balance sheet filters
 *  client-side using the same accounts list it already fetches for the category tree. */
findAccountBalancesAsOf(asOfDate: IsoDate): Promise<AccountBalance[]>
```

`TransactionTeeSvc` — delegate straight to `this.qrySvc`, same one-liner as the other two query methods.

### 1c. `TransactionMaterializedStoreSvc.ts`

```ts
async findAccountBalancesAsOf(asOfDate: IsoDate): Promise<AccountBalance[]> {
    const rows = this.db.query(
        `SELECT e.acct_id AS acct_id,
                COALESCE(SUM(e.debit_cents), 0) AS debit_cents,
                COALESCE(SUM(e.credit_cents), 0) AS credit_cents
         FROM entries e
         JOIN transactions t ON t.id = e.transaction_id
         WHERE t.is_deleted = 0 AND t.post_date <= ?
         GROUP BY e.acct_id`
    ).all(asOfDate) as { acct_id: string; debit_cents: number; credit_cents: number }[]
    return rows.map((row) => ({
        acctId: row.acct_id as AcctId,
        debit: fromCents(row.debit_cents),
        credit: fromCents(row.credit_cents),
    }))
}
```

Matches `materialized-store.md` §9's illustrative balance-sheet SQL almost exactly, just grouping by account
without joining out to `accounts` for `acct_type`/`name` (§0 — that join happens client-side against the
already-fetched account/category lists instead, so this query stays reusable if anything else ever needs raw
per-account totals as of a date).

### 1d. `src/bun/transactionHandlers.ts`

```ts
export async function handleFindAccountBalancesAsOf(params: { asOfDate: string }): Promise<AccountBalance[]> {
    const { store } = requireCurrentSession();
    return store.svcs.transactions.findAccountBalancesAsOf(isoDateSchema.parse(params.asOfDate));
}
```

Same shape as the existing four handlers in this file (`requireCurrentSession()`, one `.parse()` on the
incoming param, delegate to `store.svcs.transactions`).

### 1e. `src/shared/rpc.ts`

Add to `AppSchema.bun.requests`:

```ts
findAccountBalancesAsOf: { params: { asOfDate: string }; response: AccountBalance[] };
```

(Import `AccountBalance` from `./domain/transactions/AccountBalance`, alongside the existing `Transaction`
import.)

### 1f. `src/bun/index.ts`

Wire `handleFindAccountBalancesAsOf` to `findAccountBalancesAsOf`, same one-line pattern as the other
transaction handlers.

### 1g. `src/mainview/transactions/transactionsClient.ts`

```ts
findAccountBalancesAsOf: (asOfDate: string): Promise<AccountBalance[]> =>
    rpc.request.findAccountBalancesAsOf({ asOfDate }),
```

### 1h. Tests

- `TransactionMaterializedStoreSvc.test.ts` — extend: sums multiple entries per account correctly; excludes
  entries whose transaction is soft-deleted; excludes entries whose transaction's `postDate` is after
  `asOfDate`; includes entries whose `postDate` equals `asOfDate` (boundary, "on or before"); an account with
  no qualifying entries is simply absent from the result array.
- `transactionHandlers.test.ts` — extend with an end-to-end round trip against a real temp file (create a
  transaction, confirm `findAccountBalancesAsOf` reflects it; confirm "no file open" rejects, matching the
  file's existing per-handler coverage).

---

## 2. Pure logic: `src/mainview/balancesheet/buildBalanceSheet.ts` (new folder) + test

```ts
export type BalanceSheetLine = {
	kind: "account" | "category";
	depth: number;
	label: string;
	amount: CurrencyAmt;
	acctId?: AcctId; // present only for kind: "account" -- Register link target
};

export type BalanceSheetSection = {
	heading: string;
	lines: BalanceSheetLine[];
	total: CurrencyAmt;
};

export type BalanceSheet = {
	endingDate: IsoDate;
	assets: BalanceSheetSection;
	liabilities: BalanceSheetSection;
	/** Assets − Liabilities, computed -- never a sum of the Net Worth account's own entries. See CLAUDE.md's
	 *  Domain Model Notes: that account has no periodic closing entry keeping it in sync with real net worth,
	 *  so this is the only value that's actually correct as of endingDate. Not a BalanceSheetSection -- there
	 *  is no account or category tree behind this number, just a derived total. */
	netWorth: CurrencyAmt;
};

export function buildBalanceSheet(
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	balances: readonly AccountBalance[],
	endingDate: IsoDate,
): BalanceSheet
```

Internals:

1. Build `signedCentsByAcct: Map<AcctId, number>` from `balances`: for each row, `acctType` is looked up from
   `accounts` (a `Map<AcctId, Account>` built once); `ASSET` → `debitCents - creditCents`, `LIABILITY` →
   `creditCents - debitCents` (§0's sign convention, same formula shape as `buildRegisterLineItems.ts`'s
   `isDebitBalance` branch). Rows for `EQUITY`/`INCOME`/`EXPENSE` accounts (present in `balances` because
   every transaction touches at least one, but irrelevant to this report) are never looked up — in
   particular, **the Net Worth account's row is never read**, which is what actually enforces §0's domain
   rule in code, not just in a comment.
2. A private recursive flattener:
   ```ts
   function flattenNode(node: AccountTreeNode, depth: number, signedCentsByAcct: Map<AcctId, number>, out: BalanceSheetLine[]): number {
       if (node.kind === "account") {
           const cents = signedCentsByAcct.get(node.account.id) ?? 0;
           out.push({ kind: "account", depth, label: node.account.name, amount: fromCents(cents), acctId: node.account.id });
           return cents;
       }
       const childLines: BalanceSheetLine[] = [];
       let subtotalCents = 0;
       for (const child of node.children) {
           subtotalCents += flattenNode(child, depth + 1, signedCentsByAcct, childLines);
       }
       out.push({ kind: "category", depth, label: node.category.name, amount: fromCents(subtotalCents) });
       out.push(...childLines);
       return subtotalCents;
   }
   ```
3. For each of `"ASSET"`, `"LIABILITY"`: `buildAccountCategoryTree(categories, accounts, acctType)`, flatten
   each top-level node in turn (accumulating into one `lines` array and one running total), producing that
   type's `BalanceSheetSection`. **Never called for `"EQUITY"`.**
4. `netWorth = fromCents(toCents(assets.total) - toCents(liabilities.total))` — the entire Net Worth
   computation, no account lookup involved.

Pure and synchronous, same testing style as `buildAccountCategoryTree.test.ts` +
`buildRegisterLineItems.test.ts`: hand-built categories/accounts/balances fixtures, no DOM, no RPC.

### Test cases

- A multi-level Asset category (e.g. "Banking" containing "Checking" and "Savings") rolls up correctly:
  Banking's row amount equals the sum of its two children; each child is indented one level deeper than
  Banking.
- A Liability leaf directly-ish under a category sums with the correct (credit-normal) sign.
- An account present in `accounts` but absent from `balances` renders at `$0.00` rather than being omitted.
- `netWorth` equals `assets.total − liabilities.total` for an ordinary fixture.
- **The decisive regression test for this revision**: a fixture where the `balances` array includes an entry
  for `acctIdNetWorth` whose debit/credit values are deliberately inconsistent with (i.e. not equal to)
  `assets.total − liabilities.total` (simulating a real opening-balance/revaluation posting plus subsequent
  income/expense activity that was never closed out to Equity) — `buildBalanceSheet` must still return
  `netWorth === assets.total − liabilities.total`, proving the Net Worth account's own entries are never
  consulted, not even accidentally.
- Empty categories (no live children) still render as a `$0.00` row, not omitted (mirrors
  `buildAccountCategoryTree`'s behavior of including empty category branches).

---

## 3. `BalanceSheetPage.tsx` — replace the stub body

Keep the existing breadcrumb code (`TopNav`/`FileBreadcrumb`/report-type dropdown/date dropdown) entirely
unchanged — only `<main>`'s contents change.

```tsx
const [accounts] = createResource(() => accountsClient.findAccountsAll());
const [categories] = createResource(() => accountCategoriesClient.findAccountCategoriesAll());
const [balances] = createResource(endingDate, (date) => transactionsClient.findAccountBalancesAsOf(date));

const balanceSheet = createMemo(() =>
	buildBalanceSheet(categories() ?? [], accounts() ?? [], balances() ?? [], endingDate()),
);
```

`createResource(endingDate, ...)` (not `() => transactionsClient...()`) so changing the date-dropdown route
param re-fetches, mirroring `TransactionLog.tsx`'s `createResource(() => props.accountId, ...)` pattern
(§0/`transactions-register-implementation-plan.md`).

Rendering, inside `<Show when={!accounts.loading && !categories.loading && !balances.loading} fallback={<p
class="text-slate-500">Loading…</p>}>` (same loading-gate convention as `VendorListPage.tsx`):

- Two side-by-side cards, matching the old app's layout (`../checquery/client/src/components/balancesheet/BalanceSheet.tsx`):
  Assets alone in the left column; Liabilities in the right column, with a **Net Worth summary directly below
  it in the same column** — not its own account-style table with header/rows (there's nothing account-shaped
  to list, per §0), just a single prominent total line, e.g. a bordered/highlighted `<div>` or a one-row
  `<table>` styled like the existing "Total X" rows: `Net Worth` on the left, `balanceSheet().netWorth` on
  the right.
- Each of the Assets/Liabilities `<table>`s has one `<tr>` per `BalanceSheetLine`:
  - `category` rows: bold name (`font-semibold`), `style={{ "padding-left": \`${line.depth * 1.5}rem\` }}` on
    the name cell (exact convention from `AccountTreeRow.tsx`, §0), plain (non-bold) amount.
  - `account` rows: same indentation, name as an `<A href={accountDetailRoute(acctType, line.acctId)}>` link
    (Assets/Liabilities only — every leaf in these two trees is a real, registrable account, so every
    `account`-kind line here always gets a link; there's no Net Worth line mixed into these tables to special-
    case, unlike the earlier draft).
  - A closing bold `<tr>` per section: `Total {heading}` / `section.total`.
- `<h1>Balance Sheet — {endingDate()}</h1>` stays (already present in the stub), above the tables.
- **No balanced/unbalanced indicator** — dropped along with `isBalanced` (§0); the figure is definitionally
  always consistent now, so there's nothing to check.

`accountDetailRoute` needs `acctType` per call site; since Assets/Liabilities are rendered in two separate,
type-specific blocks, each block can pass its own fixed `acctType` literal rather than reading it off the
line.

---

## 4. Testing

- `buildBalanceSheet.test.ts` — per §2's test list; the primary coverage for this feature, since it's where
  all the actual reporting logic (sign flip, rollup, indentation depth, and — most importantly this revision
  — Net Worth's account entries being provably unused) lives, fully decoupled from rendering.
- `BalanceSheetPage.test.tsx` (extend the existing file) — add cases beyond the current breadcrumb-only
  coverage: `mock.module` the three clients (`accountsClient`, `accountCategoriesClient`,
  `transactionsClient`), render with a small fixture (one Asset category with two accounts, one bare
  Liability account), and assert: category/account rows render with visibly different indentation (query by
  `padding-left` style or just presence/nesting order), section totals show the right rolled-up amounts, an
  Asset/Liability account name is an `<a>` (via `.closest("a")`, `TransactionLog.crud.test.tsx`'s existing
  convention for link assertions), the page shows a "Net Worth" total equal to `assets − liabilities` for the
  fixture, and — the regression guard — there is no account named "Net Worth" anywhere in the rendered output
  as a linked/tree row (only as the standalone total).

---

## 5. Suggested order of work

1. Backend (§1): `AccountBalance` type, `ITransactionQrySvc`/`TransactionTeeSvc`/
   `TransactionMaterializedStoreSvc` + its test, `transactionHandlers.ts` + test, RPC schema + `index.ts`
   wiring, `transactionsClient.ts`. Verify end-to-end with a throwaway manual check (create a couple of
   Asset/Liability transactions, confirm `findAccountBalancesAsOf` returns the right totals) before building
   UI on top — same verification discipline as every prior plan's §"prerequisites" step.
2. `buildBalanceSheet.ts` + its unit tests (§2) — the cheapest, most important tests in this plan, and the
   ones that actually pin down this revision's domain rule in code. Write before touching the page component,
   per this codebase's established "pure logic first" ordering.
3. Wire `BalanceSheetPage.tsx` (§3) to real data, replacing the "Coming soon" placeholder.
4. Extend `BalanceSheetPage.test.tsx` (§4).
5. Manual check: `bun run dev:hmr`, open a file with some Asset/Liability activity (and, ideally, an opening-
   balance or revaluation posting against Net Worth, to visually confirm it never shows up as its own row),
   confirm indentation, subtotals, the Net Worth total, and that clicking an account name navigates to its
   Register.

## 6. Explicitly out of scope for this pass

- Income Statement, Cash Flow Statement — untouched stubs, unrelated to this task.
- Any balanced/unbalanced integrity-check UI — removed in this revision (§0); the figure can no longer go out
  of balance by construction.
- Collapse/expand per category — the report always renders fully expanded (todo doesn't ask for it, and the
  old app never had it either since it had no category hierarchy at all).
- Export/print.
