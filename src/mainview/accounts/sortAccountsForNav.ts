import type { Account } from "../../shared/domain/accounts/Account";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { AcctTypeStr } from "../../shared/domain/accounts/AcctType";
import { accountCategoryPathLabel } from "./accountFullPathLabel";

/**
 * Every account of the given type, primary ones first, each group sorted alphabetically by its own
 * accountCategoryPathLabel -- the ordering the breadcrumb's account-segment dropdown renders in, and
 * (`result[0]`) the "default account for this type" the type-segment dropdown jumps to when switching types.
 */
export function sortAccountsForNav(
	accounts: readonly Account[],
	categories: readonly AccountCategory[],
	acctType: AcctTypeStr,
): Account[] {
	return accounts
		.filter((account) => account.acctType === acctType)
		.sort((a, b) => {
			if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
			return accountCategoryPathLabel(a, categories).localeCompare(accountCategoryPathLabel(b, categories));
		});
}
