import { createSignal, Show } from "solid-js";
import TopNav from "../components/nav/TopNav";
import { login } from "../api/authSession";

/**
 * Sign-in (one of the up-to-two users configured on the server). On success App.tsx moves on to the page that
 * was originally requested (`?next=`), so this page itself never navigates.
 */
export default function LoginPage() {
	const [username, setUsername] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const [busy, setBusy] = createSignal(false);

	const canSubmit = () => !busy() && username().trim().length > 0 && password().length > 0;

	const submit = async (e: Event) => {
		e.preventDefault();
		if (!canSubmit()) return;
		setBusy(true);
		setError(null);
		const problem = await login(username().trim(), password());
		setBusy(false);
		if (problem) {
			setError(problem);
			setPassword("");
		}
	};

	return (
		<>
			<TopNav />
			<main class="flex justify-center p-4 pt-16">
				<form onSubmit={(e) => void submit(e)} class="w-96 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
					<h1 class="mb-4 text-lg font-semibold text-slate-800">Sign in</h1>
					<label class="mb-3 flex flex-col gap-1 text-sm text-slate-700">
						User name
						<input
							autofocus
							autocomplete="username"
							value={username()}
							onInput={(e) => setUsername(e.currentTarget.value)}
							class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
						/>
					</label>
					<label class="mb-4 flex flex-col gap-1 text-sm text-slate-700">
						Password
						<input
							type="password"
							autocomplete="current-password"
							value={password()}
							onInput={(e) => setPassword(e.currentTarget.value)}
							class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
						/>
					</label>
					<Show when={error()}>
						<p role="alert" class="mb-4 text-sm text-red-600">
							{error()}
						</p>
					</Show>
					<div class="flex justify-end">
						<button
							type="submit"
							disabled={!canSubmit()}
							class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
						>
							Sign in
						</button>
					</div>
				</form>
			</main>
		</>
	);
}
