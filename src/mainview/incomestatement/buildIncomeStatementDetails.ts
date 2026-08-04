import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../shared/domain/accounts/AcctType";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { AccountTreeNode } from "../accountCategories/buildAccountCategoryTree";
import { buildAccountCategoryTree } from "../accountCategories/buildAccountCategoryTree";
import type { Transaction } from "../../shared/domain/transactions/Transaction";
import type { Vendor } from "../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../shared/domain/vendorCategories/VendorCategory";
import type { Period } from "../../shared/domain/core/Period";
import type { IsoDate } from "../../shared/domain/core/IsoDate";
import type { DescriptionStr } from "../../shared/domain/core/Description";
import { type CurrencyAmt, fromCents, toCents } from "../../shared/domain/core/CurrencyAmt";
import { vendorPickerLabel } from "../vendors/vendorPickerLabel";

export type IncStmtEntryDetail = {
	date: IsoDate;
	vendorLabel?: string;
	description: DescriptionStr;
	amount: CurrencyAmt;
};

export type IncomeStatementDetailLine =
	| { kind: "category"; depth: number; label: string; amount: CurrencyAmt }
	| { kind: "account"; depth: number; label: string; amount: CurrencyAmt; acctId: AcctId; entries: IncStmtEntryDetail[] };

export type IncomeStatementDetailSection = {
	heading: string;
	lines: IncomeStatementDetailLine[];
	total: CurrencyAmt;
};

export type IncomeStatementDetails = {
	period: Period;
	expenses: IncomeStatementDetailSection;
	income: IncomeStatementDetailSection;
	netIncome: CurrencyAmt;
};

/** "<vendor> -- <description>" when both are present, whichever one is present alone, or "" when neither is
 *  -- matches the old app's IncomeStatementDetailed.tsx formatVendorDescription, kept as display-formatting
 *  logic rather than baked into IncStmtEntryDetail itself (mirrors the old app's own separation). */
export function formatVendorDescription(entry: Pick<IncStmtEntryDetail, "vendorLabel" | "description">): string {
	const description = entry.description as string;
	if (entry.vendorLabel && description) {
		return `${entry.vendorLabel} -- ${description}`;
	}
	return entry.vendorLabel ?? description ?? "";
}

function flattenNode(
	node: AccountTreeNode,
	depth: number,
	signedCentsByAcct: ReadonlyMap<AcctId, number>,
	entriesByAcct: ReadonlyMap<AcctId, IncStmtEntryDetail[]>,
	out: IncomeStatementDetailLine[],
): number {
	if (node.kind === "account") {
		const cents = signedCentsByAcct.get(node.account.id) ?? 0;
		out.push({
			kind: "account",
			depth,
			label: node.account.name,
			amount: fromCents(cents),
			acctId: node.account.id,
			entries: entriesByAcct.get(node.account.id) ?? [],
		});
		return cents;
	}

	const childLines: IncomeStatementDetailLine[] = [];
	let subtotalCents = 0;
	for (const child of node.children) {
		subtotalCents += flattenNode(child, depth + 1, signedCentsByAcct, entriesByAcct, childLines);
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
	entriesByAcct: ReadonlyMap<AcctId, IncStmtEntryDetail[]>,
	acctType: AcctTypeStr,
): IncomeStatementDetailSection {
	const tree = buildAccountCategoryTree(categories, accounts, acctType);
	const lines: IncomeStatementDetailLine[] = [];
	let totalCents = 0;
	for (const node of tree) {
		totalCents += flattenNode(node, 0, signedCentsByAcct, entriesByAcct, lines);
	}
	return { heading, lines, total: fromCents(totalCents) };
}

/**
 * Builds the Expenses/Income detail views for a period: same category-tree walk and indentation as
 * buildIncomeStatementSummary, but each leaf account additionally carries its individual, dated transaction
 * entries (oldest first) rather than just a total. Not built on buildCategoryRollupSection -- the leaf shape
 * here is genuinely different (an amount plus a list of entries, not just an amount) -- see
 * documentation/income-statement-implementation-plan.md §0.
 *
 * Always renders the full tree, including zero-activity accounts (at $0.00, with no entries) -- a deliberate
 * divergence from the old app's IncomeStatementRepo.findIncomeStatementDetails, which used an inner join and
 * simply omitted accounts with no entries in the period. One consistent "always show the full tree" mental
 * model across every report in this app beats a per-report special case.
 */
export function buildIncomeStatementDetails(
	categories: readonly AccountCategory[],
	accounts: readonly Account[],
	transactions: readonly Transaction[],
	vendors: readonly Vendor[],
	vendorCategories: readonly VendorCategory[],
	period: Period,
): IncomeStatementDetails {
	const accountsById = new Map(accounts.map((account) => [account.id, account]));
	const vendorsById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

	const entriesByAcct = new Map<AcctId, IncStmtEntryDetail[]>();
	const signedCentsByAcct = new Map<AcctId, number>();

	for (const transaction of transactions) {
		for (const entry of transaction.entries) {
			const account = accountsById.get(entry.acctId);
			if (!account || (account.acctType !== "EXPENSE" && account.acctType !== "INCOME")) continue;

			const debitCents = toCents(entry.debit);
			const creditCents = toCents(entry.credit);
			const signedCents = account.acctType === "EXPENSE" ? debitCents - creditCents : creditCents - debitCents;

			const vendor = transaction.vndrId ? vendorsById.get(transaction.vndrId) : undefined;
			const detail: IncStmtEntryDetail = {
				date: transaction.postDate,
				vendorLabel: vendor ? vendorPickerLabel(vendor, vendorCategories) : undefined,
				description: transaction.description,
				amount: fromCents(signedCents),
			};

			const existingEntries = entriesByAcct.get(entry.acctId);
			if (existingEntries) {
				existingEntries.push(detail);
			} else {
				entriesByAcct.set(entry.acctId, [detail]);
			}
			signedCentsByAcct.set(entry.acctId, (signedCentsByAcct.get(entry.acctId) ?? 0) + signedCents);
		}
	}

	for (const entries of entriesByAcct.values()) {
		entries.sort((a, b) => (a.date as string).localeCompare(b.date as string));
	}

	const expenses = buildSection("Expenses", categories, accounts, signedCentsByAcct, entriesByAcct, "EXPENSE");
	const income = buildSection("Income", categories, accounts, signedCentsByAcct, entriesByAcct, "INCOME");
	const netIncome = fromCents(toCents(income.total) - toCents(expenses.total));

	return { period, expenses, income, netIncome };
}
