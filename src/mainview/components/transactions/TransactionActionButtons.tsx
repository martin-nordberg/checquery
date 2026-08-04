import { Show } from "solid-js";

type TransactionActionButtonsProps = {
	onSave: () => void;
	onDelete?: () => void;
	onAddEntry: () => void;
	onRepeatPrior?: () => void;
	canRepeatPrior?: boolean;
	isSaving: boolean;
};

/** Save / Delete (edit only) / Add Entry / Repeat Prior (new only, when onRepeatPrior is given) -- same
 * layout as the old client's RegisterActionButtons.tsx, restyled to checquery2's existing button classes. */
export default function TransactionActionButtons(props: TransactionActionButtonsProps) {
	return (
		<div class="mt-2 flex items-center gap-2">
			<button
				type="button"
				class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
				disabled={props.isSaving}
				onClick={props.onSave}
			>
				{props.isSaving ? "Saving…" : "Save"}
			</button>
			<Show when={props.onDelete}>
				<button
					type="button"
					class="rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
					disabled={props.isSaving}
					onClick={props.onDelete}
				>
					Delete
				</button>
			</Show>
			<div class="flex-1" />
			<Show when={props.onRepeatPrior}>
				<button
					type="button"
					class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
					disabled={!props.canRepeatPrior}
					title="Repeat the most recent transaction for this vendor"
					onClick={props.onRepeatPrior}
				>
					Repeat Prior
				</button>
			</Show>
			<button
				type="button"
				class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
				onClick={props.onAddEntry}
			>
				+ Add Entry
			</button>
		</div>
	);
}
