import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { AccountBalance } from "../../shared/domain/transactions/AccountBalance";
import type { IsoDate } from "../../shared/domain/core/IsoDate";
import { type CurrencyAmt, fromCents, toCents } from "../../shared/domain/core/CurrencyAmt";
import { buildAccountCategoryTree, type AccountTreeNode } from "../accountCategories/buildAccountCategoryTree";

export type BalanceSheetLine = {
	kind: "account" | "category";
	depth: number;
	label: string;
	amount: CurrencyAmt;
	acctId?: AcctId; // present only for kind: "account" -- Register link target
};

export type BalanceSheetSection = {
	heading: string;
	lines: BalanceSheetLine[];
	total: CurrencyAmt;
};

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

function flattenNode(
	node: AccountTreeNode,
	depth: number,
	signedCentsByAcct: ReadonlyMap<AcctId, number>,
	out: BalanceSheetLine[],
): number {
	if (node.kind === "account") {
		const cents = signedCentsByAcct.get(node.account.id) ?? 0;
		out.push({ kind: "account", depth, label: node.account.name, amount: fromCents(cents), acctId: node.account.id });
		return cents;
	}

	const childLines: BalanceSheetLine[] = [];
	let subtotalCents = 0;
	for (const child of node.children) {
		subtotalCents += flattenNode(child, depth + 1, signedCentsByAcct, childLines);
	}
	out.push({ kind: "category", depth, label: node.category.name, amount: fromCents(subtotalCents) });
	out.push(...childLines);
	return subtotalCents;
}

function buildSection(
	heading: string,
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	signedCentsByAcct: ReadonlyMap<AcctId, number>,
	acctType: "ASSET" | "LIABILITY",
): BalanceSheetSection {
	const tree = buildAccountCategoryTree(categories, accounts, acctType);
	const lines: BalanceSheetLine[] = [];
	let totalCents = 0;
	for (const node of tree) {
		totalCents += flattenNode(node, 0, signedCentsByAcct, lines);
	}
	return { heading, lines, total: fromCents(totalCents) };
}

/**
 * Builds the Assets/Liabilities/Net-Worth snapshot as of endingDate. Category rows carry their own rolled-up
 * subtotal (no separate "Total X" row -- see documentation/balance-sheet-implementation-plan.md §0), and
 * indentation follows AccountTreeRow.tsx's depth*1.5rem convention.
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

	const assets = buildSection("Assets", categories, accounts, signedCentsByAcct, "ASSET");
	const liabilities = buildSection("Liabilities", categories, accounts, signedCentsByAcct, "LIABILITY");
	const netWorth = fromCents(toCents(assets.total) - toCents(liabilities.total));

	return { endingDate, assets, liabilities, netWorth };
}
