import { createEffect, createMemo, Index, onCleanup, Show } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import { isoDateToday } from "../../../shared/domain/core/IsoDate";
import { transactionsClient } from "../../transactions/transactionsClient";
import ConfirmDialog from "../common/ConfirmDialog";
import VendorFieldWithAdd from "./VendorFieldWithAdd";
import SplitEntryRow from "./SplitEntryRow";
import TransactionActionButtons from "./TransactionActionButtons";
import useAbandonConfirm from "./useAbandonConfirm";
import useTransactionRowForm, { zeroAmt } from "./useTransactionRowForm";

type NewTransactionRowProps = {
	accountId: AcctId;
	acctType: AcctTypeStr;
	showCode: boolean;
	accounts: Account[];
	categories: AccountCategory[];
	vendors: Vendor[];
	vendorCategories: VendorCategory[];
	refetchVendors: (info?: unknown) => Vendor[] | Promise<Vendor[] | undefined> | null | undefined;
	initialPostDate?: string;
	columnCount: number;
	onCancel: () => void;
	onSaved: (usedPostDate: string) => void;
	onDirtyChange: (isDirty: boolean) => void;
};

/** In-row create form -- pre-seeded with two entries (this log's own account, and a blank offset), the
 * sticky date from the last save (or today). See transactions-register-implementation-plan.md §3/§5. */
