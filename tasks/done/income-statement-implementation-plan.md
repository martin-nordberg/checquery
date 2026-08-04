# Income Statement — Implementation Plan

> **Implemented as planned**, §1–§5 built essentially as designed. `bun run test` (`bun --conditions=browser
> test`) passes all 1146 tests including the new coverage; `tsc --noEmit` and a production `vite build` are
> both clean. One test-writing pitfall worth flagging for next time: `queryByText`/`getByText` throw (not
> return `null`) when a query matches *more than one* element, not just when it matches zero — Details' two
> tables (Expenses, Income) both render an "Amount" column header, so `queryByText("Amount")` threw a
> multiple-elements error that looked, from the stack trace alone, like an unrelated `findByText` timeout
> failure several lines above it. Cost a fair amount of debugging before the actual cause (use
> `getAllByText(...)` and assert a length) was found. Not independently verified: actually opening the
> Electrobun window and eyeballing the report — no automated driver for that exists in this environment (same
> caveat as the balance sheet, transactions-register, calculator, and yaml-import passes). Run `bun run
> dev:hmr`, open a file with Expense/Income activity across at least two months, and check both the Summary
> and Details views.

> Covers turning `IncomeStatementPage.tsx` (breadcrumbs/period-and-view routing already wired, `<main>` still
> a "coming soon" stub) into the real Expenses/Income/Net-Income report described in
> `documentation/info-architecture.md` §11, following `../checquery/client`'s `IncomeStatement`/
> `IncomeStatementDetailed` look and feel as closely as checquery2's changed domain model allows, and reusing
> the balance-sheet pass's infrastructure wherever the two reports are actually the same shape, per
> `tasks/todo/income-statement.md`. Deltas from the prior effort, per the todo: accounts are categorized
> (not directly hierarchical), so both the Summary and Details views walk the `AccountCategory` tree and show
> **indentation for category hierarchy** plus **roll-up subtotals by category and subcategory** — the same
> two deltas the balance sheet plan already implemented for Assets/Liabilities.

---

## 0. Decisions from this planning pass

