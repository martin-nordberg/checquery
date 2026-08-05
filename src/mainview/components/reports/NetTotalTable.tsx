import type { CurrencyAmt } from "../../../shared/domain/core/CurrencyAmt";

type NetTotalTableProps = {
	heading: string; // "Equity" | "Net Income"
	valueHeading: string; // "Balance" | "Amount"
	rowLabel: string; // "Net Worth" | "Net Income"
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
