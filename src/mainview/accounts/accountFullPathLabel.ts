import type { Account } from "../../shared/domain/accounts/Account";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { AcctCtgId } from "../../shared/domain/accountCategories/AcctCtgId";
import type { NameStr } from "../../shared/domain/core/Name";
import { acctCtgRootName } from "../../shared/domain/accountCategories/AcctCtgRoot";

/**
 * Walks account.parentCtgId up through AccountCategory.parentCtgId, collecting category names top-down --
 * e.g. ["Banking"] for an account filed directly under a "Banking" category, or ["Banking", "Checking Sub"]
 * for one nested a level deeper. The root category itself (parentCtgId undefined) is never included -- both
 * label functions below add the root separately (or not at all). Shouldn't fail given the schema's cycle/
 * root invariants; a missing or malformed link just stops the walk early rather than throwing.
 */
function accountCategoryChain(account: Account, categories: readonly AccountCategory[]): NameStr[] {
	const categoriesById = new Map<AcctCtgId, AccountCategory>(categories.map((category) => [category.id, category]));
	const names: NameStr[] = [];
	let currentId: AcctCtgId | undefined = account.parentCtgId;
	while (currentId !== undefined) {
		const category = categoriesById.get(currentId);
		if (!category || category.parentCtgId === undefined) break;
		names.unshift(category.name);
		currentId = category.parentCtgId;
	}
	return names;
}

/** "<Root> : <Category> : ... : <Account Name>" -- used by the split-entry account picker. */
export function accountFullPathLabel(account: Account, categories: readonly AccountCategory[]): string {
	return [acctCtgRootName[account.acctType], ...accountCategoryChain(account, categories), account.name].join(" : ");
}

/** "<Category> : ... : <Account Name>" -- same chain, without the leading root name. Used by the
 * breadcrumb's account segment, where the root is already conveyed by the type segment. */
export function accountCategoryPathLabel(account: Account, categories: readonly AccountCategory[]): string {
	return [...accountCategoryChain(account, categories), account.name].join(" : ");
}
