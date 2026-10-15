import { Show } from "solid-js";
import type { RegisterRow } from "../../transactions/buildRegisterRows";

type BalanceAssertionRowProps = {
	row: Extract<RegisterRow, { kind: "assertion" }>;
	showCode: boolean;
	editDisabled: boolean;
	onEdit: () => void;
};

/** Display `<tr>` for a balance assertion, interleaved into the Register's line items by
 * buildRegisterRows.ts -- gray background, bold text, per balance-assertions-implementation-plan.md §4c.
 * NUMBER/CATEGORY/VENDOR/AMOUNT are all unused (an assertion has no entries of its own); only DATE,
 * DESCRIPTION, and BALANCE carry real content, plus the pencil-edit button and the new balance-check icon. */
export default function BalanceAssertionRow(props: BalanceAssertionRowProps) {
	return (
		<tr class="bg-gray-100 font-bold">
			<td class="px-2 py-2 text-center">
				<button
					type="button"
					class="rounded p-1 text-blue-600 hover:bg-gray-200 hover:text-blue-800 disabled:opacity-50"
					disabled={props.editDisabled}
					title="Edit balance assertion"
					aria-label={`Edit balance assertion for ${props.row.assertion.assertionDate}`}
					onClick={props.onEdit}
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
						/>
					</svg>
				</button>
			</td>
			<td class="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{props.row.assertion.assertionDate}</td>
			<Show when={props.showCode}>
				<td class="px-4 py-2 text-sm" />
			</Show>
			<td class="px-4 py-2 text-sm" />
			<td class="px-4 py-2 text-sm" />
			<td class="px-4 py-2 text-sm text-gray-900">
				<Show when={props.row.matches} fallback={<span class="text-orange-600">Out of Balance: {props.row.delta}</span>}>
					Cleared Balance
				</Show>
			</td>
			<td class="px-4 py-2 text-sm" />
			<td class="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-900">{props.row.assertion.balance}</td>
			<td class="px-2 py-2 text-center">
				<Show
					when={props.row.matches}
					fallback={
						<span class="text-orange-600" title="Out of balance" aria-label="Out of balance">
							!
						</span>
					}
				>
					<span class="text-green-600" title="Matches running balance" aria-label="Matches running balance">
						✓
					</span>
				</Show>
			</td>
		</tr>
	);
}
