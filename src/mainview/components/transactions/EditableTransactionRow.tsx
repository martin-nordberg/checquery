import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import type { Transaction } from "../../../shared/domain/transactions/Transaction";
import { transactionsClient } from "../../transactions/transactionsClient";
import ConfirmDialog from "../common/ConfirmDialog";
import VendorFieldWithAdd from "./VendorFieldWithAdd";
import SplitEntryRow from "./SplitEntryRow";
import TransactionActionButtons from "./TransactionActionButtons";
import useAbandonConfirm from "./useAbandonConfirm";
import useTransactionRowForm, { type EditableEntry } from "./useTransactionRowForm";

type EditableTransactionRowProps = {
	transaction: Transaction;
	accountId: AcctId;
	showCode: boolean;
	accounts: Account[];
	categories: AccountCategory[];
	vendors: Vendor[];
	vendorCategories: VendorCategory[];
	refetchVendors: (info?: unknown) => Vendor[] | Promise<Vendor[] | undefined> | null | undefined;
	columnCount: number;
	onCancel: () => void;
	onSaved: () => void;
	onDeleted: () => void;
	onDirtyChange: (isDirty: boolean) => void;
};

/** Re-points the transaction's entries so this log's own account comes first (matching how it's always
 * displayed/edited as the "primary", auto-balancing entry), the same reordering the old client did on
 * entering edit mode. */
function reorderEntries(transaction: Transaction, accountId: AcctId): EditableEntry[] {
	const ownEntry = transaction.entries.find((e) => e.acctId === accountId);
	const otherEntries = transaction.entries.filter((e) => e.acctId !== accountId);
	const ordered = ownEntry ? [ownEntry, ...otherEntries] : transaction.entries;
	return ordered.map((e) => ({ acctId: e.acctId as string, debit: e.debit, credit: e.credit }));
}

/** In-row edit form for an existing transaction. Unlike the old client's EditableRegisterRow, there's no
 * second fetch on entering edit mode -- findTransactionsByAccount already returned full transactions with
 * every entry, so props.transaction is already everything this form needs. See
 * transactions-register-implementation-plan.md §3/§5. */
export default function EditableTransactionRow(props: EditableTransactionRowProps) {
	const initialPostDate = props.transaction.postDate as string;
	const initialClearedDate = (props.transaction.clearedDate as string | undefined) ?? "";
	const initialCode = props.transaction.code;
	const initialVndrId = (props.transaction.vndrId as string | undefined) ?? "";
	const initialDescription = props.transaction.description as string;
	const initialNeedsReview = props.transaction.needsReview;
	const initialEntries = reorderEntries(props.transaction, props.accountId);

	const form = useTransactionRowForm({
		initialPostDate,
		initialClearedDate,
		initialCode,
		initialVndrId,
		initialDescription,
		initialNeedsReview,
		initialEntries,
	});

	const isDirty = createMemo(() => {
		if (form.postDate() !== initialPostDate) return true;
		if (form.clearedDate() !== initialClearedDate) return true;
		if (form.code() !== initialCode) return true;
		if (form.vndrId() !== initialVndrId) return true;
		if (form.description() !== initialDescription) return true;
		if (form.needsReview() !== initialNeedsReview) return true;
		const current = form.entries();
		if (current.length !== initialEntries.length) return true;
		for (let i = 0; i < current.length; i++) {
			if (current[i]!.acctId !== initialEntries[i]!.acctId) return true;
			if (current[i]!.debit !== initialEntries[i]!.debit) return true;
			if (current[i]!.credit !== initialEntries[i]!.credit) return true;
		}
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

	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);

	const handleSave = async () => {
		form.setError(null);
		const result = form.validateForSave();
		if (!result) return;
		form.setIsSaving(true);
		try {
			const postDate = form.postDate() || form.clearedDate();
			await transactionsClient.patchTransaction({
				id: props.transaction.id,
				postDate,
				clearedDate: form.clearedDate() || undefined,
				code: form.code(),
				vndrId: form.vndrId() || undefined,
				description: form.description() || undefined,
				needsReview: form.needsReview(),
				entries: result.entries.map((e) => ({ acctId: e.acctId, debit: e.debit, credit: e.credit })),
			});
			props.onSaved();
		} catch (e) {
			form.setError(e instanceof Error ? e.message : "Failed to save");
		} finally {
			form.setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		form.setIsSaving(true);
		try {
			await transactionsClient.deleteTransaction(props.transaction.id);
			props.onDeleted();
		} catch (e) {
			form.setError(e instanceof Error ? e.message : "Failed to delete");
		} finally {
			form.setIsSaving(false);
		}
	};

	return (
		<>
			<ConfirmDialog
				open={abandon.showAbandonConfirm()}
				title="Discard Changes"
				message="You have unsaved changes. Discard them?"
				confirmLabel="Discard"
				onConfirm={abandon.doCancel}
				onCancel={abandon.dismissConfirm}
			/>
			<ConfirmDialog
				open={showDeleteConfirm()}
				title="Delete Transaction"
				message="Are you sure you want to delete this transaction? This can't be undone."
				onConfirm={() => {
					setShowDeleteConfirm(false);
					void handleDelete();
				}}
				onCancel={() => setShowDeleteConfirm(false)}
			/>
			<tr class="bg-blue-50">
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
								<For each={form.balancedEntries()}>
									{(entry, index) => {
										const excludeAcctIds = createMemo(
											() =>
												new Set(
													form
														.balancedEntries()
														.filter((_, i) => i !== index())
														.map((e) => e.acctId)
														.filter((acctId): acctId is AcctId => acctId !== ""),
												),
										);
										return (
											<SplitEntryRow
												entry={entry}
												onUpdate={(updated) => form.updateEntry(index(), updated)}
												onRemove={() => form.removeEntry(index())}
												canRemove={form.entries().length > 2 && index() > 0}
												isPrimary={index() === 0}
												accountLabel={index() === 0 ? ownAccountLabel() : undefined}
												accounts={props.accounts}
												categories={props.categories}
												excludeAcctIds={excludeAcctIds()}
											/>
										);
									}}
								</For>
							</div>
						</div>

						<Show when={form.error()}>
							<div class="text-sm text-red-600">{form.error()}</div>
						</Show>

						<TransactionActionButtons
							onSave={() => void handleSave()}
							onDelete={() => setShowDeleteConfirm(true)}
							onAddEntry={form.addEntry}
							isSaving={form.isSaving()}
						/>
					</div>
				</td>
			</tr>
		</>
	);
}
