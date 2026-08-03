import { createSignal } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import { acctRootId } from "../../../shared/domain/accounts/AcctRoot";
import { accountsClient } from "../../accounts/accountsClient";
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
 * Account.ts and documentation/account-list-implementation-plan.md §0).
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
	const [parentId, setParentId] = createSignal<AcctId>(props.account.parentId ?? acctRootId[actions.acctType]);
	const [isSaving, setIsSaving] = createSignal(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);

	const canSave = () => name().trim().length > 0 && !isSaving();

	const handleSave = async () => {
		if (!canSave()) return;
		setIsSaving(true);
		try {
			await accountsClient.patchAccount({
				id: props.account.id,
				name: name(),
				description: description(),
				isPrimary: isPrimary(),
				parentId: parentId(),
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
							onInput={(e) => setName(e.currentTarget.value)}
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
						Parent
						<AccountParentPicker
							acctType={actions.acctType}
							accounts={actions.accounts()}
							excludeId={props.account.id}
							value={parentId()}
							onChange={setParentId}
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
