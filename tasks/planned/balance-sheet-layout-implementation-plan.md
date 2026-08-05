# Balance Sheet / Income Statement Layout — Implementation Plan

> Covers the task's source todo (+ its adjacent `tasks/planned/balance-sheet-layout.png` mockup of the old
> checquery balance sheet): fixing a layout bug in the Balance Sheet's right-hand column, turning the Net
> Worth/Net Income "highlighted bar" into a proper table matching the Assets/Liabilities/Expenses/Income
> table style, and one column-header text tweak on the Income Statement Summary view. Purely presentational —
> nothing here touches how `netWorth`/`netIncome` are computed (`buildBalanceSheet.ts` /
> `buildIncomeStatementSummary.ts` are unchanged; CLAUDE.md's Domain Model Notes on Net Worth still apply
> exactly as before).

---

## 0. Decisions from this planning pass

- **The mockup shows the *old* checquery app's balance sheet**, which is flat (no account categories) —
  hence the `"Category : Account"` naming in its row labels. The todo is explicit that this is only about the
  **Equity section's shape** (headings, one row, one total row) and the **Liabilities whitespace bug**, not
  about reverting checquery2's category-tree/indentation work: *"this figure is not meant to propose any
  changes to the current hierarchical asset and liability rows."* Nothing about `CategoryRollupTable`'s
  category-rollup rendering changes.
- **Root cause of the Liabilities whitespace bug**: `CategoryRollupTable`'s own root `<div>` carries
  `class="flex-1 ..."`. That's correct when it's the width-flexed child of the top-level `flex gap-4` *row*
  (Assets vs. the right-hand column), but the *same* component is also placed as a plain child inside the
  right-hand column's `flex flex-1 flex-col gap-4` — a flex **column** — where default cross-axis
  `align-items: stretch` makes that `flex-1` stretch the Liabilities table's own height to fill the column
  (which itself has been stretched tall to match Assets' height by the outer row). The result: genuine empty
  space inside the Liabilities table's rounded box, below its last row. Fix: add `items-start` to the
  right-hand column's classes in both `BalanceSheetPage.tsx` and `IncomeStatementSummary.tsx` (which has the
  identical two-column structure) — this overrides the column's cross-axis alignment so each child (the
  `CategoryRollupTable` and the new Equity/Net-Income table) sizes to its own content instead of stretching.
  This one class change is what makes "the EQUITY table aligns just below the LIABILITIES table" true as a
  consequence, not something that needs separate handling.
- **A new shared component, `NetTotalTable.tsx`**, replaces the existing inline "highlighted bar" `<div>` for
  both Net Worth (Balance Sheet) and Net Income (Income Statement **Summary** view only — see below):
  same visual family as `CategoryRollupTable` (`<table>`, sticky `bg-blue-100` header row, `bg-blue-50` total
  row), but fixed to exactly one data row plus one total row, both showing the same already-computed amount —
  matching the mockup's EQUITY table (`Net Worth` row, `Total Equity` row, same figure twice) exactly. Reused
  as-is for `NET INCOME` / `Net Income` / `Total Net Income`, since the shapes are identical and the todo says
  "The Income and Net Income section should have similar changes."
