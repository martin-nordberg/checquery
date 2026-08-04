import { Show } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import { type CurrencyAmt, toCents } from "../../../shared/domain/core/CurrencyAmt";
import AccountFullPathPicker from "../accounts/AccountFullPathPicker";
import AmountInput from "./AmountInput";
import { zeroAmt, type EditableEntry } from "./useTransactionRowForm";

type SplitEntryRowProps = {
	entry: EditableEntry;
	onUpdate: (entry: EditableEntry) => void;
	onRemove: () => void;
	canRemove: boolean;
	isPrimary: boolean;
	accounts: Account[];
	categories: AccountCategory[];
	/** acctIds already used by another entry in this transaction -- excluded from this entry's own picker. */
	excludeAcctIds: Set<AcctId>;
	accountLabel?: string;
};

/**
 * One entry line: index 0 (this log's own account) renders read-only -- it auto-balances against every
 * other entry (useTransactionRowForm.balancedEntries), so there's nothing to type into it. Others render an
 * AccountFullPathPicker plus two mutually-clearing AmountInputs, matching the old client's
 * EditableSplitEntry.tsx.
 */
export default function SplitEntryRow(props: SplitEntryRowProps) {
	const hasDebit = () => toCents(props.entry.debit) !== 0;
	const hasCredit = () => toCents(props.entry.credit) !== 0;

	const handleDebitChange = (debit: CurrencyAmt) => {
		props.onUpdate({ ...props.entry, debit, credit: zeroAmt });
	};
	const handleCreditChange = (credit: CurrencyAmt) => {
		props.onUpdate({ ...props.entry, credit, debit: zeroAmt });
	};

	return (
		<div class={`flex items-center gap-2 py-1 ${props.isPrimary ? "bg-slate-50" : ""}`}>
			<div class="flex-1">
				<Show
					when={!props.isPrimary}
					fallback={<div class="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-sm text-slate-700">{props.accountLabel}</div>}
				>
					<AccountFullPathPicker
						accounts={props.accounts}
						categories={props.categories}
						excludeIds={props.excludeAcctIds}
						value={props.entry.acctId}
						onChange={(acctId) => props.onUpdate({ ...props.entry, acctId })}
					/>
				</Show>
			</div>
			<div class="w-28">
				<Show
					when={!props.isPrimary}
					fallback={
						<div class="px-2 py-1 text-right text-sm text-slate-700">
							<Show when={hasDebit()}>{props.entry.debit}</Show>
						</div>
					}
				>
					<AmountInput value={props.entry.debit} onChange={handleDebitChange} disabled={hasCredit()} placeholder="Debit" />
				</Show>
			</div>
			<div class="w-28">
				<Show
					when={!props.isPrimary}
					fallback={
						<div class="px-2 py-1 text-right text-sm text-slate-700">
							<Show when={hasCredit()}>{props.entry.credit}</Show>
						</div>
					}
				>
					<AmountInput value={props.entry.credit} onChange={handleCreditChange} disabled={hasDebit()} placeholder="Credit" />
				</Show>
			</div>
			<div class="w-6 text-center">
				<Show when={props.canRemove}>
					<button
						type="button"
						class="text-red-600 hover:text-red-800"
						title="Remove entry"
						aria-label="Remove entry"
						onClick={props.onRemove}
					>
						×
					</button>
				</Show>
			</div>
		</div>
	);
}
