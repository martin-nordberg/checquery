import { Index } from "solid-js";

export type AccountPickerOption = { id: string; label: string };

/**
 * A plain, type-agnostic "pick one account (or account-like option) from a list" control -- no hierarchy,
 * no acctType filtering. AccountParentPicker.tsx wraps this with tree-specific filtering (same acctType,
 * no cycles); info-architecture.md §9 flags that Vendor List's defaultAcctId picker should eventually reuse
 * this same component directly, without pulling in any of that parent/hierarchy-specific logic.
 *
 * Uses `<Index>` rather than `<For>` for the option list: callers like SplitEntryRow rebuild `options` (and
 * the `excludeIds` it's filtered by) fresh on every keystroke elsewhere in the transaction form, so the
 * option objects have a new identity on every render even when their content is unchanged. `<For>` keys by
 * identity, so it would tear down and recreate every `<option>` element on each of those renders -- and a
 * native `<select>` resets to its blank first option whenever its currently-selected `<option>` is removed
 * from the DOM, silently clearing the user's selection. `<Index>` keys by position instead, patching each
 * `<option>`'s attributes in place, so the selected element is never removed out from under the user.
 */
export default function AccountPicker(props: {
	options: AccountPickerOption[];
	value: string;
	onChange: (id: string) => void;
}) {
	return (
		<select
			class="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
			value={props.value}
			onChange={(e) => props.onChange(e.currentTarget.value)}
		>
			<Index each={props.options}>{(option) => <option value={option().id}>{option().label}</option>}</Index>
		</select>
	);
}
