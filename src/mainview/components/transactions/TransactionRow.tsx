import { Show } from "solid-js";
import type { RegisterLineItem } from "../../transactions/buildRegisterLineItems";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import { toCents } from "../../../shared/domain/core/CurrencyAmt";

type TransactionRowProps = {
	lineItem: RegisterLineItem;
	acctType: AcctTypeStr;
	showCode: boolean;
	showBalance: boolean;
	editDisabled: boolean;
	onStartEdit: () => void;
};

/** Display `<tr>` for one line item. The debit/credit-normal side (which side is "an increase" for this
 * account type) renders plain; the other renders red with a leading "-", the same convention the old
 * client's Register/IncomeLog rows used (generalized here from the account type instead of hardcoded per
 * page -- see transactions-register-implementation-plan.md §3). */
export default function TransactionRow(props: TransactionRowProps) {
	const isDebitBalance = () => props.acctType === "ASSET" || props.acctType === "EXPENSE";

	return (
		<tr class="hover:bg-gray-50">
			<td class="px-2 py-2 text-center">
				<button
					type="button"
					class="rounded p-1 text-blue-600 hover:bg-gray-200 hover:text-blue-800 disabled:opacity-50"
					disabled={props.editDisabled}
					title="Edit transaction"
					aria-label={`Edit transaction ${props.lineItem.description}`}
					onClick={props.onStartEdit}
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
			<td class="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{props.lineItem.postDate}</td>
			<td class="whitespace-nowrap px-4 py-2 text-sm text-gray-500">{props.lineItem.clearedDate ?? ""}</td>
			<Show when={props.showCode}>
				<td class="whitespace-nowrap px-4 py-2 text-sm text-gray-500">{props.lineItem.code}</td>
			</Show>
			<td class="px-4 py-2 text-sm text-gray-500">{props.lineItem.offsetAccountName}</td>
			<td class="px-4 py-2 text-sm text-gray-900">{props.lineItem.vendorLabel ?? ""}</td>
			<td class="px-4 py-2 text-sm text-gray-500">
				<Show when={props.lineItem.needsReview}>
					<span class="mr-1 text-amber-600" title="Needs review">
						⚑
					</span>
				</Show>
				{props.lineItem.description}
			</td>
			<td class="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-900">
				<Show when={isDebitBalance()} fallback={<CreditFirstAmount lineItem={props.lineItem} />}>
					<DebitFirstAmount lineItem={props.lineItem} />
				</Show>
			</td>
			<Show when={props.showBalance}>
				<td
					class={`whitespace-nowrap px-4 py-2 text-right text-sm font-medium ${props.acctType === "LIABILITY" ? "text-red-600" : "text-gray-900"}`}
				>
					{props.lineItem.balance}
				</td>
			</Show>
		</tr>
	);
}

/** ASSET/EXPENSE: debit is the "increase" side, shown plain; credit shown red with a leading "-". */
function DebitFirstAmount(props: { lineItem: RegisterLineItem }) {
	return (
		<>
			<Show when={toCents(props.lineItem.debit) !== 0}>{props.lineItem.debit}</Show>
			<Show when={toCents(props.lineItem.credit) !== 0}>
				<span class="text-red-600">-{props.lineItem.credit}</span>
			</Show>
		</>
	);
}

/** LIABILITY/INCOME: credit is the "increase" side, shown plain; debit shown red with a leading "-". */
function CreditFirstAmount(props: { lineItem: RegisterLineItem }) {
	return (
		<>
			<Show when={toCents(props.lineItem.debit) !== 0}>
				<span class="text-red-600">-{props.lineItem.debit}</span>
			</Show>
			<Show when={toCents(props.lineItem.credit) !== 0}>{props.lineItem.credit}</Show>
		</>
	);
}