- **The category-rollup rendering logic is extracted out of the balance sheet pass and shared, not
  reimplemented.** `buildBalanceSheet.ts`'s private `flattenNode`/`buildSection` functions already do exactly
  what a Summary-view Expenses/Income section needs: walk `buildAccountCategoryTree`, produce one line per
  category (bold, its own rolled-up subtotal) and one line per leaf account, with `depth`-based indentation.
  This plan pulls that logic into `src/mainview/reports/buildCategoryRollupSection.ts` (§1), refactors
  `buildBalanceSheet.ts` to call it (behavior-preserving — its existing tests keep passing unchanged), and
  builds the Income Statement Summary on the same shared function. Same reasoning for the table component:
  `BalanceSheetPage.tsx`'s inline `BalanceSheetTable` becomes `src/mainview/components/reports/
  CategoryRollupTable.tsx`, reused by both pages, so the two reports can't visually drift apart over time.
- **Two new report queries, mirroring `findAccountBalancesAsOf`'s shape exactly, just bounded on both ends
  instead of one.** `findAccountBalancesAsOf(asOfDate)` (balance sheet) sums every entry with
  `post_date <= ?`; the Summary view needs the same aggregate but for `post_date BETWEEN ? AND ?` — a new
  `findAccountBalancesForPeriod(startDate, endDate)`. The Details view additionally needs individual
  transactions (date, vendor, description, per-entry amount) grouped by account — a new
  `findTransactionsForPeriod(startDate, endDate)`, returning ordinary `Transaction[]` (reusing the existing
  `hydrate()` helper), not a bespoke joined DTO the way the old app's `IncomeStatementRepo` built
  `IncStmtDetailLineItem`/`IncStmtEntryDetail` server-side. This matches the established convention (already
  applied to Register and the balance sheet): bun handlers stay thin wrappers over the store; all view-shaping
  (grouping by account, vendor-label resolution, category rollup) happens in pure, unit-tested mainview
  functions fed the full lists the page already fetches.
- **Both new queries stay unscoped by account type**, same reasoning as `findAccountBalancesAsOf`
  (§0 of the balance-sheet plan): they're reusable low-level primitives; which account types actually get
  reported (`EXPENSE`/`INCOME` here, vs. `ASSET`/`LIABILITY` for the balance sheet) is a decision the pure
  mainview functions make, not the SQL.
- **Summary and Details are two separate components, each fetching only what it needs** — mirroring the old
  app's `IncomeStatement`/`IncomeStatementDetailed` split (two components swapped via `<Show>`), not one
  component that always fetches everything. Summary only ever calls the cheap aggregate query
  (`findAccountBalancesForPeriod`); Details calls the heavier `findTransactionsForPeriod` (plus vendors/vendor
  categories, for vendor labels) only when it's actually the active view. Switching the view swaps which
  component is mounted, the same way switching pages does elsewhere in this app.
- **Net Income is a plain derived total (`Income − Expenses`), not a hidden-account gotcha.** Unlike the
  balance sheet's Net Worth (see `CLAUDE.md`'s Domain Model Notes — a real account whose own balance
  deliberately isn't trustworthy for reporting), there is no "Net Income account" in this domain at all; Income
  and Expense accounts are ordinary, fully-reportable accounts, and their totals for the period are exactly
  what should be subtracted. No CLAUDE.md update is needed for this plan — it's not surfacing a new domain
  subtlety, just arithmetic.
- **Details view always renders the full category tree, including zero-activity branches, matching the
  balance sheet's precedent — a deliberate divergence from the old app.** The old app's
  `IncomeStatementRepo.findIncomeStatementDetails` used an inner join, so accounts with no entries in the
  period simply didn't appear at all. This plan instead always walks the complete tree (same as Summary and
  the balance sheet), rendering a zero-activity account at `$0.00` with no entry rows beneath it. One
  consistent mental model across every report in this app beats a per-report special case, and the visual
  cost is small (an extra `$0.00` row, not an extra section).
- **Details' per-account entry rows are a genuinely different shape from a `CategoryRollupLine`** (each leaf
  needs an attached, ordered list of transaction-level entries, not just an amount), so `buildIncomeStatement
  Details.ts` does **not** reuse `buildCategoryRollupSection` — it has its own small (~20-line) recursive
  flattener. This is deliberate duplication, not an oversight: generalizing the shared helper to carry an
  arbitrary per-leaf payload would mean introducing a generic type parameter, which nothing else in this
  codebase's pure-function layer does (`buildRegisterLineItems`, `buildAccountCategoryTree`,
  `sortAccountsForNav` are all concrete, non-generic functions) — matching that established style outweighs
  saving one small function.
- **Vendor labels in Details use `vendorPickerLabel` ("Category : Name"), not the old app's bare vendor
  name.** The old app displayed just `Vendor.name` because it had no vendor categories. Every other place in
  checquery2 that shows a vendor (the register, income/expense logs) uses the "Category : Name" convention via
  `vendorPickerLabel` — Income Statement Details follows the same app-wide convention rather than the old
  app's now-outdated literal format.
- **Layout matches the old app's actual code, not just its general description**: Summary uses a two-column
  layout (Expenses alone on the left; Income, then a Net Income box, stacked on the right) — the same
  arrangement the balance sheet plan already copied for Assets/Liabilities/Net-Worth. Details uses a single
  stacked column (Expenses section, then Income section, then a Net Income box, one under the other,
  `max-w-5xl mx-auto`) — a different, wider/taller layout than Summary's, matching
  `IncomeStatementDetailed.tsx` exactly rather than reusing Summary's two-column shape.
- **Only account-level rows link out, not individual entry rows** — matches the old app's actual
  `IncomeStatementDetailed.tsx` (`AccountSection`'s header links to `/expenselog`/`/incomelog`; the entry rows
  beneath are plain text), not a literal reading of `info-architecture.md` §11's "each account/transaction is
  clickable" that would require linking every entry to a per-transaction page — no such page exists in
  checquery2 (the register/logs don't support deep-linking to one transaction), so entry rows stay unlinked.
- **Out of scope, per the todo (only the categorization/indentation/subtotal deltas were requested):** no
  new period options beyond what `IncomeStatementPage.tsx` already computes, no CSV/print export, no
  collapse/expand per category (same as the balance sheet — the whole tree renders flat/expanded).

---

## 1. Shared refactor: extract the category-rollup logic and table (prerequisite, not new behavior)

### 1a. `src/mainview/reports/buildCategoryRollupSection.ts` (new)

Move `buildBalanceSheet.ts`'s private `flattenNode` and `buildSection` here essentially unchanged, generalizing
the `acctType` parameter from the literal union `"ASSET" | "LIABILITY"` to the full `AcctTypeStr` (the function
itself never assumed anything ASSET/LIABILITY-specific — that logic lives in the caller's sign-flip map):

```ts
export type CategoryRollupLine = {
	kind: "account" | "category";
	depth: number;
	label: string;
	amount: CurrencyAmt;
	acctId?: AcctId; // present only for kind: "account"
};

