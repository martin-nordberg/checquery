import { Show } from "solid-js";
import { errorAlert, setErrorAlert } from "./rpc";

export default function ErrorAlertModal() {
	const close = () => setErrorAlert(null);

	return (
		<Show when={errorAlert()}>
			{(alert) => (
				<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div class="w-96 rounded-lg bg-white p-6 shadow-xl">
						<h2 class="mb-2 text-lg font-semibold text-slate-800">
							{alert().title}
						</h2>
						<p class="mb-4 whitespace-pre-wrap text-sm text-slate-600">
							{alert().message}
						</p>
						<div class="flex justify-end">
							<button
								type="button"
								onClick={close}
								class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
							>
								OK
							</button>
						</div>
					</div>
				</div>
			)}
		</Show>
	);
}
