import { createSignal } from "solid-js";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { acctCtgRootId } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import { accountCategoriesClient } from "../../accountCategories/accountCategoriesClient";
import { hasSiblingNameConflict } from "../../accountCategories/siblingNameConflict";
import { setErrorAlert } from "../../rpc";
import AccountCategoryParentPicker from "./AccountCategoryParentPicker";
import ConfirmDialog from "../common/ConfirmDialog";
import { useAccountTreeActions } from "./AccountTreeContext";

type EditableAccountCategoryRowProps = {
	category: AccountCategory;
};

/**
 * Edit form for an existing category: name, description, parent. No acctType field -- a category's type is
 * immutable after creation (accountCategoryPatchEventSchema omits it entirely).
 *
 * A modal, matching EditableAccountRow -- same reasoning: an inline row let a click on a different row
 * silently discard whatever was typed here, with no warning.
 */
export default function EditableAccountCategoryRow(props: EditableAccountCategoryRowProps) {
	const actions = useAccountTreeActions();
	const [name, setName] = createSignal(props.category.name as string);
	const [description, setDescription] = createSignal(props.category.description as string);
	const [parentCtgId, setParentCtgId] = createSignal<AcctCtgId>(props.category.parentCtgId ?? acctCtgRootId[actions.acctType]);
	const [isSaving, setIsSaving] = createSignal(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
	const [conflictError, setConflictError] = createSignal<string | null>(null);

	const canSave = () => name().trim().length > 0 && !isSaving();

	const handleSave = async () => {
		if (!canSave()) return;
		setConflictError(null);
		if (hasSiblingNameConflict(actions.categories(), actions.accounts(), parentCtgId(), name(), props.category.id)) {
			setConflictError(`"${name()}" already exists under this category's parent.`);
			return;
		}
		setIsSaving(true);
		try {
			await accountCategoriesClient.patchAccountCategory({
				id: props.category.id,
				name: name(),
				description: description(),
				parentCtgId: parentCtgId(),
			});
			actions.onEdited();
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteClick = async () => {
		const inUse = await accountCategoriesClient.isAccountCategoryInUse(props.category.id);
		if (inUse) {
			setErrorAlert({
				title: "Cannot Delete Category",
				message: `"${name()}" contains accounts or subcategories, so it can't be deleted.`,
			});
			return;
		}
		setShowDeleteConfirm(true);
	};

	const handleConfirmDelete = async () => {
		setShowDeleteConfirm(false);
		await accountCategoriesClient.deleteAccountCategory(props.category.id);
		actions.onEdited();
	};

	return (
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<ConfirmDialog
				open={showDeleteConfirm()}
				title="Delete Category"
				message={`Delete "${name()}"? This can't be undone.`}
				onConfirm={() => void handleConfirmDelete()}
				onCancel={() => setShowDeleteConfirm(false)}
			/>
			<div class="w-[28rem] rounded-lg bg-white p-6 shadow-xl">
				<h2 class="mb-4 text-lg font-semibold text-slate-800">Edit Category</h2>
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
						Parent
						<AccountCategoryParentPicker
							acctType={actions.acctType}
							categories={actions.categories()}
							excludeId={props.category.id}
							value={parentCtgId()}
							onChange={setParentCtgId}
						/>
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
