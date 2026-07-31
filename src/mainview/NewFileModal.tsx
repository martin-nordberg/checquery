import { createSignal, Show } from "solid-js";
import { pendingPrompt, setPendingPrompt } from "./rpc";

export default function NewFileModal() {
	const [name, setName] = createSignal("");

	const submit = (e: Event) => {
		e.preventDefault();
		const prompt = pendingPrompt();
		if (!prompt) return;
		const trimmed = name().trim();
		if (!trimmed) return;
		prompt.resolve({ cancelled: false, name: trimmed });
		setPendingPrompt(null);
		setName("");
	};

	const cancel = () => {
		pendingPrompt()?.resolve({ cancelled: true });
		setPendingPrompt(null);
		setName("");
	};

	return (
		<Show when={pendingPrompt()}>
			{(prompt) => (
				<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<form
						onSubmit={submit}
						class="w-96 rounded-lg bg-white p-6 shadow-xl"
					>
						<h2 class="mb-2 text-lg font-semibold text-slate-800">
							New checquery file
						</h2>
						<p class="mb-4 truncate text-sm text-slate-500">
							Folder: {prompt().suggestedFolder}
						</p>
						<input
							autofocus
							value={name()}
							onInput={(e) => setName(e.currentTarget.value)}
							placeholder="MyProject"
							class="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
						/>
						<div class="flex justify-end gap-2">
							<button
								type="button"
								onClick={cancel}
								class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
							>
								Create
							</button>
						</div>
					</form>
				</div>
			)}
		</Show>
	);
}
