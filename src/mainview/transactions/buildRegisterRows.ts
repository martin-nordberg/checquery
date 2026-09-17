import type { RegisterLineItem } from "./buildRegisterLineItems";
import type { BalanceAssertion } from "../../shared/domain/balanceAssertions/BalanceAssertion";
import { type CurrencyAmt, fromCents, toCents } from "../../shared/domain/core/CurrencyAmt";

export type RegisterRow =
	| { kind: "transaction"; item: RegisterLineItem; isLastOfDate: boolean; hasAssertionForDate: boolean }
	| {
			kind: "assertion";
			assertion: BalanceAssertion;
			runningBalance: CurrencyAmt; // the account's running balance through assertion.assertionDate
			matches: boolean;
			delta: CurrencyAmt; // assertion.balance - runningBalance
	  };

const zeroAmt = fromCents(0);

/**
 * Merges a Register's line items (already descending, most-recent-transaction-date first, from
 * buildRegisterLineItems) with that account's balance assertions into one display list, deciding along the
 * way which transaction row (if any) qualifies for the checkbox and where each assertion row belongs -- see
 * balance-assertions-implementation-plan.md §3b. Register-only (§0): callers with nothing to merge just pass
 * `[]` for balanceAssertions, which degenerates to one `"transaction"` row per line item.
 *
 * An assertion pins the balance as of the *end* of its date, so it's placed directly above (before, since
 * this list is newest-first) that date's transactions -- right where the qualifying checkbox row would
 * otherwise be. At most one assertion is expected per date (an assertion's date is immutable once created,
 * and the checkbox that creates one only ever targets a date with none yet -- see §0); if more than one
 * somehow exists for the same date, the last one in `balanceAssertions`'s input order silently wins.
 */
export function buildRegisterRows(
	lineItemsDescending: readonly RegisterLineItem[],
	balanceAssertions: readonly BalanceAssertion[],
): RegisterRow[] {
	// Group line items by date, preserving descending order within each group -- so a group's first entry is
	// the topmost (last-entered) one for that date.
	const groups = new Map<string, RegisterLineItem[]>();
	for (const item of lineItemsDescending) {
		const date = item.transactionDate as string;
		const group = groups.get(date);
		if (group) group.push(item);
		else groups.set(date, [item]);
	}

	const assertionsByDate = new Map<string, BalanceAssertion>();
	for (const assertion of balanceAssertions) {
		assertionsByDate.set(assertion.assertionDate as string, assertion);
	}

	// ISO "YYYY-MM-DD" strings sort lexically, so plain string sort gives chronological order.
	const txnDatesDesc = [...groups.keys()].sort().reverse();

	/** The running balance for "all transactions with transaction date on or before `date`" -- the target
	 * date's own group if it has transactions, otherwise carried forward from the closest earlier date that
	 * does, otherwise $0.00 (no qualifying transactions at all). */
	function balanceAsOf(date: string): CurrencyAmt {
		for (const txnDate of txnDatesDesc) {
			if (txnDate <= date) return groups.get(txnDate)![0]!.balance;
		}
		return zeroAmt;
	}

	const allDatesDesc = [...new Set([...groups.keys(), ...assertionsByDate.keys()])].sort().reverse();

	const rows: RegisterRow[] = [];
	for (const date of allDatesDesc) {
		const assertion = assertionsByDate.get(date);
		if (assertion) {
			const runningBalance = balanceAsOf(date);
			const matches = toCents(assertion.balance) === toCents(runningBalance);
			const delta = fromCents(toCents(assertion.balance) - toCents(runningBalance));
			rows.push({ kind: "assertion", assertion, runningBalance, matches, delta });
		}
		const items = groups.get(date) ?? [];
		items.forEach((item, index) => {
			rows.push({ kind: "transaction", item, isLastOfDate: index === 0, hasAssertionForDate: assertion !== undefined });
		});
	}
	return rows;
}
