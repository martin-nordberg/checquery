import { For, Show } from "solid-js";
import { fileInfo, setFileInfo } from "./rpc";

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function FileInfoModal() {
	const close = () => setFileInfo(null);

	return (
		<Show when={fileInfo()}>
			{(info) => (
				<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div class="flex max-h-[85vh] w-[32rem] flex-col rounded-lg bg-white p-6 shadow-xl">
						<h2 class="mb-1 text-lg font-semibold text-slate-800">
							{info().name}
						</h2>
						<p class="mb-4 truncate text-xs text-slate-500">{info().path}</p>

						<div class="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
							<span class="text-slate-500">Size</span>
							<span>{formatBytes(info().sizeBytes)}</span>
							<span class="text-slate-500">Last modified</span>
							<span>{new Date(info().lastModifiedIso).toLocaleString()}</span>
							<span class="text-slate-500">Action log entries</span>
							<span>{info().actionLogEntryCount}</span>
						</div>

						<h3 class="mb-1 text-sm font-semibold text-slate-800">
							Entity counts
						</h3>
						<table class="mb-4 w-full text-sm text-slate-700">
							<tbody>
								<tr>
									<td class="text-slate-500">Origins</td>
									<td class="text-right">{info().entityCounts.origins}</td>
								</tr>
								<tr>
									<td class="text-slate-500">Accounts</td>
									<td class="text-right">{info().entityCounts.accounts}</td>
								</tr>
								<tr>
									<td class="text-slate-500">Account Categories</td>
									<td class="text-right">{info().entityCounts.accountCategories}</td>
								</tr>
								<tr>
									<td class="text-slate-500">Vendors</td>
									<td class="text-right">{info().entityCounts.vendors}</td>
								</tr>
								<tr>
									<td class="text-slate-500">Transactions</td>
									<td class="text-right">{info().entityCounts.transactions}</td>
								</tr>
								<tr>
									<td class="text-slate-500">Balance Assertions</td>
									<td class="text-right">
										{info().entityCounts.balanceAssertions}
									</td>
								</tr>
							</tbody>
						</table>

						<h3 class="mb-1 text-sm font-semibold text-slate-800">
							File metadata
						</h3>
						<div class="mb-4 flex-1 overflow-y-auto rounded border border-slate-200">
							<table class="w-full text-xs text-slate-700">
								<tbody>
									<For each={info().meta}>
										{(entry) => (
											<tr class="border-b border-slate-100 last:border-0">
												<td class="w-1/3 truncate p-1.5 align-top text-slate-500">
													{entry.key}
												</td>
												<td class="break-all p-1.5 align-top">{entry.value}</td>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</div>

						<div class="flex justify-end">
							<button
								type="button"
								onClick={close}
								class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</Show>
	);
}