export type CategoryRollupSection = {
	heading: string;
	lines: CategoryRollupLine[];
	total: CurrencyAmt;
};

export function buildCategoryRollupSection(
	heading: string,
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	signedCentsByAcct: ReadonlyMap<AcctId, number>,
	acctType: AcctTypeStr,
): CategoryRollupSection
```

Internals identical to the current `buildBalanceSheet.ts` code: `buildAccountCategoryTree(categories, accounts,
acctType)`, then the same recursive flattener (category rows carry their own rolled-up subtotal; no separate
"Total X" row — see the balance-sheet plan's §0 for why).

### 1b. `buildBalanceSheet.ts` — refactor to call the shared function

`BalanceSheetLine`/`BalanceSheetSection` become type aliases of `CategoryRollupLine`/`CategoryRollupSection`
(re-exported under their existing names so `BalanceSheetPage.tsx` and `BalanceSheetPage.test.tsx` need no
changes):

```ts
export type BalanceSheetLine = CategoryRollupLine;
export type BalanceSheetSection = CategoryRollupSection;
```

`buildBalanceSheet` itself shrinks to: build `signedCentsByAcct` (unchanged), call
`buildCategoryRollupSection("Assets", ..., "ASSET")` and `buildCategoryRollupSection("Liabilities", ...,
"LIABILITY")`, compute `netWorth` (unchanged). **Purely a refactor** — `buildBalanceSheet.test.ts`'s existing
assertions keep passing without modification, confirming no behavior changed.

### 1c. `src/mainview/components/reports/CategoryRollupTable.tsx` (new, extracted from `BalanceSheetPage.tsx`)

The inline `BalanceSheetTable` function component moves here verbatim, generalizing its `acctType` prop from
`"ASSET" | "LIABILITY"` to `AcctTypeStr` and its `section` prop from `BalanceSheetSection` to
`CategoryRollupSection`:

```tsx
type CategoryRollupTableProps = {
	section: CategoryRollupSection;
	acctType: AcctTypeStr;
};

export default function CategoryRollupTable(props: CategoryRollupTableProps) { /* unchanged JSX */ }
```

`BalanceSheetPage.tsx` imports and uses this instead of its local component; no visual or behavioral change,
so `BalanceSheetPage.test.tsx`'s existing indentation/link/subtotal assertions keep passing unchanged.

### 1d. Tests

- `buildCategoryRollupSection.test.ts` (new) — the recursion/indentation tests currently exercised indirectly
  through `buildBalanceSheet.test.ts` (multi-level rollup, zero-activity account at `$0.00`, empty category
  still rendered) get a direct, dedicated home here. `buildBalanceSheet.test.ts` keeps its existing tests as
  integration-style coverage of the sign-flip + Net Worth glue on top.
- No new `CategoryRollupTable` test file — its rendering is already covered end-to-end by
  `BalanceSheetPage.test.tsx` (existing) and the new `IncomeStatementSummary`-level test (§6).

---

## 2. Backend: two new period-bounded queries

### 2a. `ITransactionQrySvc.ts` — add two methods

```ts
/** Net debit/credit totals per account, for every live entry whose transaction's postDate falls within
 *  [startDate, endDate] inclusive -- the Income Statement Summary's raw per-account data. Same unscoped-by-
 *  account-type shape as findAccountBalancesAsOf; the caller decides which account types are meaningful. */
