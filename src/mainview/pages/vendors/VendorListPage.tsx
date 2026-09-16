import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import NewVendorRow from "../../components/vendors/NewVendorRow";
import EditableVendorRow from "../../components/vendors/EditableVendorRow";
import VendorRow from "../../components/vendors/VendorRow";
import { vendorsClient } from "../../vendors/vendorsClient";
import { accountsClient } from "../../accounts/accountsClient";
import { filterAndSortVendors, type VendorStatusFilter } from "../../vendors/filterAndSortVendors";
import type { VndrId } from "../../../shared/domain/vendors/VndrId";

export default function VendorListPage() {
	const [vendors, { refetch: refetchVendors }] = createResource(() => vendorsClient.findVendorsAll());
	const [accounts] = createResource(() => accountsClient.findAccountsAll());

	const [statusFilter, setStatusFilter] = createSignal<VendorStatusFilter>("active");
	const filteredVendors = createMemo(() => filterAndSortVendors(vendors() ?? [], statusFilter()));

	const [addingVendor, setAddingVendor] = createSignal(false);
	const [editingVendorId, setEditingVendorId] = createSignal<VndrId | null>(null);

	const editingVendor = createMemo(() => (vendors() ?? []).find((v) => v.id === editingVendorId()));

	const onAdded = () => {
		setAddingVendor(false);
		void refetchVendors();
	};
	const onEdited = () => {
		setEditingVendorId(null);
		void refetchVendors();
	};

	return (
		<>
			<div class="flex items-center justify-between pr-4">
				<TopNav>
					<FileBreadcrumb />
					<Breadcrumb>Vendors</Breadcrumb>
				</TopNav>
				<div class="flex items-center gap-3">
					<label class="flex cursor-pointer items-center gap-1">
						<input
							type="radio"
							name="statusFilter"
							checked={statusFilter() === "active"}
							onChange={() => setStatusFilter("active")}
						/>
						<span class="text-sm">Active</span>
					</label>
					<label class="flex cursor-pointer items-center gap-1">
						<input
							type="radio"
							name="statusFilter"
							checked={statusFilter() === "inactive"}
							onChange={() => setStatusFilter("inactive")}
						/>
						<span class="text-sm">Inactive</span>
					</label>
					<label class="flex cursor-pointer items-center gap-1">
						<input
							type="radio"
							name="statusFilter"
							checked={statusFilter() === "both"}
							onChange={() => setStatusFilter("both")}
						/>
						<span class="text-sm">Both</span>
					</label>
				</div>
			</div>
			<main class="p-4">
				<h1 class="mb-4 text-lg font-semibold text-slate-700">Vendors</h1>

				<Show when={addingVendor()}>
					<NewVendorRow
						vendors={vendors() ?? []}
						accounts={accounts() ?? []}
						onAdded={onAdded}
						onCancel={() => setAddingVendor(false)}
					/>
				</Show>
				<Show when={editingVendor()}>
					{(vendor) => (
						<EditableVendorRow
							vendor={vendor()}
							vendors={vendors() ?? []}
							accounts={accounts() ?? []}
							onEdited={onEdited}
							onCancel={() => setEditingVendorId(null)}
						/>
					)}
				</Show>

				<Show when={!vendors.loading} fallback={<p class="text-slate-500">Loading…</p>}>
					<div class="flex-1 overflow-auto rounded-lg bg-white shadow-lg">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="sticky top-0 z-10 bg-blue-100">
								<tr>
									<th class="w-10 px-2 py-3 text-center">
										<button
											type="button"
											class="rounded p-1 text-green-600 hover:bg-gray-200 hover:text-green-800"
											onClick={() => setAddingVendor(true)}
											aria-label="Add Vendor"
											title="Add vendor"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 4v16m8-8H4"
												/>
											</svg>
										</button>
									</th>
									<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
										Name
									</th>
									<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
										Default Account
									</th>
									<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
										Description
									</th>
									<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
										Status
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
								<For each={filteredVendors()}>
									{(vendor) => (
										<VendorRow
											vendor={vendor}
											accounts={accounts() ?? []}
											onEdit={() => setEditingVendorId(vendor.id)}
										/>
									)}
								</For>
							</tbody>
						</table>
						<Show when={filteredVendors().length === 0}>
							<p class="p-4 text-center text-gray-500">No vendors yet. Add one to get started.</p>
						</Show>
					</div>
				</Show>
			</main>
		</>
	);
}
