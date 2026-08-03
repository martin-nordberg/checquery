import { createMemo } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import { acctRootId, acctRootName } from "../../../shared/domain/accounts/AcctRoot";
import { accountAndDescendants } from "../../accounts/accountDescendants";
import AccountPicker from "./AccountPicker";

type AccountParentPickerProps = {
	acctType: AcctTypeStr;
	/** The full account list (unfiltered) -- filtering to acctType and excluding invalid choices happens here. */
	accounts: Account[];
	/** The account being edited -- can't be its own parent, nor can any of its own descendants (a cycle). */
	excludeId: AcctId;
	value: AcctId;
	onChange: (id: AcctId) => void;
};

/**
 * Picks a parent from accounts of the *same* acctType as the page being edited on -- reparenting across
 * types is never offered. Also excludes the account itself and all its descendants, since picking one of
 * those as the new parent would create a cycle (the "no cycles through other accounts" rule Account.ts's
 * comments describe as "enforced in application code" -- this is that code).
 */
export default function AccountParentPicker(props: AccountParentPickerProps) {
	const excludedIds = createMemo(() => accountAndDescendants(props.accounts, props.excludeId));

	const options = createMemo(() => {
		const rootOption = {
			id: acctRootId[props.acctType] as string,
			label: `${acctRootName[props.acctType]} (top level)`,
		};
		const accountOptions = props.accounts
			.filter((account) => account.acctType === props.acctType && !excludedIds().has(account.id))
			.sort((a, b) => (a.name as string).localeCompare(b.name as string))
			.map((account) => ({ id: account.id as string, label: account.name as string }));
		return [rootOption, ...accountOptions];
	});

	return <AccountPicker options={options()} value={props.value} onChange={(id) => props.onChange(id as AcctId)} />;
}
