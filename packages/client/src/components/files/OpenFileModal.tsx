import { createResource, createSignal, For, Match, Show, Switch } from "solid-js";
import {
	encryptionMode,
	fetchFileList,
	openFileDialog,
	requestCloseFile,
	requestNewFile,
	setOpenFileDialog,
	submitOpenFile,
	submitUnlock,
	uploadFile,
} from "../../api/fileSession";
import { errorMessage } from "../../api/apiClient";
import { displayName, formatBytes } from "../../files/fileDisplay";
import PasswordStep from "./PasswordStep";

const extension = () => (encryptionMode() === "enabled" ? ".checquery" : ".checquery-test");

/**
 * Open File, replacing the desktop app's native file picker: (1) pick one of the files in the server's data
 * folder -- or upload one, e.g. from the desktop app -- then (2) enter its password (skipped in test mode).
 * The same password step also serves "unlock", for a file another session already has open.
 */
export default function OpenFileModal() {
	const [error, setError] = createSignal<string | null>(null);
	const [busy, setBusy] = createSignal(false);

	/** The chosen (or already-open) file's name, in the password and unlock steps. */
	const name = () => {
		const dialog = openFileDialog();
		return dialog && dialog.step !== "pick" ? dialog.name : "";
	};

	const close = () => {
		setError(null);
		setOpenFileDialog(null);
	};

	const run = async (attempt: () => Promise<string | null>) => {
		setBusy(true);
		setError(null);
		const problem = await attempt();
		setBusy(false);
		if (problem) setError(problem);
		else close();
	};

	const choose = (name: string) => {
		if (encryptionMode() === "enabled") {
			setError(null);
			setOpenFileDialog({ step: "password", name });
		} else {
			void run(() => submitOpenFile(name, ""));
		}
	};

	return (
		<Show when={openFileDialog()}>
			{(dialog) => (
				<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<Switch>
						<Match when={dialog().step === "pick"}>
							<FilePicker error={error()} busy={busy()} onChoose={choose} onCancel={close} setError={setError} />
						</Match>
						<Match when={dialog().step === "password"}>
							<PasswordStep
								title="Enter password"
								fileName={name()}
								submitLabel="Open"
								error={error()}
								busy={busy()}
								onSubmit={(password) => void run(() => submitOpenFile(name(), password))}
								onCancel={() => {
									setError(null);
									setOpenFileDialog({ step: "pick" });
								}}
							/>
						</Match>
						<Match when={dialog().step === "unlock" && encryptionMode() === "enabled"}>
							<PasswordStep
								title={`Unlock ${displayName(name())}`}
								fileName={name()}
								submitLabel="Unlock"
								error={error()}
								busy={busy()}
								onSubmit={(password) => void run(() => submitUnlock(password))}
								onCancel={close}
								extra={
									<button
										type="button"
										onClick={() => {
											close();
											void requestCloseFile();
										}}
										class="text-xs text-slate-500 hover:underline"
									>
										Close this file instead
									</button>
								}
							/>
						</Match>
						<Match when={dialog().step === "unlock"}>
							<UnlockWithoutPassword
								name={name()}
								busy={busy()}
								error={error()}
								onUnlock={() => void run(() => submitUnlock(""))}
								onCancel={close}
							/>
						</Match>
					</Switch>
				</div>
			)}
		</Show>
	);
}

function FilePicker(props: {
	error: string | null;
	busy: boolean;
	onChoose: (name: string) => void;
	onCancel: () => void;
	setError: (message: string | null) => void;
}) {
	const [files, { refetch }] = createResource(fetchFileList);
	const [uploading, setUploading] = createSignal(false);
	let uploadRef: HTMLInputElement | undefined;

	const upload = async (file: File | undefined) => {
		if (!file) return;
		setUploading(true);
		props.setError(null);
		try {
			await uploadFile(file);
			await refetch();
		} catch (e) {
			props.setError(errorMessage(e, "Upload failed."));
		} finally {
			setUploading(false);
			if (uploadRef) uploadRef.value = "";
		}
	};

	return (
		<div class="flex max-h-[85vh] w-[32rem] flex-col rounded-lg bg-white p-6 shadow-xl">
			<h2 class="mb-4 text-lg font-semibold text-slate-800">Open a file</h2>
			<div class="mb-4 flex-1 overflow-y-auto rounded border border-slate-200">
				<Show when={!files.loading} fallback={<p class="p-3 text-sm text-slate-500">Loading…</p>}>
					<Show
						when={(files() ?? []).length > 0}
						fallback={
							<p class="p-3 text-sm text-slate-500">
								No files yet -- create one, or upload one from the desktop app.
							</p>
						}
					>
						<ul>
							<For each={files()}>
								{(file) => (
									<li class="border-b border-slate-100 last:border-0">
										<button
											type="button"
											disabled={props.busy}
											onClick={() => props.onChoose(file.name)}
											class="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm hover:bg-slate-50"
										>
											<span class="truncate font-medium text-slate-800">{displayName(file.name)}</span>
											<span class="shrink-0 text-xs text-slate-500">
												{formatBytes(file.sizeBytes)} · {new Date(file.lastModifiedIso).toLocaleString()}
											</span>
										</button>
									</li>
								)}
							</For>
						</ul>
					</Show>
				</Show>
			</div>
			<Show when={props.error}>
				<p role="alert" class="mb-3 text-sm text-red-600">
					{props.error}
				</p>
			</Show>
			<input
				ref={uploadRef}
				type="file"
				accept={extension()}
				class="hidden"
				aria-label="File to upload"
				onChange={(e) => void upload(e.currentTarget.files?.[0])}
			/>
			<div class="flex items-center justify-end gap-2">
				<button
					type="button"
					disabled={uploading()}
					onClick={() => uploadRef?.click()}
					class="mr-auto rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				>
					{uploading() ? "Uploading…" : "Upload a file…"}
				</button>
				<button
					type="button"
					onClick={() => {
						props.onCancel();
						requestNewFile();
					}}
					class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
				>
					New file…
				</button>
				<button
					type="button"
					onClick={() => props.onCancel()}
					class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
				>
					Cancel
				</button>
			</div>
		</div>
	);
}

/** Test mode's unlock: unencrypted files have no password, so joining an open file is just a confirmation. */
function UnlockWithoutPassword(props: {
	name: string;
	busy: boolean;
	error: string | null;
	onUnlock: () => void;
	onCancel: () => void;
}) {
	return (
		<div class="w-96 rounded-lg bg-white p-6 shadow-xl">
			<h2 class="mb-2 text-lg font-semibold text-slate-800">A file is open</h2>
			<p class="mb-4 text-sm text-slate-600">"{displayName(props.name)}" is open in another session.</p>
			<Show when={props.error}>
				<p role="alert" class="mb-3 text-sm text-red-600">
					{props.error}
				</p>
			</Show>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					onClick={() => props.onCancel()}
					class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={props.busy}
					onClick={() => props.onUnlock()}
					class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					Use it here too
				</button>
			</div>
		</div>
	);
}