findAccountBalancesForPeriod(startDate: IsoDate, endDate: IsoDate): Promise<AccountBalance[]>

/** Every non-deleted transaction whose postDate falls within [startDate, endDate] inclusive, oldest first --
 *  the Income Statement Details view's raw data; the mainview groups entries by account and resolves vendor
 *  labels. Unscoped by which accounts a transaction touches (same reasoning as findTransactionsByAccount). */
findTransactionsForPeriod(startDate: IsoDate, endDate: IsoDate): Promise<Transaction[]>
```

`TransactionTeeSvc` — delegate both straight to `this.qrySvc`, same one-liners as the existing four query
methods.

### 2b. `TransactionMaterializedStoreSvc.ts`

```ts
async findAccountBalancesForPeriod(startDate: IsoDate, endDate: IsoDate): Promise<AccountBalance[]> {
    const rows = this.db.query(
        `SELECT e.acct_id AS acct_id,
                COALESCE(SUM(e.debit_cents), 0) AS debit_cents,
                COALESCE(SUM(e.credit_cents), 0) AS credit_cents
         FROM entries e
         JOIN transactions t ON t.id = e.transaction_id
         WHERE t.is_deleted = 0 AND t.post_date >= ? AND t.post_date <= ?
         GROUP BY e.acct_id`
    ).all(startDate, endDate) as { acct_id: string; debit_cents: number; credit_cents: number }[]
    return rows.map((row) => ({
        acctId: row.acct_id as AcctId,
        debit: fromCents(row.debit_cents),
        credit: fromCents(row.credit_cents),
    }))
}

async findTransactionsForPeriod(startDate: IsoDate, endDate: IsoDate): Promise<Transaction[]> {
    const rows = this.db.query(
        `SELECT * FROM transactions t
         WHERE t.is_deleted = 0 AND t.post_date >= ? AND t.post_date <= ?
         ORDER BY t.post_date, t.rowid`
    ).all(startDate, endDate) as TransactionRow[]
    return rows.map((row) => this.hydrate(row))
}
```

Both reuse existing private helpers (`hydrate`) exactly like `findTransactionsByAccount` already does.

### 2c. `src/bun/transactionHandlers.ts`

```ts
export async function handleFindAccountBalancesForPeriod(params: { startDate: string; endDate: string }): Promise<AccountBalance[]> {
	const { store } = requireCurrentSession();
	return store.svcs.transactions.findAccountBalancesForPeriod(
		isoDateSchema.parse(params.startDate),
		isoDateSchema.parse(params.endDate),
	);
}

export async function handleFindTransactionsForPeriod(params: { startDate: string; endDate: string }): Promise<Transaction[]> {
	const { store } = requireCurrentSession();
	return store.svcs.transactions.findTransactionsForPeriod(
		isoDateSchema.parse(params.startDate),
		isoDateSchema.parse(params.endDate),
	);
}
```

### 2d. `src/shared/rpc.ts`

Add to `AppSchema.bun.requests`:

```ts
findAccountBalancesForPeriod: { params: { startDate: string; endDate: string }; response: AccountBalance[] };
findTransactionsForPeriod: { params: { startDate: string; endDate: string }; response: Transaction[] };
```

### 2e. `src/bun/index.ts`

Wire both new handlers, same one-line pattern as every other request.

### 2f. `src/mainview/transactions/transactionsClient.ts`

```ts
findAccountBalancesForPeriod: (startDate: string, endDate: string): Promise<AccountBalance[]> =>
	rpc.request.findAccountBalancesForPeriod({ startDate, endDate }),
findTransactionsForPeriod: (startDate: string, endDate: string): Promise<Transaction[]> =>
	rpc.request.findTransactionsForPeriod({ startDate, endDate }),
