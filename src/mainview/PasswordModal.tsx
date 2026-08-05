import { createSignal, Show } from "solid-js";
import { pendingPasswordPrompt, setPendingPasswordPrompt } from "./rpc";

export default function PasswordModal() {
	const [password, setPassword] = createSignal("");

	const submit = (e: Event) => {
		e.preventDefault();
		const prompt = pendingPasswordPrompt();
		if (!prompt) return;
		prompt.resolve({ cancelled: false, password: password() });
		setPendingPasswordPrompt(null);
		setPassword("");
	};

	const cancel = () => {
		pendingPasswordPrompt()?.resolve({ cancelled: true });
		setPendingPasswordPrompt(null);
		setPassword("");
	};

	return (
		<Show when={pendingPasswordPrompt()}>
			{(prompt) => (
				<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<form
						onSubmit={submit}
						class="w-96 rounded-lg bg-white p-6 shadow-xl"
					>
						<h2 class="mb-2 text-lg font-semibold text-slate-800">
							Enter password
						</h2>
						<p class="mb-4 truncate text-sm text-slate-500">
							File: {prompt().fileName}
						</p>
						<input
							autofocus
							type="password"
							value={password()}
							onInput={(e) => setPassword(e.currentTarget.value)}
							placeholder="Password"
							class="mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
						/>
						<p class="mb-4 text-xs text-slate-500">
							Leave blank if this file isn't encrypted.
						</p>
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
								Open
							</button>
						</div>
					</form>
				</div>
			)}
		</Show>
	);
}
