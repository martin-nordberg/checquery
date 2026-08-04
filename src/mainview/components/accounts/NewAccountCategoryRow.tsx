import { createMemo, createSignal } from "solid-js";
import type { AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { acctCtgRootId, acctCtgRootName } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import { acctTypeText } from "../../../shared/domain/accounts/AcctType";
import { accountCategoriesClient } from "../../accountCategories/accountCategoriesClient";
import { hasSiblingNameConflict } from "../../accountCategories/siblingNameConflict";
import { useAccountTreeActions } from "./AccountTreeContext";

type NewAccountCategoryRowProps = {
	parentCtgId: AcctCtgId;
};

/**
 * Category-creation form. acctType and parentCtgId are always supplied (acctType from context -- the page's
 * route param; parentCtgId from which "+ Add category" link was clicked) -- never picked by the user. See
 * documentation/account-categories-implementation-plan.md §0/§7.
 *
 * A modal, matching NewAccountRow/EditableAccountRow -- same reasoning: an inline row let a click elsewhere
 * in the tree silently discard whatever was typed here, with no warning.
 */
export default function NewAccountCategoryRow(props: NewAccountCategoryRowProps) {
	const actions = useAccountTreeActions();
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [isSaving, setIsSaving] = createSignal(false);
	const [conflictError, setConflictError] = createSignal<string | null>(null);

	const canSave = () => name().trim().length > 0 && !isSaving();

	const parentLabel = createMemo(() => {
		if (props.parentCtgId === acctCtgRootId[actions.acctType]) {
			return `${acctCtgRootName[actions.acctType]} (top level)`;
		}
		return actions.categories().find((category) => category.id === props.parentCtgId)?.name ?? "";
	});

	const handleSave = async () => {
		if (!canSave()) return;
		setConflictError(null);
		if (hasSiblingNameConflict(actions.categories(), actions.accounts(), props.parentCtgId, name())) {
			setConflictError(`"${name()}" already exists under ${parentLabel()}.`);
			return;
		}
		setIsSaving(true);
		try {
			await accountCategoriesClient.createAccountCategory({
				acctType: actions.acctType,
				parentCtgId: props.parentCtgId,
				name: name(),
				description: description() || undefined,
			});
			actions.onAdded();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div class="w-[28rem] rounded-lg bg-white p-6 shadow-xl">
				<h2 class="mb-1 text-lg font-semibold text-slate-800">New {acctTypeText(actions.acctType)} Category</h2>
				<p class="mb-4 text-sm text-slate-500">Under: {parentLabel()}</p>
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
						onClick={actions.onCancelAdd}
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
