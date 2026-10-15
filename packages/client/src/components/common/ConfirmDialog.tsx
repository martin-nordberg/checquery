import { Show } from "solid-js";

type ConfirmDialogProps = {
	open: boolean;
	title?: string;
	message: string;
	confirmLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
};

/** A generic Yes/Cancel confirmation modal for destructive actions (delete, etc.), styled to match the
 * other modals (NewFileModal, ErrorAlertModal). */
export default function ConfirmDialog(props: ConfirmDialogProps) {
	return (
		<Show when={props.open}>
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
				<div class="w-96 rounded-lg bg-white p-6 shadow-xl">
					<Show when={props.title}>
						<h2 class="mb-2 text-lg font-semibold text-slate-800">{props.title}</h2>
					</Show>
					<p class="mb-4 text-sm text-slate-600">{props.message}</p>
					<div class="flex justify-end gap-2">
						<button
							type="button"
							onClick={props.onCancel}
							class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={props.onConfirm}
							class="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
						>
							{props.confirmLabel ?? "Delete"}
						</button>
					</div>
				</div>
			</div>
		</Show>
	);
}
