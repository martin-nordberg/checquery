import { createSignal, Show } from "solid-js";
import { pendingPrompt, setPendingPrompt } from "./rpc";

export default function NewFileModal() {
	const [name, setName] = createSignal("");
	const [password, setPassword] = createSignal("");

	// Test mode (CHECQUERY_ENCRYPTION_DISABLED=true) omits password entry entirely -- see
	// documentation/test-mode.md -- otherwise it's a required field.
	const passwordRequired = () => pendingPrompt()?.encryptionMode === "enabled";
	const canSubmit = () => name().trim().length > 0 && (!passwordRequired() || password().length > 0);

	const submit = (e: Event) => {
		e.preventDefault();
		const prompt = pendingPrompt();
		if (!prompt) return;
		const trimmedName = name().trim();
		if (!trimmedName) return;
		if (passwordRequired() && !password()) return;
		prompt.resolve({ cancelled: false, name: trimmedName, password: password() });
		setPendingPrompt(null);
		setName("");
		setPassword("");
	};

	const cancel = () => {
		pendingPrompt()?.resolve({ cancelled: true });
		setPendingPrompt(null);
		setName("");
		setPassword("");
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
						<Show when={prompt().encryptionMode === "enabled"}>
							<input
								type="password"
								required
								value={password()}
								onInput={(e) => setPassword(e.currentTarget.value)}
								placeholder="Password"
								class="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
							/>
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
			)}
		</Show>
	);
}