```

### 2g. Tests

- `TransactionMaterializedStoreSvc.test.ts` — extend: `findAccountBalancesForPeriod` sums correctly within
  range, excludes entries before `startDate` and after `endDate`, includes entries exactly on either boundary,
  excludes soft-deleted transactions, absent-account-is-simply-absent (mirrors the balance-sheet plan's
  `findAccountBalancesAsOf` coverage almost exactly, just with a lower bound added). `findTransactionsForPeriod`
  — returns only transactions within range ordered oldest-first, excludes soft-deleted, boundary-inclusive on
  both ends, empty range returns `[]`.
- `transactionHandlers.test.ts` — extend with end-to-end round trips for both new handlers (create a
  transaction, confirm it's found/excluded correctly relative to a period; confirm "no file open" rejects
  both).

---

## 3. Pure logic: `src/mainview/incomestatement/buildIncomeStatementSummary.ts` (new) + test

```ts
export type IncomeStatementSummary = {
	period: Period;
	expenses: CategoryRollupSection;
	income: CategoryRollupSection;
	netIncome: CurrencyAmt; // income.total - expenses.total
};

export function buildIncomeStatementSummary(
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	balances: readonly AccountBalance[],
	period: Period,
): IncomeStatementSummary
```

Internals: build `signedCentsByAcct` from `balances`, using each row's account's `acctType` (looked up from
`accounts`) to sign it — `EXPENSE` debit-normal (`debitCents - creditCents`), `INCOME` credit-normal
(`creditCents - debitCents`), the same convention `buildRegisterLineItems.ts`'s `isDebitBalance` and the
balance sheet's `ASSET`/`LIABILITY` split already established. Call `buildCategoryRollupSection("Expenses",
..., "EXPENSE")` and `buildCategoryRollupSection("Income", ..., "INCOME")`. `netIncome =
fromCents(toCents(income.total) - toCents(expenses.total))`.

### Test cases

- Multi-level Expense category rolls up correctly (mirrors the balance sheet's Banking/Checking/Savings case).
- An Income leaf sums with the correct credit-normal sign.
- `netIncome` equals `income.total - expenses.total` for an ordinary fixture, including a case where expenses
  exceed income (negative net income, rendered via `CurrencyAmt`'s parenthesized-negative format).
- An account present in `accounts` but absent from `balances` renders at `$0.00`.

---

## 4. Pure logic: `src/mainview/incomestatement/buildIncomeStatementDetails.ts` (new) + test

```ts
export type IncStmtEntryDetail = {
	date: IsoDate;
	vendorLabel?: string;
	description: DescriptionStr;
	amount: CurrencyAmt;
};

export type IncomeStatementDetailLine =
	| { kind: "category"; depth: number; label: string; amount: CurrencyAmt }
	| { kind: "account"; depth: number; label: string; amount: CurrencyAmt; acctId: AcctId; entries: IncStmtEntryDetail[] };

export type IncomeStatementDetailSection = {
	heading: string;
	lines: IncomeStatementDetailLine[];
	total: CurrencyAmt;
};

export type IncomeStatementDetails = {
	period: Period;
	expenses: IncomeStatementDetailSection;
	income: IncomeStatementDetailSection;
	netIncome: CurrencyAmt;
};

