import { createSignal } from "solid-js";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import { vendorCategoriesClient } from "../../vendorCategories/vendorCategoriesClient";
import { hasVendorCategoryNameConflict } from "../../vendorCategories/vendorCategoryNameConflict";
import { setErrorAlert } from "../../rpc";
import ConfirmDialog from "../common/ConfirmDialog";

type EditableVendorCategoryRowProps = {
	category: VendorCategory;
	categories: VendorCategory[];
	onEdited: () => void;
	onCancel: () => void;
};

/**
 * Edit form for an existing vendor category: name, description. No parent field at all -- vendor
 * categories never nest, unlike EditableAccountCategoryRow.
 *
 * A modal, matching EditableVendorRow -- an inline row let a click elsewhere in the list silently discard
 * whatever was typed here, with no warning.
 */
export default function EditableVendorCategoryRow(props: EditableVendorCategoryRowProps) {
	const [name, setName] = createSignal(props.category.name as string);
	const [description, setDescription] = createSignal(props.category.description as string);
	const [isSaving, setIsSaving] = createSignal(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
	const [conflictError, setConflictError] = createSignal<string | null>(null);

	const canSave = () => name().trim().length > 0 && !isSaving();

	const handleSave = async () => {
		if (!canSave()) return;
		setConflictError(null);
		if (hasVendorCategoryNameConflict(props.categories, name(), props.category.id)) {
			setConflictError(`A category named "${name()}" already exists.`);
			return;
		}
		setIsSaving(true);
		try {
			await vendorCategoriesClient.patchVendorCategory({
				id: props.category.id,
				name: name(),
				description: description(),
			});
			props.onEdited();
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteClick = async () => {
		const inUse = await vendorCategoriesClient.isVendorCategoryInUse(props.category.id);
		if (inUse) {
			setErrorAlert({
				title: "Cannot Delete Category",
				message: `"${name()}" still has vendors assigned to it, so it can't be deleted.`,
			});
			return;
		}
		setShowDeleteConfirm(true);
	};

	const handleConfirmDelete = async () => {
		setShowDeleteConfirm(false);
		await vendorCategoriesClient.deleteVendorCategory(props.category.id);
		props.onEdited();
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
