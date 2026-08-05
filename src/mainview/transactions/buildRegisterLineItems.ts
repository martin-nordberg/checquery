import type { Transaction } from "../../shared/domain/transactions/Transaction";
import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../shared/domain/accounts/AcctType";
import type { Vendor } from "../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../shared/domain/vendorCategories/VendorCategory";
import type { VndrId } from "../../shared/domain/vendors/VndrId";
import type { TxnId } from "../../shared/domain/transactions/TxnId";
import type { IsoDate } from "../../shared/domain/core/IsoDate";
import type { DescriptionStr } from "../../shared/domain/core/Description";
import { type CurrencyAmt, fromCents, toCents } from "../../shared/domain/core/CurrencyAmt";
import { vendorPickerLabel } from "../vendors/vendorPickerLabel";

export type RegisterLineItem = {
	txnId: TxnId;
	postDate: IsoDate;
	clearedDate?: IsoDate;
	code: string;
	vndrId?: VndrId;
	vendorLabel?: string;
	description: DescriptionStr;
	offsetAccountName: string;
	debit: CurrencyAmt;
	credit: CurrencyAmt;
	balance: CurrencyAmt;
	needsReview: boolean;
};

const SPLIT_LABEL = "-- Split --";

/**
 * Builds one line item per transaction touching accountId, in reverse-chronological (most-recent-first)
 * order with a running balance -- the mainview-side replacement for the old app's server-computed Register
 * DTO (see transactions-register-implementation-plan.md §0/§2a). Stably sorts by postDate only, trusting the
 * caller's input order (TransactionMaterializedStoreSvc's post_date/rowid ordering) to break same-day ties,
 * since Transaction carries no rowid client-side.
 *
 * balance is always computed regardless of account type -- it's up to the caller (TransactionRow/
 * TransactionLog) whether to actually render it (Register only, per the plan's showBalance).
 */
export function buildRegisterLineItems(
	transactions: readonly Transaction[],
	accounts: readonly Account[],
	vendors: readonly Vendor[],
	vendorCategories: readonly VendorCategory[],
	accountId: AcctId,
	acctType: AcctTypeStr,
): RegisterLineItem[] {
	const accountsById = new Map(accounts.map((account) => [account.id, account]));
	const vendorsById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
	const isDebitBalance = acctType === "ASSET" || acctType === "EXPENSE";

	const ascending = transactions
		.slice()
		.sort((a, b) => (a.postDate as string).localeCompare(b.postDate as string));

	let runningCents = 0;
	const lineItems = ascending.map((transaction): RegisterLineItem => {
		let debitCents = 0;
		let creditCents = 0;
		const offsetAccountNames: string[] = [];
		for (const entry of transaction.entries) {
			if (entry.acctId === accountId) {
				debitCents += toCents(entry.debit);
				creditCents += toCents(entry.credit);
			} else {
				offsetAccountNames.push((accountsById.get(entry.acctId)?.name as string | undefined) ?? "");
			}
		}

		runningCents += isDebitBalance ? debitCents - creditCents : creditCents - debitCents;

		const vendor = transaction.vndrId ? vendorsById.get(transaction.vndrId) : undefined;

		return {
			txnId: transaction.id,
			postDate: transaction.postDate,
			clearedDate: transaction.clearedDate,
			code: transaction.code,
			vndrId: transaction.vndrId,
			vendorLabel: vendor ? vendorPickerLabel(vendor, vendorCategories) : undefined,
			description: transaction.description,
			offsetAccountName:
				offsetAccountNames.length === 1
					? offsetAccountNames[0]!
					: offsetAccountNames.length === 0
						? ""
						: SPLIT_LABEL,
			debit: fromCents(debitCents),
			credit: fromCents(creditCents),
			balance: fromCents(runningCents),
			needsReview: transaction.needsReview,
		};
	});

	return lineItems.reverse();
}
