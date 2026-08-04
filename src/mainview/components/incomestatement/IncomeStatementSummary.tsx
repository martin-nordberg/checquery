import { createMemo, createResource, Show } from "solid-js";
import { type Period, getEndDate, getStartDate } from "../../../shared/domain/core/Period";
import CategoryRollupTable from "../reports/CategoryRollupTable";
import { accountsClient } from "../../accounts/accountsClient";
import { accountCategoriesClient } from "../../accountCategories/accountCategoriesClient";
import { transactionsClient } from "../../transactions/transactionsClient";
import { buildIncomeStatementSummary } from "../../incomestatement/buildIncomeStatementSummary";

type IncomeStatementSummaryProps = { period: Period };

/**
 * Only fetches the cheap aggregate query (findAccountBalancesForPeriod) -- switching to Details mounts a
 * different component (IncomeStatementDetails.tsx) that fetches the heavier per-transaction data instead.
 * See documentation/income-statement-implementation-plan.md §0.
 */
export default function IncomeStatementSummary(props: IncomeStatementSummaryProps) {
	const [accounts] = createResource(() => accountsClient.findAccountsAll());
	const [categories] = createResource(() => accountCategoriesClient.findAccountCategoriesAll());
	const [balances] = createResource(
		() => props.period,
		(period) => transactionsClient.findAccountBalancesForPeriod(getStartDate(period), getEndDate(period)),
	);

	const summary = createMemo(() =>
		buildIncomeStatementSummary(categories() ?? [], accounts() ?? [], balances() ?? [], props.period),
	);

	return (
		<Show
			when={!accounts.loading && !categories.loading && !balances.loading}
			fallback={<p class="text-slate-500">Loading…</p>}
		>
			<div class="flex gap-4">
				<CategoryRollupTable section={summary().expenses} acctType="EXPENSE" />
				<div class="flex flex-1 flex-col gap-4">
					<CategoryRollupTable section={summary().income} acctType="INCOME" />
					<div class="flex items-center justify-between rounded-lg bg-blue-50 px-6 py-3 shadow-lg">
						<span class="text-sm font-semibold text-gray-900">Net Income</span>
						<span class="text-sm font-semibold text-gray-900">{summary().netIncome}</span>
					</div>
				</div>
			</div>
		</Show>
	);
}
