import type { Account } from "@checquery/shared/domain/accounts/Account";
import type { AcctId } from "@checquery/shared/domain/accounts/AcctId";
import type { AccountCategory } from "@checquery/shared/domain/accountCategories/AccountCategory";
import type { AccountBalance } from "@checquery/shared/domain/transactions/AccountBalance";
import type { Period } from "@checquery/shared/domain/core/Period";
import { fromCents, toCents } from "@checquery/shared/domain/core/CurrencyAmt";
import type { CurrencyAmt } from "@checquery/shared/domain/core/CurrencyAmt";
import { buildCategoryRollupSection, type CategoryRollupSection } from "../reports/buildCategoryRollupSection";

export type IncomeStatementSummary = {
	period: Period;
	expenses: CategoryRollupSection;
	income: CategoryRollupSection;
	/** income.total - expenses.total -- plain arithmetic, not a hidden-account gotcha the way Net Worth is
	 *  (see documentation/income-statement-implementation-plan.md §0). */
	netIncome: CurrencyAmt;
};

/**
 * Builds the Expenses/Income/Net-Income summary for a period, via the shared buildCategoryRollupSection
 * (see documentation/income-statement-implementation-plan.md §0/§1 -- same infrastructure the balance sheet
 * uses for Assets/Liabilities).
 */
export function buildIncomeStatementSummary(
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	balances: readonly AccountBalance[],
	period: Period,
): IncomeStatementSummary {
	const accountsById = new Map(accounts.map((account) => [account.id, account]));

	const signedCentsByAcct = new Map<AcctId, number>();
	for (const balance of balances) {
		const account = accountsById.get(balance.acctId);
		if (!account) continue;
		const debitCents = toCents(balance.debit);
		const creditCents = toCents(balance.credit);
		const signedCents = account.acctType === "EXPENSE" ? debitCents - creditCents : creditCents - debitCents;
		signedCentsByAcct.set(balance.acctId, signedCents);
	}

	const expenses = buildCategoryRollupSection("Expenses", categories, accounts, signedCentsByAcct, "EXPENSE");
	const income = buildCategoryRollupSection("Income", categories, accounts, signedCentsByAcct, "INCOME");
	const netIncome = fromCents(toCents(income.total) - toCents(expenses.total));

	return { period, expenses, income, netIncome };
}
