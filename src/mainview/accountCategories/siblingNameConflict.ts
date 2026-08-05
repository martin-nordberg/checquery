import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { AcctCtgId } from "../../shared/domain/accountCategories/AcctCtgId";

/**
 * Checks whether `name` collides with an existing category or account sharing the same parent category --
 * per account-categories-implementation-plan.md §8, category and account names share one namespace per
 * parent, "like a file system with folders and files." A client-side pre-check (matching the existing
 * isAccountInUse-before-delete UI-guard convention) rather than a server-side or schema-level constraint --
 * see §0/§11 of that plan for why.
 *
 * Comparison is case-sensitive, matching nameSchema (which doesn't normalize case). `excludeId` is the node
 * being renamed, if any, so renaming a category/account to the name it already has isn't flagged as a
 * conflict with itself.
 */
export function hasSiblingNameConflict(
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	parentCtgId: AcctCtgId,
	name: string,
	excludeId?: AcctCtgId | AcctId,
): boolean {
	const trimmedName = name.trim();
	const categoryConflict = categories.some(
		(category) => category.parentCtgId === parentCtgId && category.id !== excludeId && (category.name as string) === trimmedName,
	);
	if (categoryConflict) return true;

	return accounts.some(
		(account) => account.parentCtgId === parentCtgId && account.id !== excludeId && (account.name as string) === trimmedName,
	);
}