- **Column header text becomes a `CategoryRollupTable` prop (`valueHeading`), required at every call site** —
  today it's hardcoded to `"Balance"`. The todo wants `"Amount"` for the Income Statement Summary's
  Expenses/Income tables specifically (Balance Sheet's Assets/Liabilities keep `"Balance"` — the mockup and
  the todo's own wording ("EQUITY" and "BALANCE") confirm Balance Sheet is untouched here). Making the prop
  required (not defaulted) means every one of the four existing call sites states its own heading explicitly
  rather than three of them silently relying on a default — consistent with this codebase's general
  preference for explicitness over implicit defaults (`acctType` is never optional/defaulted elsewhere
  either).
- **Scope is Balance Sheet + Income Statement *Summary* view only — Income Statement *Details* view is
  untouched.** Details already uses its own component (`IncomeStatementDetailTable.tsx`, not
  `CategoryRollupTable`), already headed `"Amount"` (not `"Balance"`, so the text-tweak bullet doesn't apply
  to it), and already renders as a single stacked column (`flex flex-col`, no `flex-1` on any child) — so the
  whitespace bug this plan fixes doesn't exist there in the first place. The todo's bullets ("no whitespace in
  the Income table," "the Net Income table appears immediately below the Income table") describe the exact
  two-column mechanics that only apply to Summary's Assets-style side-by-side layout; Details' Net Income bar
  is left as its current highlighted `<div>`. If that turns out to be wanted for visual consistency too, it's
  a trivial follow-up (swap the `<div>` for `<NetTotalTable heading="Net Income" valueHeading="Amount"
  rowLabel="Net Income" amount={details().netIncome} />`) — deliberately not done here since the todo didn't
  ask for it and Details has no whitespace problem to fix.
- **`NetTotalTable`'s total-row label is computed internally as `Total {heading}`**, not passed as a separate
  prop — mirrors `CategoryRollupTable`'s existing `Total {section.heading}` convention exactly, and keeps the
  two Balance Sheet call sites' props to the minimum needed (`heading="Equity"` alone implies `"Total
  Equity"`, same as `heading="Net Income"` implies `"Total Net Income"`).

---

## 1. `src/mainview/components/reports/NetTotalTable.tsx` (new)

```tsx
import type { CurrencyAmt } from "../../../shared/domain/core/CurrencyAmt";

type NetTotalTableProps = {
	heading: string;      // "Equity" | "Net Income"
	valueHeading: string; // "Balance" | "Amount"
	rowLabel: string;     // "Net Worth" | "Net Income"
	amount: CurrencyAmt;
};

/**
 * A CategoryRollupTable-styled table for a single already-computed derived total, shown twice (once as the
 * "account-shaped" data row, once as the closing "Total {heading}" row) -- matches the old app's EQUITY
 * table shape (see tasks/planned/balance-sheet-layout.png): one row plus a total row with the same figure.
 * Reused for Net Worth (Balance Sheet) and Net Income (Income Statement Summary) -- see
 * documentation/balance-sheet-layout-implementation-plan.md §0.
 */
export default function NetTotalTable(props: NetTotalTableProps) {
	return (
		<div class="overflow-hidden rounded-lg bg-white shadow-lg">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="sticky top-0 z-10 bg-blue-100">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
							{props.heading}
						</th>
						<th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
							{props.valueHeading}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					<tr class="hover:bg-gray-50">
						<td class="px-6 py-2 text-sm text-gray-900">{props.rowLabel}</td>
						<td class="px-6 py-2 text-right text-sm text-gray-500">{props.amount}</td>
					</tr>
					<tr class="bg-blue-50">
						<td class="border-t border-blue-200 px-6 py-2 text-sm font-semibold text-gray-900">
							Total {props.heading}
						</td>
						<td class="border-t border-blue-200 px-6 py-2 text-right text-sm font-semibold text-gray-900">
							{props.amount}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}
```

Deliberately **no `flex-1`** on the root `<div>` (unlike `CategoryRollupTable`) — it's never used as the
width-flexed item in a horizontal row, only ever stacked in the already-fixed-width right-hand column, so it
should size to its own content, matching the mockup.

---

## 2. `CategoryRollupTable.tsx` — add the `valueHeading` prop

```tsx
type CategoryRollupTableProps = {
	section: CategoryRollupSection;
	acctType: AcctTypeStr;
	valueHeading: string; // "Balance" (Balance Sheet) | "Amount" (Income Statement Summary)
};
```

Replace the hardcoded `<th ...>Balance</th>` with `<th ...>{props.valueHeading}</th>`. No other change to this
file.

---

## 3. `BalanceSheetPage.tsx`

```tsx
import NetTotalTable from "../../components/reports/NetTotalTable";
// ...
<div class="flex gap-4">
	<CategoryRollupTable section={balanceSheet().assets} acctType="ASSET" valueHeading="Balance" />
	<div class="flex flex-1 flex-col items-start gap-4">
		<CategoryRollupTable section={balanceSheet().liabilities} acctType="LIABILITY" valueHeading="Balance" />
		<NetTotalTable heading="Equity" valueHeading="Balance" rowLabel="Net Worth" amount={balanceSheet().netWorth} />
	</div>
</div>
```

Two changes from today: `items-start` added to the right-hand column's class list (§0's whitespace fix,
`w-full` is not needed since neither child needs forcing to the column's full width — `CategoryRollupTable`
still has its own `flex-1` for width, which continues to work fine at `items-start` since `flex-1` governs
main-axis, not cross-axis, sizing in a `flex-row` context, but this column is a `flex-col`, so `flex-1` here
governs *height* only, which is exactly what `items-start` neutralizes; width is unaffected either way since
block-level table content already fills the column's width by default), and the inline Net Worth `<div>`
replaced by `<NetTotalTable>`.

---

## 4. `IncomeStatementSummary.tsx`

```tsx
import NetTotalTable from "../reports/NetTotalTable";
// ...
<div class="flex gap-4">
	<CategoryRollupTable section={summary().expenses} acctType="EXPENSE" valueHeading="Amount" />
	<div class="flex flex-1 flex-col items-start gap-4">
		<CategoryRollupTable section={summary().income} acctType="INCOME" valueHeading="Amount" />
		<NetTotalTable heading="Net Income" valueHeading="Amount" rowLabel="Net Income" amount={summary().netIncome} />
	</div>
</div>
```

Same three changes as Balance Sheet: `valueHeading="Amount"` on both `CategoryRollupTable` calls (the text
tweak the todo asks for), `items-start` on the right-hand column, inline Net Income `<div>` replaced by
`<NetTotalTable>`.

---

## 5. Testing

- `BalanceSheetPage.test.tsx` — extend the existing "renders category/account rows..." test: after the
  existing Net-Worth-is-not-a-link assertion, add checks that the Equity table's headers read `"Equity"`/
  `"Balance"`, the `"Total Equity"` row's `<tr>` textContent contains the same `$600.00` figure as the `"Net
  Worth"` row, and (a cheap regression guard for §0's whitespace fix, since happy-dom doesn't compute real
  layout so the whitespace itself isn't otherwise testable) the right-hand column element carries the
  `items-start` class.
- `IncomeStatementPage.test.tsx` — extend the existing "summary view" test the same way (`"Net Income"`/
  `"Amount"` headers, `"Total Net Income"` row matching `$2,600.00`, `items-start` present) and add one
  assertion that `queryByText("Balance")` is `null` in the Summary view (mirroring the Details view's existing
  "Balance shouldn't appear" test) now that Summary's tables say `"Amount"` instead.
- No test for the whitespace bug's actual visual absence — confirmed only by eye. See §6.

## 6. Suggested order of work

1. `NetTotalTable.tsx` (§1) — small, no dependencies on the other changes.
2. `CategoryRollupTable.tsx`'s `valueHeading` prop (§2) — a one-line internal change plus updating its own
   two current call sites' props (done together with §3/§4 below, since TypeScript will otherwise fail to
   build with a missing required prop).
3. `BalanceSheetPage.tsx` (§3) and `IncomeStatementSummary.tsx` (§4) together.
4. Extend the two test files (§5).
5. `tsc --noEmit`, `bun run test`, production `vite build`.
6. Manual check: `bun run dev:hmr`, open a file with both Asset/Liability and Expense/Income activity, and
   visually confirm — against `tasks/planned/balance-sheet-layout.png` — that the Liabilities table has no
   trailing blank space, the Equity table sits directly below it with the same width, and the Income Statement
   Summary looks the same way for Income/Net Income. No automated driver exists in this environment for this
   check (same caveat as every prior UI-facing pass in this repo).

## 7. Explicitly out of scope

- Income Statement **Details** view (§0) — no whitespace bug there, no `"Balance"`→`"Amount"` tweak needed
  (already `"Amount"`), and the todo didn't ask for its Net Income bar to change shape.
- Any change to how `netWorth`/`netIncome` are computed, or to the category-tree/indentation rendering in
  `CategoryRollupTable`'s row logic — purely a header-text and container-layout change plus a new table for an
  already-existing derived value.
- Cash Flow Statement / Annual Budget — unrelated, and Cash Flow Statement no longer exists in this app at
  all (see CLAUDE.md's Project State).