export function buildIncomeStatementDetails(
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	transactions: readonly Transaction[],
	vendors: readonly Vendor[],
	vendorCategories: readonly VendorCategory[],
	period: Period,
): IncomeStatementDetails
```

Internals:

1. Build `entriesByAcct: Map<AcctId, IncStmtEntryDetail[]>`: for every transaction, for every entry whose
   account (looked up via a local `Map<AcctId, Account>`) has `acctType` `EXPENSE` or `INCOME`, compute the
   signed amount with the same debit/credit-normal formula as §3, and push `{ date: transaction.postDate,
   vendorLabel: transaction.vndrId ? vendorPickerLabel(vendor, vendorCategories) : undefined, description:
   transaction.description, amount }`. Each entry becomes its own detail row (matching the old app's
   entry-level, not transaction-level, grouping) -- a split transaction touching two Expense accounts produces
   two separate rows, one under each account.
2. Sort each account's entry list ascending by `date` (oldest first, matching the old app's `ORDER BY
   Transaction.date`) -- stable sort, trusting `findTransactionsForPeriod`'s `post_date, rowid` input order to
   break same-day ties, same reasoning as `buildRegisterLineItems.ts`.
3. A private recursive flattener, structurally identical to `buildCategoryRollupSection`'s but with a richer
   leaf: for an account node, `entries: entriesByAcct.get(account.id) ?? []`, `amount` = the sum of those
   entries' cents (equivalently, `signedCentsByAcct.get(account.id) ?? 0`, computed once alongside step 1); for
   a category node, same subtotal-of-children accumulation as before. **Not shared with
   `buildCategoryRollupSection`** -- see §0's rationale.
4. `buildAccountCategoryTree(categories, accounts, "EXPENSE")` / `(..., "INCOME")`, flattened via step 3, each
   producing an `IncomeStatementDetailSection`. `netIncome` computed the same way as §3.

### `formatVendorDescription` (small helper, exported for the component to use — not baked into the pure data)

```ts
/** "<vendor> -- <description>" when both are present, whichever one is present alone, or "" when neither is
 *  -- matches the old app's IncomeStatementDetailed.tsx formatVendorDescription, kept as display-formatting
 *  logic rather than baked into IncStmtEntryDetail itself (mirrors the old app's own separation). */
export function formatVendorDescription(entry: Pick<IncStmtEntryDetail, "vendorLabel" | "description">): string
```

### Test cases

- A multi-level Expense category with two accounts, each with several dated entries: entries sort oldest
  first within an account; account total equals the sum of its entries; category row equals the sum of its
  accounts.
- A split transaction with entries against two different Income accounts produces one detail row under each,
  not a single combined row.
- An account with no entries in the period renders at `$0.00` with an empty `entries` array (§0's "always
  render the full tree" decision) -- explicitly distinguishing this from the old app's inner-join omission.
- Vendor label resolution: an entry whose transaction has a `vndrId` gets `vendorPickerLabel`'s "Category :
  Name" format; one without a vendor has `vendorLabel: undefined`.
- `formatVendorDescription`: both present, vendor only, description only, neither.
- `netIncome` matches `buildIncomeStatementSummary`'s result for the same fixture (a light cross-check that
  the two independently-written flatteners agree).

---

## 5. Components

### 5a. `src/mainview/components/incomestatement/IncomeStatementSummary.tsx` (new)

```tsx
type IncomeStatementSummaryProps = { period: Period };
```

Fetches `accountsClient.findAccountsAll()`, `accountCategoriesClient.findAccountCategoriesAll()`, and
`transactionsClient.findAccountBalancesForPeriod(getStartDate(period), getEndDate(period))` via
`createResource(() => props.period, ...)` for the last one (re-fetches when the period route param changes,
mirroring the balance sheet's `createResource(endingDate, ...)` pattern). Builds
`buildIncomeStatementSummary(...)` in a `createMemo`. Renders the old app's two-column layout (§0): `<div
class="flex gap-4">` with `<CategoryRollupTable section={summary().expenses} acctType="EXPENSE" />` alone on
the left, and a right column (`flex flex-col gap-4`) containing `<CategoryRollupTable section={summary().income}
acctType="INCOME" />` followed by a Net Income box styled identically to the balance sheet's Net Worth box
(`bg-blue-50` highlighted row, label + `summary().netIncome`).

### 5b. `src/mainview/components/incomestatement/IncomeStatementDetailTable.tsx` (new)

Renders one `IncomeStatementDetailSection`: `category` lines render exactly like `CategoryRollupTable`'s
(bold, indented, its own subtotal); `account` lines render the account name (linked via `accountDetailRoute`,
indented, its total) **followed by** one row per `line.entries` item, indented one level deeper than the
account (`(line.depth + 1) * 1.5rem`), showing the date, `formatVendorDescription(entry)`, and the amount --
plain text, no link (§0). Closing bold "Total {heading}" row, same as `CategoryRollupTable`.

### 5c. `src/mainview/components/incomestatement/IncomeStatementDetails.tsx` (new)

```tsx
type IncomeStatementDetailsProps = { period: Period };
```

Fetches accounts/categories (as above) plus `vendorsClient.findVendorsAll()`,
`vendorCategoriesClient.findVendorCategoriesAll()`, and
`transactionsClient.findTransactionsForPeriod(getStartDate(period), getEndDate(period))` (also keyed on
`period`). Builds `buildIncomeStatementDetails(...)` in a `createMemo`. Renders the old app's single stacked
column (§0): `<div class="flex flex-col gap-4 max-w-5xl mx-auto">` with `<IncomeStatementDetailTable
section={details().expenses} acctType="EXPENSE" />`, then the income table, then a Net Income box (same
styling as Summary's).

### 5d. `IncomeStatementPage.tsx` — wire the `<Show>`

Replace the `<main>` placeholder with:

```tsx
<main class="p-4">
	<h1 class="mb-4 text-lg font-semibold text-slate-700">
		Income Statement — {period()} ({viewLabel()})
	</h1>
	<Show when={view() === "details"} fallback={<IncomeStatementSummary period={period()} />}>
		<IncomeStatementDetails period={period()} />
	</Show>
