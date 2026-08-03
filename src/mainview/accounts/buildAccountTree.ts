import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../shared/domain/accounts/AcctType";
import { acctRootId } from "../../shared/domain/accounts/AcctRoot";

export type AccountTreeNode = {
	account: Account;
	children: AccountTreeNode[];
};

/**
 * Nests a flat account list into a tree scoped to one account type, rooted at that type's fixed root
 * account (acctRootId[acctType]) -- the root itself is never part of the output, only its children become
 * the tree's top-level nodes. Sorted alphabetically by name within each level (see
 * documentation/account-list-implementation-plan.md §3; TBD whether that's the right default long-term).
 *
 * Pure and synchronous -- accounts is typically the full result of findAccountsAll(), already filtered
 * to one acctType here rather than by the caller, so callers can pass the unfiltered list straight through.
 */
export function buildAccountTree(accounts: readonly Account[], acctType: AcctTypeStr): AccountTreeNode[] {
	const rootId = acctRootId[acctType];

	const childrenByParent = new Map<AcctId, Account[]>();
	for (const account of accounts) {
		if (account.acctType !== acctType || account.parentId === undefined) continue;
		const siblings = childrenByParent.get(account.parentId);
		if (siblings) {
			siblings.push(account);
		} else {
			childrenByParent.set(account.parentId, [account]);
		}
	}

	const buildNodes = (parentId: AcctId): AccountTreeNode[] =>
		(childrenByParent.get(parentId) ?? [])
			.slice()
			.sort((a, b) => (a.name as string).localeCompare(b.name as string))
			.map((account) => ({ account, children: buildNodes(account.id) }));

	return buildNodes(rootId);
}
