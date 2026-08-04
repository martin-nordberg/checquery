import { createMemo, createSignal } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import type { VndrCtgId } from "../../../shared/domain/vendorCategories/VndrCtgId";
import { vendorsClient } from "../../vendors/vendorsClient";
import { hasVendorNameConflict } from "../../vendors/vendorNameConflict";
import { setErrorAlert } from "../../rpc";
import AccountPicker from "../accounts/AccountPicker";
import ConfirmDialog from "../common/ConfirmDialog";

type EditableVendorRowProps = {
	vendor: Vendor;
	categories: VendorCategory[];
	vendors: Vendor[];
	accounts: Account[];
	onEdited: () => void;
	onCancel: () => void;
};

/**
 * Edit form for an existing vendor: name, description, category, default account, isActive. Unlike
 * accounts there's no immutable-after-creation field to omit -- every vendor field is patchable here,
 * including category (recategorizing).
 *
 * A modal, matching EditableAccountRow -- an inline row let a click elsewhere in the list silently discard
 * whatever was typed here, with no warning. The overlay makes that impossible.
 */
export default function EditableVendorRow(props: EditableVendorRowProps) {
	let nameInputRef: HTMLInputElement | undefined;
	const [name, setName] = createSignal(props.vendor.name as string);
	const [description, setDescription] = createSignal(props.vendor.description as string);
	const [ctgId, setCtgId] = createSignal<VndrCtgId>(props.vendor.ctgId);
	const [defaultAcctId, setDefaultAcctId] = createSignal((props.vendor.defaultAcctId as string) ?? "");
	const [isActive, setIsActive] = createSignal(props.vendor.isActive);
	const [isSaving, setIsSaving] = createSignal(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
	const [conflictError, setConflictError] = createSignal<string | null>(null);

	const canSave = () => name().trim().length > 0 && !isSaving();

	const categoryOptions = createMemo(() =>
		props.categories
			.slice()
			.sort((a, b) => (a.name as string).localeCompare(b.name as string))
			.map((category) => ({ id: category.id as string, label: category.name as string })),
	);

	const accountOptions = createMemo(() => [
		{ id: "", label: "(none)" },
		...props.accounts
			.filter((account) => account.acctType === "EXPENSE" || account.acctType === "INCOME")
			.sort((a, b) => (a.name as string).localeCompare(b.name as string))
			.map((account) => ({ id: account.id as string, label: account.name as string })),
	]);

	const handleSave = async () => {
		if (!canSave()) return;
		setConflictError(null);
		if (hasVendorNameConflict(props.vendors, name(), props.vendor.id)) {
			setConflictError(`A vendor named "${name()}" already exists.`);
			nameInputRef?.focus();
			return;
		}
		setIsSaving(true);
		try {
			await vendorsClient.patchVendor({
				id: props.vendor.id,
				name: name(),
				description: description(),
				ctgId: ctgId(),
				defaultAcctId: defaultAcctId() || undefined,
				isActive: isActive(),
			});
			props.onEdited();
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteClick = async () => {
		const inUse = await vendorsClient.isVendorInUse(props.vendor.id);
		if (inUse) {
			setErrorAlert({
				title: "Cannot Delete Vendor",
				message: `"${name()}" is referenced by a transaction entry, so it can't be deleted. Uncheck Active instead.`,
			});
			return;
		}
		setShowDeleteConfirm(true);
	};

	const handleConfirmDelete = async () => {
		setShowDeleteConfirm(false);
		await vendorsClient.deleteVendor(props.vendor.id);
		props.onEdited();
	};

	return (
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<ConfirmDialog
				open={showDeleteConfirm()}
				title="Delete Vendor"
				message={`Delete "${name()}"? This can't be undone.`}
				onConfirm={() => void handleConfirmDelete()}
				onCancel={() => setShowDeleteConfirm(false)}
			/>
			<div class="w-[28rem] rounded-lg bg-white p-6 shadow-xl">
				<h2 class="mb-4 text-lg font-semibold text-slate-800">Edit Vendor</h2>
				<div class="flex flex-col gap-3">
					<label class="flex flex-col gap-1 text-sm text-slate-700">
						Name
						<input
							ref={nameInputRef}
							type="text"
							class="rounded border border-slate-300 px-2 py-1.5 text-sm"
							value={name()}
							onInput={(e) => {
								setName(e.currentTarget.value);
								setConflictError(null);
							}}
							autofocus
						/>
					</label>
					<label class="flex flex-col gap-1 text-sm text-slate-700">
						Category
						<AccountPicker options={categoryOptions()} value={ctgId()} onChange={(id) => setCtgId(id as VndrCtgId)} />
					</label>
					<label class="flex flex-col gap-1 text-sm text-slate-700">
						Default Account
						<AccountPicker options={accountOptions()} value={defaultAcctId()} onChange={setDefaultAcctId} />
					</label>
					<label class="flex flex-col gap-1 text-sm text-slate-700">
						Description
						<input
							type="text"
							class="rounded border border-slate-300 px-2 py-1.5 text-sm"
							placeholder="(optional)"
							value={description()}
							onInput={(e) => setDescription(e.currentTarget.value)}
						/>
					</label>
					{conflictError() && <p class="text-sm text-red-600">{conflictError()}</p>}
					<label class="flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" checked={isActive()} onChange={(e) => setIsActive(e.currentTarget.checked)} />
						Active
					</label>
				</div>
				<div class="mt-6 flex items-center justify-between">
					<button
						type="button"
						class="rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
						onClick={() => void handleDeleteClick()}
					>
						Delete
					</button>
					<div class="flex gap-2">
						<button
							type="button"
							class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
							onClick={props.onCancel}
						>
							Cancel
						</button>
						<button
							type="button"
							class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
							disabled={!canSave()}
							onClick={() => void handleSave()}
						>
							{isSaving() ? "Saving…" : "Save"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
