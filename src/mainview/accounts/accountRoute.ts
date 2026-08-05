import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../shared/domain/accounts/AcctType";

/**
 * The path to an account's detail page: Register for Asset/Liability, Income Log for Income, Expense Log
 * for Expense. Net Worth (EQUITY) has none of these -- it's a single predefined, childless root account
 * (see documentation/info-architecture.md §4), so this throws rather than return a bogus route.
 */
export function accountDetailRoute(acctType: AcctTypeStr, accountId: AcctId): string {
	switch (acctType) {
		case "ASSET":
		case "LIABILITY":
			return `/register/${accountId}`;
		case "INCOME":
			return `/incomelog/${accountId}`;
		case "EXPENSE":
			return `/expenselog/${accountId}`;
		case "EQUITY":
			throw new Error("Net Worth accounts have no detail page");
	}
}
