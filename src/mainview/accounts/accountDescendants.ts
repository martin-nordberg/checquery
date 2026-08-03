import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";

/**
 * Returns the given account's id plus every one of its descendants' ids (its children, their children,
 * and so on). Used to exclude invalid choices from the parent picker when reparenting an account: picking
 * itself or any of its own descendants as the new parent would create a cycle in the tree. This is the
 * "no cycles through other accounts" invariant Account.ts's comments note as "enforced in application
 * code" -- this is that code (see documentation/account-list-implementation-plan.md §2).
 */
export function accountAndDescendants(accounts: readonly Account[], id: AcctId): Set<AcctId> {
	const childrenByParent = new Map<AcctId, AcctId[]>();
	for (const account of accounts) {
		if (account.parentId === undefined) continue;
		const siblings = childrenByParent.get(account.parentId);
		if (siblings) {
			siblings.push(account.id);
		} else {
			childrenByParent.set(account.parentId, [account.id]);
		}
	}

	const result = new Set<AcctId>([id]);
	const stack: AcctId[] = [id];
	while (stack.length > 0) {
		const current = stack.pop()!;
		for (const childId of childrenByParent.get(current) ?? []) {
			if (!result.has(childId)) {
				result.add(childId);
				stack.push(childId);
			}
		}
	}
	return result;
}
