import { createMemo } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import { accountFullPathLabel } from "../../accounts/accountFullPathLabel";
import AccountPicker from "./AccountPicker";

type AccountFullPathPickerProps = {
	accounts: Account[];
	categories: AccountCategory[];
	/** Accounts already used by another entry in the same transaction -- picking one of those here would
	 * create a duplicate-account entry. No acctType filter: double-entry postings legitimately cross types
	 * (an Asset register entry commonly offsets an Expense or Income account, sometimes Net Worth). */
	excludeIds: Set<AcctId>;
	value: string;
	onChange: (id: string) => void;
};

/**
 * Picks any account (split-entry rows), labeled with its full `"<Root> : <Category> : ... : <Name>"` path
 * so accounts that share a name under different categories stay distinguishable -- see
 * transactions-register-implementation-plan.md §0/§2b.
 */
export default function AccountFullPathPicker(props: AccountFullPathPickerProps) {
	const options = createMemo(() => [
		{ id: "", label: "(select account)" },
		...props.accounts
			.filter((account) => !props.excludeIds.has(account.id))
			.map((account) => ({ id: account.id as string, label: accountFullPathLabel(account, props.categories) }))
			.sort((a, b) => a.label.localeCompare(b.label)),
	]);

	return <AccountPicker options={options()} value={props.value} onChange={props.onChange} />;
}
