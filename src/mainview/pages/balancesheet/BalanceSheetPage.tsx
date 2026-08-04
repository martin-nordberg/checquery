import { useParams, A } from "@solidjs/router";
import { createMemo, createResource, For, Show } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import { balanceSheetIconPath, cashFlowIconPath, incomeStatementIconPath } from "../../nav/icons";
import { isoDateSchema, isoDateToday, type IsoDate } from "../../../shared/domain/core/IsoDate";
import { accountsClient } from "../../accounts/accountsClient";
import { accountCategoriesClient } from "../../accountCategories/accountCategoriesClient";
import { transactionsClient } from "../../transactions/transactionsClient";
import { accountDetailRoute } from "../../accounts/accountRoute";
import { buildBalanceSheet, type BalanceSheetLine, type BalanceSheetSection } from "../../balancesheet/buildBalanceSheet";

function currentMonthPeriod(): string {
	const today = new Date();
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

/** Today, plus the last day of each of the 12 preceding calendar months (per info-architecture.md §10). */
function dateOptions(): Record<string, string> {
	const options: Record<string, string> = {};
	const today = new Date();

	const todayIso = isoDateToday();
	options[todayIso] = `/balancesheet/${todayIso}`;

	for (let i = 0; i < 12; i++) {
		// Day 0 of month M gives the last day of month M-1; Date rolls the year back for negative months.
		const lastDay = new Date(today.getFullYear(), today.getMonth() - i, 0);
		const iso = lastDay.toLocaleDateString("sv") as IsoDate;
		if (!(iso in options)) {
			options[iso] = `/balancesheet/${iso}`;
		}
	}

	return options;
}

const reportOptions = () => ({
	"Balance Sheet": `/balancesheet/${isoDateToday()}`,
	"Income Statement": `/incomestatement/${currentMonthPeriod()}/summary`,
	"Cash Flow Statement": `/cashflow/${currentMonthPeriod()}`,
});

const reportIconPaths = {
	"Balance Sheet": balanceSheetIconPath,
	"Income Statement": incomeStatementIconPath,
	"Cash Flow Statement": cashFlowIconPath,
};

type BalanceSheetTableProps = {
	section: BalanceSheetSection;
	acctType: "ASSET" | "LIABILITY";
};

function BalanceSheetTable(props: BalanceSheetTableProps) {
	return (
		<div class="flex-1 overflow-hidden rounded-lg bg-white shadow-lg">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="sticky top-0 z-10 bg-blue-100">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
							{props.section.heading}
						</th>
						<th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Balance</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					<For each={props.section.lines}>
						{(line: BalanceSheetLine) => (
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

export default function BalanceSheetPage() {
	const params = useParams<{ endingDate: string }>();
	const endingDate = createMemo(() => isoDateSchema.parse(params.endingDate));

	const [accounts] = createResource(() => accountsClient.findAccountsAll());
	const [categories] = createResource(() => accountCategoriesClient.findAccountCategoriesAll());
	const [balances] = createResource(endingDate, (date) => transactionsClient.findAccountBalancesAsOf(date));

	const balanceSheet = createMemo(() =>
		buildBalanceSheet(categories() ?? [], accounts() ?? [], balances() ?? [], endingDate()),
	);

	return (
		<>
			<TopNav>
				<FileBreadcrumb />
				<Breadcrumb>
					<HoverableDropDown options={reportOptions()} selectedOption="Balance Sheet" iconPaths={reportIconPaths} />
				</Breadcrumb>
				<Breadcrumb>
					<HoverableDropDown options={dateOptions()} selectedOption={endingDate()} />
				</Breadcrumb>
			</TopNav>
			<main class="p-4">
				<h1 class="mb-4 text-lg font-semibold text-slate-700">Balance Sheet — {endingDate()}</h1>
				<Show
					when={!accounts.loading && !categories.loading && !balances.loading}
					fallback={<p class="text-slate-500">Loading…</p>}
				>
					<div class="flex gap-4">
						<BalanceSheetTable section={balanceSheet().assets} acctType="ASSET" />
						<div class="flex flex-1 flex-col gap-4">
							<BalanceSheetTable section={balanceSheet().liabilities} acctType="LIABILITY" />
							<div class="flex items-center justify-between rounded-lg bg-blue-50 px-6 py-3 shadow-lg">
								<span class="text-sm font-semibold text-gray-900">Net Worth</span>
								<span class="text-sm font-semibold text-gray-900">{balanceSheet().netWorth}</span>
							</div>
						</div>
					</div>
				</Show>
			</main>
		</>
	);
}
