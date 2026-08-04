import type { Account } from "../../shared/domain/accounts/Account";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { AcctCtgId } from "../../shared/domain/accountCategories/AcctCtgId";
import type { AcctTypeStr } from "../../shared/domain/accounts/AcctType";
import { acctCtgRootId } from "../../shared/domain/accountCategories/AcctCtgRoot";

export type AccountTreeNode =
	| { kind: "category"; category: AccountCategory; children: AccountTreeNode[] }
	| { kind: "account"; account: Account };

function nodeName(node: AccountTreeNode): string {
	return (node.kind === "category" ? node.category.name : node.account.name) as string;
}

/**
 * Nests the flat category and account lists into a single tree scoped to one account type, rooted at that
 * type's fixed root category (acctCtgRootId[acctType]) -- the root itself is never part of the output, only
 * its children (categories, plus Net Worth for EQUITY) become the tree's top-level nodes.
 *
 * Categories and accounts share one namespace per parent (see
 * documentation/account-categories-implementation-plan.md §8's uniqueness rule, "like a file system with
 * folders and files"), so this interleaves them fully alphabetically within each level rather than sorting
 * categories before accounts.
 *
 * Pure and synchronous, like the buildAccountTree.ts it replaces -- accounts/categories are typically the
 * full results of findAccountsAll()/findAccountCategoriesAll(), already filtered to one acctType here rather
 * than by the caller.
 */
export function buildAccountCategoryTree(
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	acctType: AcctTypeStr,
): AccountTreeNode[] {
	const rootId = acctCtgRootId[acctType];

	const childCategoriesByParent = new Map<AcctCtgId, AccountCategory[]>();
	for (const category of categories) {
		if (category.acctType !== acctType || category.parentCtgId === undefined) continue;
		const siblings = childCategoriesByParent.get(category.parentCtgId);
		if (siblings) {
			siblings.push(category);
		} else {
			childCategoriesByParent.set(category.parentCtgId, [category]);
		}
	}

	const childAccountsByParent = new Map<AcctCtgId, Account[]>();
	for (const account of accounts) {
		if (account.acctType !== acctType) continue;
		const siblings = childAccountsByParent.get(account.parentCtgId);
		if (siblings) {
			siblings.push(account);
		} else {
			childAccountsByParent.set(account.parentCtgId, [account]);
		}
	}

	const buildNodes = (parentCtgId: AcctCtgId): AccountTreeNode[] => {
		const categoryNodes: AccountTreeNode[] = (childCategoriesByParent.get(parentCtgId) ?? []).map(
			(category): AccountTreeNode => ({ kind: "category", category, children: buildNodes(category.id) }),
		);
		const accountNodes: AccountTreeNode[] = (childAccountsByParent.get(parentCtgId) ?? []).map(
			(account): AccountTreeNode => ({ kind: "account", account }),
		);
		return [...categoryNodes, ...accountNodes].sort((a, b) => nodeName(a).localeCompare(nodeName(b)));
	};

	return buildNodes(rootId);
}
