import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { AcctCtgId } from "../../shared/domain/accountCategories/AcctCtgId";

/**
 * Returns the given category's id plus every one of its descendant categories' ids (its children, their
 * children, and so on). Used to exclude invalid choices from the category parent picker when reparenting a
 * category: picking itself or any of its own descendants as the new parent would create a cycle in the
 * tree. This is the "no cycles through other categories" invariant AccountCategory.ts's comments note as
 * "enforced in application code" -- this is that code.
 *
 * Accounts are leaves now (they never parent other accounts, see account-categories-implementation-plan.md
 * §0), so there's no account-side equivalent of this function anymore -- an account being edited never has
 * descendants to exclude from its own parent picker.
 */
export function categoryAndDescendants(categories: readonly AccountCategory[], id: AcctCtgId): Set<AcctCtgId> {
	const childrenByParent = new Map<AcctCtgId, AcctCtgId[]>();
	for (const category of categories) {
		if (category.parentCtgId === undefined) continue;
		const siblings = childrenByParent.get(category.parentCtgId);
		if (siblings) {
			siblings.push(category.id);
		} else {
			childrenByParent.set(category.parentCtgId, [category.id]);
		}
	}

	const result = new Set<AcctCtgId>([id]);
	const stack: AcctCtgId[] = [id];
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
