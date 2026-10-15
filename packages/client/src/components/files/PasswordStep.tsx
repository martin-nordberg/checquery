import { createSignal, onMount, Show, type JSX } from "solid-js";

type PasswordStepProps = {
	title: string;
	/** The file being opened/unlocked, shown under the title. */
	fileName: string;
	submitLabel: string;
	/** A server-reported problem (e.g. "Incorrect password.") to show inline. */
	error: string | null;
	busy: boolean;
	onSubmit: (password: string) => void;
	onCancel: () => void;
	/** Optional extra action(s) shown at the left of the button row. */
	extra?: JSX.Element;
};

/**
 * The password form shared by the Open File dialog's password step and the Unlock dialog (formerly
 * PasswordModal, which the desktop app showed after its native file picker). Presentational: the caller
 * decides what submitting does.
 */
export default function PasswordStep(props: PasswordStepProps) {
	const [password, setPassword] = createSignal("");
	const [visible, setVisible] = createSignal(false);
	let inputRef: HTMLInputElement | undefined;
	let submitRef: HTMLButtonElement | undefined;

	onMount(() => inputRef?.focus());

	// Trap Tab/Shift+Tab within the dialog's own focusable elements (the eyeball toggle is deliberately
	// excluded via tabIndex={-1} below) so keyboard focus can't leak out to the page underneath while the
	// dialog is open.
	const trapTab = (e: KeyboardEvent) => {
		if (e.key !== "Tab" || !inputRef || !submitRef) return;
		if (e.shiftKey) {
			if (document.activeElement === inputRef) {
				e.preventDefault();
				submitRef.focus();
			}
		} else {
			if (document.activeElement === submitRef) {
				e.preventDefault();
				inputRef.focus();
			}
		}
	};

	const submit = (e: Event) => {
		e.preventDefault();
		if (props.busy) return;
		props.onSubmit(password());
	};

	return (
		<form onSubmit={submit} onKeyDown={trapTab} class="w-96 rounded-lg bg-white p-6 shadow-xl">
			<h2 class="mb-2 text-lg font-semibold text-slate-800">{props.title}</h2>
			<p class="mb-4 truncate text-sm text-slate-500">File: {props.fileName}</p>
			<div class="relative mb-1">
				<input
					ref={inputRef}
					autofocus
					type={visible() ? "text" : "password"}
					value={password()}
					onInput={(e) => setPassword(e.currentTarget.value)}
					placeholder="Password"
					aria-label="Password"
					class="w-full rounded border border-slate-300 px-3 py-2 pr-9 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
				/>
				<button
					type="button"
					onClick={() => setVisible((v) => !v)}
					aria-label={visible() ? "Hide password" : "Show password"}
					aria-pressed={visible()}
					class="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-400 hover:text-slate-600"
					tabIndex={-1}
				>
					<Show
						when={visible()}
						fallback={
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="h-4 w-4"
							>
								<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="h-4 w-4"
						>
							<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.4 21.4 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.4 21.4 0 0 1-2.68 3.68M14.12 14.12a3 3 0 1 1-4.24-4.24" />
							<path d="M1 1l22 22" />
						</svg>
					</Show>
				</button>
			</div>
			<Show when={props.error}>
				<p role="alert" class="mt-2 text-sm text-red-600">
					{props.error}
				</p>
			</Show>
			<div class="mt-4 flex items-center justify-end gap-2">
				<div class="mr-auto">{props.extra}</div>
				<button
					type="button"
					onClick={() => props.onCancel()}
					class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
				>
					Cancel
				</button>
				<button
					ref={submitRef}
					type="submit"
					disabled={props.busy}
					class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{props.submitLabel}
				</button>
			</div>
		</form>
	);
}