export default function NewTransactionRow(props: NewTransactionRowProps) {
	const form = useTransactionRowForm({
		initialPostDate: props.initialPostDate ?? (isoDateToday() as string),
		initialEntries: [
			{ acctId: props.accountId, debit: zeroAmt, credit: zeroAmt },
			{ acctId: "", debit: zeroAmt, credit: zeroAmt },
		],
	});

	// Auto-fills the offset account from the picked vendor's defaultAcctId, the same as the old client's
	// NewTransactionRow -- only while there are still exactly two entries and the offset is still blank/zero.
	createEffect(() => {
		const vndrId = form.vndrId();
		if (!vndrId) return;
		const entries = form.entries();
		if (entries.length !== 2) return;
		const offset = entries[1]!;
		if (offset.acctId !== "" || offset.debit !== zeroAmt || offset.credit !== zeroAmt) return;
		const vendor = props.vendors.find((v) => v.id === vndrId);
		if (!vendor?.defaultAcctId) return;
		form.updateEntry(1, { ...offset, acctId: vendor.defaultAcctId });
	});

	const isDirty = createMemo(() => {
		if (form.code() !== "") return true;
		if (form.vndrId() !== "") return true;
		if (form.description() !== "") return true;
		if (form.needsReview()) return true;
		if (form.clearedDate() !== "") return true;
		const entries = form.entries();
		if (entries.length > 2) return true;
		const offset = entries[1];
		if (offset && (offset.acctId !== "" || offset.debit !== zeroAmt || offset.credit !== zeroAmt)) return true;
		return false;
	});
	createEffect(() => props.onDirtyChange(isDirty()));

	const abandon = useAbandonConfirm(isDirty, () => {
		form.setError(null);
		props.onDirtyChange(false);
		props.onCancel();
	});

	createEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				abandon.handleCancel();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
	});

	const ownAccountLabel = createMemo(
		() => (props.accounts.find((a) => a.id === props.accountId)?.name as string | undefined) ?? "",
	);

	const canRepeatPrior = createMemo(() => {
		if (!form.vndrId()) return false;
		return form
			.entries()
			.slice(1)
			.every((entry) => entry.debit === zeroAmt && entry.credit === zeroAmt);
	});

	const handleRepeatPrior = async () => {
		const vndrId = form.vndrId();
		if (!vndrId) return;
		const prior = await transactionsClient.findLatestTransactionForVendorAndAccount(vndrId, props.accountId);
		if (!prior) return;
		const ownEntry = prior.entries.find((e) => e.acctId === props.accountId);
		const otherEntries = prior.entries.filter((e) => e.acctId !== props.accountId);
		const reordered = ownEntry ? [ownEntry, ...otherEntries] : prior.entries;
		form.setEntries(reordered.map((e) => ({ acctId: e.acctId as string, debit: e.debit, credit: e.credit })));
		if (!form.description() && prior.description) form.setDescription(prior.description);
	};

	const handleSave = async () => {
		form.setError(null);
		const result = form.validateForSave();
		if (!result) return;
		form.setIsSaving(true);
		try {
			const postDate = form.postDate() || form.clearedDate();
			await transactionsClient.createTransaction({
				postDate,
				clearedDate: form.clearedDate() || undefined,
				code: form.code(),
				vndrId: form.vndrId() || undefined,
				description: form.description() || undefined,
				needsReview: form.needsReview(),
				entries: result.entries.map((e) => ({ acctId: e.acctId, debit: e.debit, credit: e.credit })),
			});
			props.onSaved(postDate);
		} catch (e) {
			form.setError(e instanceof Error ? e.message : "Failed to save");
		} finally {
			form.setIsSaving(false);
		}
	};

	return (
		<>
			<ConfirmDialog
				open={abandon.showAbandonConfirm()}
				title="Discard New Transaction"
				message="You have unsaved changes. Discard them?"
				confirmLabel="Discard"
				onConfirm={abandon.doCancel}
				onCancel={abandon.dismissConfirm}
			/>
			<tr class="bg-green-50">
				<td class="px-2 py-2 align-top">
					<button
						type="button"
						class="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
						title="Cancel"
						aria-label="Cancel"
						onClick={abandon.handleCancel}
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</td>
				<td class="px-2 py-2" colspan={props.columnCount - 1}>
					<div class="space-y-3 p-2">
						<div class="mb-2 text-sm font-medium text-green-700">New Transaction</div>
						<div class="grid grid-cols-6 gap-3">
							<label class="flex flex-col gap-1 text-xs font-medium text-gray-500">
								Posted
								<input
									type="date"
									autofocus
									class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm font-normal text-slate-900"
									value={form.postDate()}
									onInput={(e) => form.setPostDate(e.currentTarget.value)}
								/>
							</label>
							<label class="flex flex-col gap-1 text-xs font-medium text-gray-500">
								Cleared
								<input
									type="date"
									class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm font-normal text-slate-900"
									value={form.clearedDate()}
									onInput={(e) => form.setClearedDate(e.currentTarget.value)}
								/>
							</label>
							<Show when={props.showCode}>
								<label class="flex flex-col gap-1 text-xs font-medium text-gray-500">
									Number
									<input
										type="text"
										class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm font-normal text-slate-900"
										placeholder="Check #"
										value={form.code()}
										onInput={(e) => form.setCode(e.currentTarget.value)}
									/>
								</label>
							</Show>
							<div class="col-span-2">
								<VendorFieldWithAdd
									vendors={props.vendors}
									vendorCategories={props.vendorCategories}
									accounts={props.accounts}
									value={form.vndrId()}
									onChange={form.setVndrId}
									refetchVendors={props.refetchVendors}
								/>
							</div>
							<label class="col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-500">
								Description
								<input
									type="text"
									class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm font-normal text-slate-900"
									placeholder="Description"
									value={form.description()}
									onInput={(e) => form.setDescription(e.currentTarget.value)}
								/>
							</label>
							<label class="col-span-2 flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									checked={form.needsReview()}
									onChange={(e) => form.setNeedsReview(e.currentTarget.checked)}
								/>
								Needs Review
							</label>
						</div>

						<div>
							<div class="mb-2 text-xs font-medium text-gray-500">Entries</div>
							<div class="rounded border border-gray-200 bg-white p-2">
								<div class="flex items-center gap-2 border-b py-1 text-xs font-medium text-gray-500">
									<div class="flex-1">Account</div>
									<div class="w-28 text-right">Debit</div>
									<div class="w-28 text-right">Credit</div>
									<div class="w-6" />
								</div>
								<Index each={form.balancedEntries()}>
									{(entry, index) => {
										const excludeAcctIds = createMemo(
											() =>
												new Set(
													form
														.balancedEntries()
														.filter((_, i) => i !== index)
														.map((e) => e.acctId)
														.filter((acctId): acctId is AcctId => acctId !== ""),
												),
										);
										return (
											<SplitEntryRow
												entry={entry()}
												onUpdate={(updated) => form.updateEntry(index, updated)}
												onRemove={() => form.removeEntry(index)}
												canRemove={form.entries().length > 2 && index > 0}
												isPrimary={index === 0}
												accountLabel={index === 0 ? ownAccountLabel() : undefined}
												accounts={props.accounts}
												categories={props.categories}
												excludeAcctIds={excludeAcctIds()}
												acctType={props.acctType}
											/>
										);
									}}
								</Index>
							</div>
						</div>

						<Show when={form.error()}>
							<div class="text-sm text-red-600">{form.error()}</div>
						</Show>

						<TransactionActionButtons
							onSave={() => void handleSave()}
							onAddEntry={form.addEntry}
							onRepeatPrior={() => void handleRepeatPrior()}
							canRepeatPrior={canRepeatPrior()}
							isSaving={form.isSaving()}
						/>
					</div>
				</td>
			</tr>
		</>
	);
}
