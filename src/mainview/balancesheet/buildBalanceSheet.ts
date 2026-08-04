import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { AccountBalance } from "../../shared/domain/transactions/AccountBalance";
import type { IsoDate } from "../../shared/domain/core/IsoDate";
import { fromCents, type CurrencyAmt, toCents } from "../../shared/domain/core/CurrencyAmt";
import {
	buildCategoryRollupSection,
	type CategoryRollupLine,
	type CategoryRollupSection,
} from "../reports/buildCategoryRollupSection";

export type BalanceSheetLine = CategoryRollupLine;
export type BalanceSheetSection = CategoryRollupSection;

export type BalanceSheet = {
	endingDate: IsoDate;
	assets: BalanceSheetSection;
	liabilities: BalanceSheetSection;
	/** Assets − Liabilities, computed -- never a sum of the Net Worth account's own entries. See CLAUDE.md's
	 *  Domain Model Notes: that account has no periodic closing entry keeping it in sync with real net worth,
	 *  so this is the only value that's actually correct as of endingDate. Not a BalanceSheetSection -- there
	 *  is no account or category tree behind this number, just a derived total. */
	netWorth: CurrencyAmt;
};

/**
 * Builds the Assets/Liabilities/Net-Worth snapshot as of endingDate, via the shared
 * buildCategoryRollupSection (see documentation/income-statement-implementation-plan.md §0/§1 -- this used to
 * contain its own private flattener/section-builder, now shared with the income statement).
 *
 * netWorth is always Assets − Liabilities, never a lookup of the Net Worth account's own balance -- see
 * CLAUDE.md's Domain Model Notes. balances rows for EQUITY/INCOME/EXPENSE accounts (including the Net Worth
 * account itself) are simply never read here.
 */
export function buildBalanceSheet(
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	balances: readonly AccountBalance[],
	endingDate: IsoDate,
): BalanceSheet {
	const accountsById = new Map(accounts.map((account) => [account.id, account]));

	const signedCentsByAcct = new Map<AcctId, number>();
	for (const balance of balances) {
		const account = accountsById.get(balance.acctId);
		if (!account) continue;
		const debitCents = toCents(balance.debit);
		const creditCents = toCents(balance.credit);
		const signedCents = account.acctType === "ASSET" ? debitCents - creditCents : creditCents - debitCents;
		signedCentsByAcct.set(balance.acctId, signedCents);
	}

	const assets = buildCategoryRollupSection("Assets", categories, accounts, signedCentsByAcct, "ASSET");
	const liabilities = buildCategoryRollupSection("Liabilities", categories, accounts, signedCentsByAcct, "LIABILITY");
	const netWorth = fromCents(toCents(assets.total) - toCents(liabilities.total));

	return { endingDate, assets, liabilities, netWorth };
}
