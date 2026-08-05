import { createMemo } from "solid-js";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import { acctCtgRootId, acctCtgRootName } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import { categoryAndDescendants } from "../../accountCategories/accountCategoryDescendants";
import AccountPicker from "./AccountPicker";

type AccountCategoryParentPickerProps = {
	acctType: AcctTypeStr;
	/** The full category list (unfiltered) -- filtering to acctType and excluding invalid choices happens here. */
	categories: AccountCategory[];
	/** The category being edited -- can't be its own parent, nor can any of its own descendants (a cycle). */
	excludeId: AcctCtgId;
	value: AcctCtgId;
	onChange: (id: AcctCtgId) => void;
};

/**
 * Picks a parent from categories of the *same* acctType as the page being edited on -- reparenting across
 * types is never offered. Also excludes the category itself and all its descendants, since picking one of
 * those as the new parent would create a cycle (the "no cycles through other categories" rule
 * AccountCategory.ts's comments describe as "enforced in application code" -- this is that code, the direct
 * analogue of the old AccountParentPicker's descendant exclusion, now retargeted at categories).
 */
export default function AccountCategoryParentPicker(props: AccountCategoryParentPickerProps) {
	const excludedIds = createMemo(() => categoryAndDescendants(props.categories, props.excludeId));

	const options = createMemo(() => {
		const rootOption = {
			id: acctCtgRootId[props.acctType] as string,
			label: `${acctCtgRootName[props.acctType]} (top level)`,
		};
		const categoryOptions = props.categories
			.filter((category) => category.acctType === props.acctType && !excludedIds().has(category.id))
			.sort((a, b) => (a.name as string).localeCompare(b.name as string))
			.map((category) => ({ id: category.id as string, label: category.name as string }));
		return [rootOption, ...categoryOptions];
	});

	return <AccountPicker options={options()} value={props.value} onChange={(id) => props.onChange(id as AcctCtgId)} />;
}
