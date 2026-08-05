# Balance Sheet / Income Statement Layout — Implementation Plan

> **Implemented as planned**, with one correction made mid-implementation: §0's original whitespace-bug
> diagnosis put the `items-start` fix on the *inner* right-hand column. That's wrong — `align-items` on a
> `flex-col` controls the **horizontal** (cross-axis) sizing of its children, not vertical, so it would have
> been a no-op for the height-stretch bug and would additionally have broken the Liabilities/Equity tables'
> intended full-width stretch. The fix actually belongs on the **outer row** (`<div class="flex gap-4">` →
> `flex items-start gap-4`), whose cross-axis *is* vertical — that's what was stretching the right-hand
> column tall in the first place, which is what gave the inner `flex-1` Liabilities table extra vertical
> space to grow into. §0 and the code snippets below have been corrected in place to match what was actually
> built. Also hit, and worth flagging again: `getByText`/`queryByText` throw on *multiple* matches, not just
> zero — `NetTotalTable`'s heading (`"Net Income"`) and its data-row label (also `"Net Income"`, by design)
> collide, so the test uses `getAllByText(...).find(el => el.tagName === "TD")` to disambiguate (same class of
> mistake as the one flagged in `income-statement-implementation-plan.md`'s own "Implemented as planned"
> note — this is clearly a recurring trap worth remembering, not a one-off). `bun run test` passes all 1144
> tests including the extended coverage; `tsc --noEmit` and a production `vite build` are both clean. Not
> independently verified: actually opening the Electrobun window and eyeballing the layout against
> `tasks/done/balance-sheet-layout.png` — no automated driver exists in this environment (same caveat as
> every prior UI-facing pass in this repo).

> Covers the task's source todo (+ its adjacent `tasks/done/balance-sheet-layout.png` mockup of the old
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
- **Root cause of the Liabilities whitespace bug, and where the fix actually belongs**: the top-level
  `<div class="flex gap-4">` *row* has Assets and the right-hand column as its two direct children, with no
  `items-start` of its own — so default cross-axis (vertical, for a row) `align-items: stretch` stretches the
  right-hand column's height to match Assets' (taller) height. *Inside* that now-artificially-tall column
  (`flex flex-1 flex-col gap-4`), the Liabilities `CategoryRollupTable`'s own root `<div>` carries
  `class="flex-1 ..."` — correct for its *other* role (the width-flexed child of the outer row when it's used
  as Assets), but here, as a plain child of a `flex-col`, `flex-1` governs the **main axis**, i.e. vertical
  grow — so it grabs all of the column's artificial extra height, stretching its own rounded box past its
  actual content. The fix therefore belongs on the **outer row**, not the inner column: add `items-start` to
  `<div class="flex gap-4">` (→ `flex items-start gap-4`). That stops the outer row from stretching the
  right-hand column tall in the first place, so the column's own height collapses to its natural content
  height (Liabilities + gap + the new Equity table), leaving Liabilities' `flex-1` nothing extra to grow into.
  Putting `items-start` on the *inner* column instead would be a no-op for this bug (that column's cross axis
  is horizontal, not vertical — `align-items` there controls the children's *width*, not height) and would
  additionally break the intended full-width stretch of the Liabilities/Equity tables, which needs the inner
  column's default `align-items: stretch` left alone. This one outer-row class change is also what makes "the
  EQUITY table aligns just below the LIABILITIES table" true as a consequence, not something that needs
  separate handling.
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
 * table shape (see tasks/done/balance-sheet-layout.png): one row plus a total row with the same figure.
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
<div class="flex items-start gap-4">
	<CategoryRollupTable section={balanceSheet().assets} acctType="ASSET" valueHeading="Balance" />
	<div class="flex flex-1 flex-col gap-4">
		<CategoryRollupTable section={balanceSheet().liabilities} acctType="LIABILITY" valueHeading="Balance" />
		<NetTotalTable heading="Equity" valueHeading="Balance" rowLabel="Net Worth" amount={balanceSheet().netWorth} />
	</div>
</div>
```

Two changes from today: `items-start` added to the **outer row's** class list (§0's whitespace fix — not the
inner column, which keeps its default stretch so the Liabilities/Equity tables still fill the column's full
width), and the inline Net Worth `<div>` replaced by `<NetTotalTable>`.

---

## 4. `IncomeStatementSummary.tsx`

```tsx
import NetTotalTable from "../reports/NetTotalTable";
// ...
<div class="flex items-start gap-4">
	<CategoryRollupTable section={summary().expenses} acctType="EXPENSE" valueHeading="Amount" />
	<div class="flex flex-1 flex-col gap-4">
		<CategoryRollupTable section={summary().income} acctType="INCOME" valueHeading="Amount" />
		<NetTotalTable heading="Net Income" valueHeading="Amount" rowLabel="Net Income" amount={summary().netIncome} />
	</div>
</div>
```

Same three changes as Balance Sheet: `valueHeading="Amount"` on both `CategoryRollupTable` calls (the text
tweak the todo asks for), `items-start` on the outer row, inline Net Income `<div>` replaced by
`<NetTotalTable>`.

---

## 5. Testing

- `BalanceSheetPage.test.tsx` — extend the existing "renders category/account rows..." test: after the
  existing Net-Worth-is-not-a-link assertion, add checks that the Equity table's headers read `"Equity"`/
  `"Balance"`, the `"Total Equity"` row's `<tr>` textContent contains the same `$600.00` figure as the `"Net
  Worth"` row, and (a cheap regression guard for §0's whitespace fix, since happy-dom doesn't compute real
  layout so the whitespace itself isn't otherwise testable) the outer row element carries the `items-start`
  class.
- `IncomeStatementPage.test.tsx` — extend the existing "summary view" test the same way (`"Net Income"`/
  `"Amount"` headers, `"Total Net Income"` row matching `$2,600.00`, `items-start` on the outer row) and add
  one assertion that `queryByText("Balance")` is `null` in the Summary view (mirroring the Details view's
  existing "Balance shouldn't appear" test) now that Summary's tables say `"Amount"` instead.
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
   visually confirm — against `tasks/done/balance-sheet-layout.png` — that the Liabilities table has no
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
