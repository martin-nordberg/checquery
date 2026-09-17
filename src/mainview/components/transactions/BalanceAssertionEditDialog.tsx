import { createSignal, Show } from "solid-js";
import type { BalanceAssertion } from "../../../shared/domain/balanceAssertions/BalanceAssertion";
import { balanceAssertionsClient } from "../../balanceAssertions/balanceAssertionsClient";
import AmountInput from "./AmountInput";
import ConfirmDialog from "../common/ConfirmDialog";

type BalanceAssertionEditDialogProps = {
	assertion: BalanceAssertion;
	onCancel: () => void;
	onSaved: () => void;
	onDeleted: () => void;
};

/** Pencil-edit modal for a balance assertion -- change the asserted balance, or delete the assertion
 * entirely. The assertion's date is immutable once created (see balance-assertions-implementation-plan.md
 * §0), so it's shown as read-only text rather than an input. */
export default function BalanceAssertionEditDialog(props: BalanceAssertionEditDialogProps) {
	const [balance, setBalance] = createSignal(props.assertion.balance);
	const [isSaving, setIsSaving] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);

	const handleSave = async () => {
		setError(null);
		setIsSaving(true);
		try {
			await balanceAssertionsClient.patchBalanceAssertion({ id: props.assertion.id, balance: balance() });
			props.onSaved();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to save");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		setIsSaving(true);
		try {
			await balanceAssertionsClient.deleteBalanceAssertion(props.assertion.id);
			props.onDeleted();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to delete");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<>
			<ConfirmDialog
				open={showDeleteConfirm()}
				title="Delete Balance Assertion"
				message="Are you sure you want to delete this balance assertion? This can't be undone."
				onConfirm={() => {
					setShowDeleteConfirm(false);
					void handleDelete();
				}}
				onCancel={() => setShowDeleteConfirm(false)}
			/>
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
				<div class="w-80 rounded-lg bg-white p-6 shadow-xl">
					<h2 class="mb-4 text-lg font-semibold text-slate-800">Edit Balance Assertion</h2>
					<div class="mb-4 space-y-3">
						<div>
							<div class="mb-1 text-xs font-medium text-gray-500">Date</div>
							<div class="text-sm text-slate-900">{props.assertion.assertionDate}</div>
						</div>
						<label class="flex flex-col gap-1 text-xs font-medium text-gray-500">
							Asserted Balance
							<AmountInput value={balance()} onChange={setBalance} disabled={isSaving()} />
						</label>
					</div>
					<Show when={error()}>
						<div class="mb-4 text-sm text-red-600">{error()}</div>
					</Show>
					<div class="flex items-center justify-between">
						<button
							type="button"
							onClick={() => setShowDeleteConfirm(true)}
							disabled={isSaving()}
							class="rounded px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
						>
							Delete
						</button>
						<div class="flex gap-2">
							<button
								type="button"
								onClick={props.onCancel}
								disabled={isSaving()}
								class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => void handleSave()}
								disabled={isSaving()}
								class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
							>
								Save
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
