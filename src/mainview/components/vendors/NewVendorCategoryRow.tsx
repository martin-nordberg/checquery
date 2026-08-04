import { createSignal } from "solid-js";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import { vendorCategoriesClient } from "../../vendorCategories/vendorCategoriesClient";
import { hasVendorCategoryNameConflict } from "../../vendorCategories/vendorCategoryNameConflict";

type NewVendorCategoryRowProps = {
	categories: VendorCategory[];
	onAdded: () => void;
	onCancel: () => void;
};

/**
 * Category-creation form. Only ever reachable from the page header's "+" icon -- there's no per-row
 * "+ Add category" the way account categories have, since vendor categories never nest; see
 * documentation/vendor-categories-implementation-plan.md §0/§7.
 *
 * A modal, matching NewVendorRow -- an inline row let a click elsewhere in the list silently discard
 * whatever was typed here, with no warning.
 */
export default function NewVendorCategoryRow(props: NewVendorCategoryRowProps) {
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [isSaving, setIsSaving] = createSignal(false);
	const [conflictError, setConflictError] = createSignal<string | null>(null);

	const canSave = () => name().trim().length > 0 && !isSaving();

	const handleSave = async () => {
		if (!canSave()) return;
		setConflictError(null);
		if (hasVendorCategoryNameConflict(props.categories, name())) {
			setConflictError(`A category named "${name()}" already exists.`);
			return;
		}
		setIsSaving(true);
		try {
			await vendorCategoriesClient.createVendorCategory({
				name: name(),
				description: description() || undefined,
			});
			props.onAdded();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div class="w-[28rem] rounded-lg bg-white p-6 shadow-xl">
				<h2 class="mb-4 text-lg font-semibold text-slate-800">New Vendor Category</h2>
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
				<div class="mt-6 flex justify-end gap-2">
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
						{isSaving() ? "Adding…" : "Add"}
					</button>
				</div>
			</div>
		</div>
	);
}
