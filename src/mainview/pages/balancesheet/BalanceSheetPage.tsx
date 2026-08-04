import { useParams } from "@solidjs/router";
import { createMemo, createResource, Show } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import CategoryRollupTable from "../../components/reports/CategoryRollupTable";
import { balanceSheetIconPath, cashFlowIconPath, incomeStatementIconPath } from "../../nav/icons";
import { isoDateSchema, isoDateToday, type IsoDate } from "../../../shared/domain/core/IsoDate";
import { accountsClient } from "../../accounts/accountsClient";
import { accountCategoriesClient } from "../../accountCategories/accountCategoriesClient";
import { transactionsClient } from "../../transactions/transactionsClient";
import { buildBalanceSheet } from "../../balancesheet/buildBalanceSheet";

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
						<CategoryRollupTable section={balanceSheet().assets} acctType="ASSET" />
						<div class="flex flex-1 flex-col gap-4">
							<CategoryRollupTable section={balanceSheet().liabilities} acctType="LIABILITY" />
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
