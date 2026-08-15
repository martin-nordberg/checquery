import type { AcctTypeStr } from "../../shared/domain/accounts/AcctType";

export type EntryAmountPlaceholders = { debit: string; credit: string };

/**
 * The Debit/Credit input placeholders shown for a split entry's amount, chosen by the *register's own*
 * account type (not the offset entry's) -- there's no meaningful default amount for a new entry, only a
 * hint at what typing into that field means for this register. A debit on an offset entry always balances
 * against a credit on the register's own primary entry, and vice versa, so the wording follows what that
 * opposite posting means for the primary account:
 *
 * - Asset: a credit on the primary account (money leaving) is a Debit here -> "Expense"; a debit on the
 *   primary account (money arriving) is a Credit here -> "Income".
 * - Liability: a credit on the primary account (balance owed goes up) is a Debit here -> "Purchase"; a
 *   debit on the primary account (balance owed goes down) is a Credit here -> "Payment".
 * - Income: a credit on the primary account (income recorded, the normal case) is a Debit here -> "Income";
 *   a debit on the primary account (income reversed) is a Credit here -> "Refund".
 * - Expense: a debit on the primary account (expense recorded, the normal case) is a Credit here ->
 *   "Expense"; a credit on the primary account (expense reversed) is a Debit here -> "Refund".
 *
 * Net Worth (EQUITY) never has a register page (see accountRoute.ts), so it's not a real input here.
 */
export function entryAmountPlaceholders(acctType: AcctTypeStr): EntryAmountPlaceholders {
	switch (acctType) {
		case "ASSET":
			return { debit: "Expense", credit: "Income" };
		case "LIABILITY":
			return { debit: "Purchase", credit: "Payment" };
		case "INCOME":
			return { debit: "Income", credit: "Refund" };
		case "EXPENSE":
			return { debit: "Refund", credit: "Expense" };
		case "EQUITY":
			return { debit: "Debit", credit: "Credit" };
	}
}
