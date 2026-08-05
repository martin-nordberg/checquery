import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../shared/domain/accounts/AcctType";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import { type CurrencyAmt, fromCents } from "../../shared/domain/core/CurrencyAmt";
import { buildAccountCategoryTree, type AccountTreeNode } from "../accountCategories/buildAccountCategoryTree";

export type CategoryRollupLine = {
	kind: "account" | "category";
	depth: number;
	label: string;
	amount: CurrencyAmt;
	acctId?: AcctId; // present only for kind: "account"
};

export type CategoryRollupSection = {
	heading: string;
	lines: CategoryRollupLine[];
	total: CurrencyAmt;
};

function flattenNode(
	node: AccountTreeNode,
	depth: number,
	signedCentsByAcct: ReadonlyMap<AcctId, number>,
	out: CategoryRollupLine[],
): number {
	if (node.kind === "account") {
		const cents = signedCentsByAcct.get(node.account.id) ?? 0;
		out.push({ kind: "account", depth, label: node.account.name, amount: fromCents(cents), acctId: node.account.id });
		return cents;
	}

	const childLines: CategoryRollupLine[] = [];
	let subtotalCents = 0;
	for (const child of node.children) {
		subtotalCents += flattenNode(child, depth + 1, signedCentsByAcct, childLines);
	}
	out.push({ kind: "category", depth, label: node.category.name, amount: fromCents(subtotalCents) });
	out.push(...childLines);
	return subtotalCents;
}

/**
 * Walks the AccountCategory tree for one account type, producing one line per category (bold, its own
 * rolled-up subtotal -- no separate "Total X" row) and one line per leaf account, with depth-based
 * indentation (AccountTreeRow.tsx's depth*1.5rem convention). Shared by the balance sheet (ASSET/LIABILITY)
 * and the income statement summary (EXPENSE/INCOME) -- see documentation/income-statement-implementation-plan.md
 * §0/§1.
 */
export function buildCategoryRollupSection(
	heading: string,
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	signedCentsByAcct: ReadonlyMap<AcctId, number>,
	acctType: AcctTypeStr,
): CategoryRollupSection {
	const tree = buildAccountCategoryTree(categories, accounts, acctType);
	const lines: CategoryRollupLine[] = [];
	let totalCents = 0;
	for (const node of tree) {
		totalCents += flattenNode(node, 0, signedCentsByAcct, lines);
	}
	return { heading, lines, total: fromCents(totalCents) };
}
