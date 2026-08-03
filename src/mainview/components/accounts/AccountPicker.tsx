import { For } from "solid-js";

export type AccountPickerOption = { id: string; label: string };

/**
 * A plain, type-agnostic "pick one account (or account-like option) from a list" control -- no hierarchy,
 * no acctType filtering. AccountParentPicker.tsx wraps this with tree-specific filtering (same acctType,
 * no cycles); info-architecture.md §9 flags that Vendor List's defaultAcctId picker should eventually reuse
 * this same component directly, without pulling in any of that parent/hierarchy-specific logic.
 */
export default function AccountPicker(props: {
	options: AccountPickerOption[];
	value: string;
	onChange: (id: string) => void;
}) {
	return (
		<select
			class="rounded border border-slate-300 px-2 py-1 text-sm"
			value={props.value}
			onChange={(e) => props.onChange(e.currentTarget.value)}
		>
			<For each={props.options}>{(option) => <option value={option.id}>{option.label}</option>}</For>
		</select>
	);
}
