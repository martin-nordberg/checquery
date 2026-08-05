import { createMemo, createResource, Show } from "solid-js";
import { type Period, getEndDate, getStartDate } from "../../../shared/domain/core/Period";
import IncomeStatementDetailTable from "./IncomeStatementDetailTable";
import { accountsClient } from "../../accounts/accountsClient";
import { accountCategoriesClient } from "../../accountCategories/accountCategoriesClient";
import { transactionsClient } from "../../transactions/transactionsClient";
import { vendorsClient } from "../../vendors/vendorsClient";
import { vendorCategoriesClient } from "../../vendorCategories/vendorCategoriesClient";
import { buildIncomeStatementDetails } from "../../incomestatement/buildIncomeStatementDetails";

type IncomeStatementDetailsProps = { period: Period };

/**
 * Fetches findTransactionsForPeriod (plus vendors/vendor categories, for vendor labels) -- the heavier query
 * Summary avoids by staying on the cheap aggregate. See documentation/income-statement-implementation-plan.md
 * §0.
 */
export default function IncomeStatementDetails(props: IncomeStatementDetailsProps) {
	const [accounts] = createResource(() => accountsClient.findAccountsAll());
	const [categories] = createResource(() => accountCategoriesClient.findAccountCategoriesAll());
	const [vendors] = createResource(() => vendorsClient.findVendorsAll());
	const [vendorCategories] = createResource(() => vendorCategoriesClient.findVendorCategoriesAll());
	const [transactions] = createResource(
		() => props.period,
		(period) => transactionsClient.findTransactionsForPeriod(getStartDate(period), getEndDate(period)),
	);

	const details = createMemo(() =>
		buildIncomeStatementDetails(
			categories() ?? [],
			accounts() ?? [],
			transactions() ?? [],
			vendors() ?? [],
			vendorCategories() ?? [],
			props.period,
		),
	);

	return (
		<Show
			when={!accounts.loading && !categories.loading && !vendors.loading && !vendorCategories.loading && !transactions.loading}
			fallback={<p class="text-slate-500">Loading…</p>}
		>
			<div class="mx-auto flex max-w-5xl flex-col gap-4">
				<IncomeStatementDetailTable section={details().expenses} acctType="EXPENSE" />
				<IncomeStatementDetailTable section={details().income} acctType="INCOME" />
				<div class="flex items-center justify-between rounded-lg bg-blue-50 px-6 py-3 shadow-lg">
					<span class="text-sm font-semibold text-gray-900">Net Income</span>
					<span class="text-sm font-semibold text-gray-900">{details().netIncome}</span>
				</div>
			</div>
		</Show>
	);
}
