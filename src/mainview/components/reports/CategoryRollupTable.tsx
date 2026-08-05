import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import { accountDetailRoute } from "../../accounts/accountRoute";
import type { CategoryRollupLine, CategoryRollupSection } from "../../reports/buildCategoryRollupSection";

type CategoryRollupTableProps = {
	section: CategoryRollupSection;
	acctType: AcctTypeStr;
	valueHeading: string; // "Balance" (Balance Sheet) | "Amount" (Income Statement Summary)
};

/**
 * Renders one CategoryRollupSection: a category row per branch (bold, its own rolled-up subtotal, indented
 * by depth) and a linked account row per leaf, closed by a bold "Total {heading}" row. Shared by the balance
 * sheet (ASSET/LIABILITY) and the income statement summary (EXPENSE/INCOME) -- see
 * documentation/income-statement-implementation-plan.md §0/§1.
 */
export default function CategoryRollupTable(props: CategoryRollupTableProps) {
	return (
		<div class="flex-1 overflow-hidden rounded-lg bg-white shadow-lg">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="sticky top-0 z-10 bg-blue-100">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
							{props.section.heading}
						</th>
						<th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
							{props.valueHeading}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					<For each={props.section.lines}>
						{(line: CategoryRollupLine) => (
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-2 text-sm text-gray-900" classList={{ "font-semibold": line.kind === "category" }}>
									<div style={{ "padding-left": `${line.depth * 1.5}rem` }}>
										<Show when={line.kind === "account" && line.acctId} fallback={line.label}>
											<A href={accountDetailRoute(props.acctType, line.acctId!)} class="hover:text-blue-600 hover:underline">
												{line.label}
											</A>
										</Show>
									</div>
								</td>
								<td class="px-6 py-2 text-right text-sm text-gray-500" classList={{ "font-semibold": line.kind === "category" }}>
									{line.amount}
								</td>
							</tr>
						)}
					</For>
					<tr class="bg-blue-50">
						<td class="border-t border-blue-200 px-6 py-2 text-sm font-semibold text-gray-900">
							Total {props.section.heading}
						</td>
						<td class="border-t border-blue-200 px-6 py-2 text-right text-sm font-semibold text-gray-900">
							{props.section.total}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}
