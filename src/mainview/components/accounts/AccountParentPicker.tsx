import { createMemo } from "solid-js";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import AccountPicker from "./AccountPicker";

type AccountParentPickerProps = {
	acctType: AcctTypeStr;
	/** The full category list (unfiltered) -- filtering to acctType and excluding the root happens here. */
	categories: AccountCategory[];
	value: AcctCtgId;
	onChange: (id: AcctCtgId) => void;
};

/**
 * Picks a *category* as an account's parent -- accounts are leaves now (they never parent other accounts,
 * see account-categories-implementation-plan.md §0), so unlike the old account-to-account picker this
 * component replaces, there's no self/descendant exclusion to do here: an account being edited has no
 * descendants of its own.
 *
 * The type's root category is deliberately excluded from the options -- no account (other than the
 * predefined Net Worth, which has no edit UI at all) may ever sit directly under a root category.
 */
export default function AccountParentPicker(props: AccountParentPickerProps) {
	const options = createMemo(() =>
		props.categories
			.filter((category) => category.acctType === props.acctType && category.parentCtgId !== undefined)
			.sort((a, b) => (a.name as string).localeCompare(b.name as string))
			.map((category) => ({ id: category.id as string, label: category.name as string })),
	);

	return <AccountPicker options={options()} value={props.value} onChange={(id) => props.onChange(id as AcctCtgId)} />;
}
