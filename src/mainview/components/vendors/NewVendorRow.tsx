import { createMemo, createSignal } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import { vendorsClient } from "../../vendors/vendorsClient";
import AccountPicker from "../accounts/AccountPicker";

type NewVendorRowProps = {
	accounts: Account[];
	onAdded: () => void;
	onCancel: () => void;
};

/**
 * Vendor-creation form. No Active field -- new vendors are always created active (server-side default),
 * matching accounts' pattern of not exposing every patchable field at creation time; see
 * documentation/vendor-list-implementation-plan.md §0.
 *
 * A modal, matching NewAccountRow -- an inline row let a click elsewhere in the list silently discard
 * whatever was typed here, with no warning. The overlay makes that impossible.
 */
export default function NewVendorRow(props: NewVendorRowProps) {
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [defaultAcctId, setDefaultAcctId] = createSignal("");
	const [isSaving, setIsSaving] = createSignal(false);

	const canSave = () => name().trim().length > 0 && !isSaving();

	// Restricted to Expense/Income accounts -- a vendor's default account is where its transactions
	// usually post, never an Asset/Liability/Net Worth account in practice; see plan §0.
	const accountOptions = createMemo(() => [
		{ id: "", label: "(none)" },
		...props.accounts
			.filter((account) => account.acctType === "EXPENSE" || account.acctType === "INCOME")
			.sort((a, b) => (a.name as string).localeCompare(b.name as string))
			.map((account) => ({ id: account.id as string, label: account.name as string })),
	]);

	const handleSave = async () => {
		if (!canSave()) return;
		setIsSaving(true);
		try {
			await vendorsClient.createVendor({
				name: name(),
				description: description() || undefined,
				defaultAcctId: defaultAcctId() || undefined,
			});
			props.onAdded();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div class="w-[28rem] rounded-lg bg-white p-6 shadow-xl">
				<h2 class="mb-4 text-lg font-semibold text-slate-800">New Vendor</h2>
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
