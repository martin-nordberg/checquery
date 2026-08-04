import { createSignal } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { accountsClient } from "../../accounts/accountsClient";
import { hasSiblingNameConflict } from "../../accountCategories/siblingNameConflict";
import { setErrorAlert } from "../../rpc";
import AccountParentPicker from "./AccountParentPicker";
import ConfirmDialog from "../common/ConfirmDialog";
import { useAccountTreeActions } from "./AccountTreeContext";

type EditableAccountRowProps = {
	account: Account;
};

/**
 * Edit form for an existing account: name, description, isPrimary, parent. Deliberately has no acctType
 * field -- account type is immutable after creation (accountPatchEventSchema omits it entirely; see
 * Account.ts).
 *
 * A modal (fixed overlay), not an inline row: an inline row let a click on a different account's name
 * silently swap editingId and discard whatever was typed here, with no warning. The overlay makes that
 * impossible -- every other row is behind it and unreachable until this is explicitly saved or cancelled.
 */
export default function EditableAccountRow(props: EditableAccountRowProps) {
	const actions = useAccountTreeActions();
	const [name, setName] = createSignal(props.account.name as string);
	const [description, setDescription] = createSignal(props.account.description as string);
	const [isPrimary, setIsPrimary] = createSignal(props.account.isPrimary);
	const [parentCtgId, setParentCtgId] = createSignal<AcctCtgId>(props.account.parentCtgId);
	const [isSaving, setIsSaving] = createSignal(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
	const [conflictError, setConflictError] = createSignal<string | null>(null);

	const canSave = () => name().trim().length > 0 && !isSaving();

	const handleSave = async () => {
		if (!canSave()) return;
		setConflictError(null);
		// Always checked against the *target* parent (parentCtgId(), which reflects whatever's currently
		// selected in the picker) -- if the user reparents to a category that already has a
		// same-named child, that's a conflict even though nothing conflicted under the old parent.
		if (hasSiblingNameConflict(actions.categories(), actions.accounts(), parentCtgId(), name(), props.account.id)) {
			setConflictError(`"${name()}" already exists under the selected category.`);
			return;
		}
		setIsSaving(true);
		try {
			await accountsClient.patchAccount({
				id: props.account.id,
				name: name(),
				description: description(),
				isPrimary: isPrimary(),
				parentCtgId: parentCtgId(),
			});
			actions.onEdited();
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteClick = async () => {
		const inUse = await accountsClient.isAccountInUse(props.account.id);
		if (inUse) {
			setErrorAlert({
				title: "Cannot Delete Account",
				message: `"${name()}" is referenced by a transaction entry or is a vendor's default account, so it can't be deleted.`,
			});
			return;
		}
		setShowDeleteConfirm(true);
	};

	const handleConfirmDelete = async () => {
		setShowDeleteConfirm(false);
		await accountsClient.deleteAccount(props.account.id);
		actions.onEdited();
	};

	return (
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<ConfirmDialog
				open={showDeleteConfirm()}
				title="Delete Account"
				message={`Delete "${name()}"? This can't be undone.`}
				onConfirm={() => void handleConfirmDelete()}
				onCancel={() => setShowDeleteConfirm(false)}
			/>
			<div class="w-[28rem] rounded-lg bg-white p-6 shadow-xl">
				<h2 class="mb-4 text-lg font-semibold text-slate-800">Edit Account</h2>
				<div class="flex flex-col gap-3">
					<label class="flex flex-col gap-1 text-sm text-slate-700">
						Name
						<input
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
						Description
						<input
							type="text"
							class="rounded border border-slate-300 px-2 py-1.5 text-sm"
							placeholder="(optional)"
							value={description()}
							onInput={(e) => setDescription(e.currentTarget.value)}
						/>
					</label>
					<label class="flex flex-col gap-1 text-sm text-slate-700">
						Category
						<AccountParentPicker
							acctType={actions.acctType}
							categories={actions.categories()}
							value={parentCtgId()}
							onChange={(id) => {
								setParentCtgId(id);
								setConflictError(null);
							}}
						/>
					</label>
					<label class="flex items-center gap-2 text-sm text-slate-700">
						<input
							type="checkbox"
							checked={isPrimary()}
							onChange={(e) => setIsPrimary(e.currentTarget.checked)}
						/>
						Primary
					</label>
					{conflictError() && <p class="text-sm text-red-600">{conflictError()}</p>}
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
							onClick={actions.onCancelEdit}
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
