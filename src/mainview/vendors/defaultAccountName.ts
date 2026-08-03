import type { Account } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";

/** Resolves a vendor's defaultAcctId to its account's display name, or undefined if unset/unresolvable. */
export function defaultAccountName(accounts: Account[], defaultAcctId: AcctId | undefined): string | undefined {
	if (!defaultAcctId) return undefined;
	return accounts.find((account) => account.id === defaultAcctId)?.name as string | undefined;
}