</main>
```

Everything else in the file (breadcrumbs, `periodOptions`, `viewOptions`) is already correct and untouched.

---

## 6. Testing

- §1d, §2g, §3, §4 cover the pure-logic and backend layers.
- `IncomeStatementPage.test.tsx` (extend the existing breadcrumb-only file) — `mock.module` `accountsClient`/
  `accountCategoriesClient`/`vendorsClient`/`vendorCategoriesClient`/`transactionsClient` (both new methods),
  following `BalanceSheetPage.test.tsx`'s established pattern:
  - Summary view: a small multi-level Expense category + a bare Income account render with correct
    indentation and rolled-up subtotals; leaf accounts link to Expense/Income Log; Net Income box shows the
    correct derived total.
  - Details view: an account's entry rows render beneath it, indented one level deeper, with date/vendor-
    description/amount; entry rows are not wrapped in `<a>` while the account row is; switching the `view`
    route param (re-rendering at `/incomestatement/:period/details`) shows the details table instead of the
    summary table.

---

## 7. Suggested order of work

1. Shared refactor (§1) — extract `buildCategoryRollupSection.ts` and `CategoryRollupTable.tsx`; confirm
   `buildBalanceSheet.test.ts` and `BalanceSheetPage.test.tsx` still pass unchanged before proceeding (this is
   the regression gate proving the refactor didn't change balance-sheet behavior).
2. Backend (§2): both new query methods + their tests, handlers + tests, RPC schema + `index.ts` wiring,
   `transactionsClient.ts`. Verify end-to-end with a throwaway manual check (create a couple of Expense/Income
   transactions across two periods, confirm both new queries return the right slice) before building UI on
   top.
3. `buildIncomeStatementSummary.ts` + tests (§3).
4. `buildIncomeStatementDetails.ts` + `formatVendorDescription` + tests (§4).
5. Components (§5): `IncomeStatementSummary.tsx`, `IncomeStatementDetailTable.tsx`, `IncomeStatementDetails.tsx`,
   then wire `IncomeStatementPage.tsx`.
6. Extend `IncomeStatementPage.test.tsx` (§6).
7. Manual check: `bun run dev:hmr`, open a file with some Expense/Income activity across at least two months,
   confirm Summary's two-column layout, Details' stacked layout with entry rows, indentation, subtotals, Net
   Income, and that switching the period/view breadcrumb dropdowns and account links all navigate correctly.

## 8. Explicitly out of scope for this pass

- Cash Flow Statement, Annual Budget — untouched stubs, unrelated to this task.
- Any change to the period/view breadcrumb logic already in `IncomeStatementPage.tsx` -- it's already correct
  per `info-architecture.md` §11 and isn't part of the todo's requested deltas.
- Collapse/expand per category, CSV/print export -- same as the balance sheet.
- Linking individual entry rows in Details to anything -- no per-transaction page exists to link to (§0).
