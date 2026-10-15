import { createSignal, Show } from "solid-js";
import { encryptionMode, newFileDialogOpen, setNewFileDialogOpen, submitNewFile } from "./api/fileSession";

/** New File: just a name (+ password, unless in test mode) -- the file is created in the server's data folder. */
export default function NewFileModal() {
	const [name, setName] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const [busy, setBusy] = createSignal(false);

	// Test mode (CHECQUERY_ENCRYPTION_DISABLED=true) omits password entry entirely -- see
	// tasks/done/test-mode.md -- otherwise it's a required field.
	const passwordRequired = () => encryptionMode() === "enabled";
	const canSubmit = () =>
		!busy() && name().trim().length > 0 && (!passwordRequired() || password().length > 0);

	const reset = () => {
		setName("");
		setPassword("");
		setError(null);
	};

	const submit = async (e: Event) => {
		e.preventDefault();
		if (!canSubmit()) return;
		setBusy(true);
		setError(null);
		const problem = await submitNewFile(name().trim(), passwordRequired() ? password() : "");
		setBusy(false);
		if (problem) {
			setError(problem);
			return;
		}
		setNewFileDialogOpen(false);
		reset();
	};

	const cancel = () => {
		setNewFileDialogOpen(false);
		reset();
	};

	return (
		<Show when={newFileDialogOpen()}>
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
				<form onSubmit={(e) => void submit(e)} class="w-96 rounded-lg bg-white p-6 shadow-xl">
					<h2 class="mb-2 text-lg font-semibold text-slate-800">New checquery file</h2>
					<p class="mb-4 text-sm text-slate-500">It's saved in the server's data folder.</p>
					<input
						autofocus
						value={name()}
						onInput={(e) => {
							setName(e.currentTarget.value);
							setError(null);
						}}
						placeholder="MyProject"
						aria-label="File name"
						class="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
					/>
					<Show when={passwordRequired()}>
						<input
							type="password"
							required
							value={password()}
							onInput={(e) => setPassword(e.currentTarget.value)}
							placeholder="Password"
							aria-label="Password"
							class="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
						/>
					</Show>
					<Show when={error()}>
						<p role="alert" class="mb-4 whitespace-pre-wrap text-sm text-red-600">
							{error()}
						</p>
					</Show>
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
							disabled={!canSubmit()}
							class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
						>
							Create
						</button>
					</div>
				</form>
			</div>
		</Show>
	);
}
