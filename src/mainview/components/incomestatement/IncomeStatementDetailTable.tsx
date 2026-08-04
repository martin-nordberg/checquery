import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import { accountDetailRoute } from "../../accounts/accountRoute";
import {
	formatVendorDescription,
	type IncomeStatementDetailLine,
	type IncomeStatementDetailSection,
} from "../../incomestatement/buildIncomeStatementDetails";

type IncomeStatementDetailTableProps = {
	section: IncomeStatementDetailSection;
	acctType: AcctTypeStr;
};

/**
 * Renders one IncomeStatementDetailSection: category rows same as CategoryRollupTable (bold, indented, own
 * subtotal); account rows (linked, indented, own total) are followed by one row per entry, indented one
 * level deeper -- date, vendor/description, amount, plain text (no link -- see
 * documentation/income-statement-implementation-plan.md §0).
 */
export default function IncomeStatementDetailTable(props: IncomeStatementDetailTableProps) {
	return (
		<section class="overflow-hidden rounded-lg bg-white shadow-lg">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="sticky top-0 z-10 bg-blue-100">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
							{props.section.heading}
						</th>
						<th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Amount</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					<For each={props.section.lines}>
						{(line: IncomeStatementDetailLine) => (
							<>
								<tr class="hover:bg-gray-50" classList={{ "bg-gray-50": line.kind === "account" }}>
									<td class="px-6 py-2 text-sm font-semibold text-gray-900">
										<div style={{ "padding-left": `${line.depth * 1.5}rem` }}>
											<Show when={line.kind === "account"} fallback={line.label}>
												<A
													href={accountDetailRoute(props.acctType, (line as Extract<IncomeStatementDetailLine, { kind: "account" }>).acctId)}
													class="hover:text-blue-600 hover:underline"
												>
													{line.label}
												</A>
											</Show>
										</div>
									</td>
									<td class="px-6 py-2 text-right text-sm font-semibold text-gray-900">{line.amount}</td>
								</tr>
								<Show when={line.kind === "account"}>
									<For each={(line as Extract<IncomeStatementDetailLine, { kind: "account" }>).entries}>
										{(entry) => (
											<tr class="hover:bg-gray-50">
												<td class="px-6 py-1 text-sm text-gray-500">
													<div style={{ "padding-left": `${(line.depth + 1) * 1.5}rem` }}>
														<span class="inline-block w-24">{entry.date}</span>
														<span>{formatVendorDescription(entry)}</span>
													</div>
												</td>
												<td class="px-6 py-1 text-right text-sm text-gray-400">{entry.amount}</td>
											</tr>
										)}
									</For>
								</Show>
							</>
						)}
					</For>
					<tr class="bg-blue-50">
						<td class="border-t-2 border-blue-200 px-6 py-2 text-sm font-semibold text-gray-900">
							Total {props.section.heading}
						</td>
						<td class="border-t-2 border-blue-200 px-6 py-2 text-right text-sm font-semibold text-gray-900">
							{props.section.total}
						</td>
					</tr>
				</tbody>
			</table>
		</section>
	);
}
