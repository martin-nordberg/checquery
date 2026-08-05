import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import VendorCategoryRow from "../../components/vendors/VendorCategoryRow";
import NewVendorRow from "../../components/vendors/NewVendorRow";
import EditableVendorRow from "../../components/vendors/EditableVendorRow";
import NewVendorCategoryRow from "../../components/vendors/NewVendorCategoryRow";
import EditableVendorCategoryRow from "../../components/vendors/EditableVendorCategoryRow";
import { vendorsClient } from "../../vendors/vendorsClient";
import { vendorCategoriesClient } from "../../vendorCategories/vendorCategoriesClient";
import { accountsClient } from "../../accounts/accountsClient";
import { filterAndSortVendors, type VendorStatusFilter } from "../../vendors/filterAndSortVendors";
import { groupVendorsByCategory } from "../../vendorCategories/groupVendorsByCategory";
import type { VndrId } from "../../../shared/domain/vendors/VndrId";
import type { VndrCtgId } from "../../../shared/domain/vendorCategories/VndrCtgId";

export default function VendorListPage() {
	const [vendors, { refetch: refetchVendors }] = createResource(() => vendorsClient.findVendorsAll());
	const [categories, { refetch: refetchCategories }] = createResource(() => vendorCategoriesClient.findVendorCategoriesAll());
	const [accounts] = createResource(() => accountsClient.findAccountsAll());
	const refetchAll = () => Promise.all([refetchVendors(), refetchCategories()]);

	const [statusFilter, setStatusFilter] = createSignal<VendorStatusFilter>("active");
	const groups = createMemo(() =>
		groupVendorsByCategory(categories() ?? [], filterAndSortVendors(vendors() ?? [], statusFilter())),
	);

	const [addingCategory, setAddingCategory] = createSignal(false);
	const [addingVendorForCtgId, setAddingVendorForCtgId] = createSignal<VndrCtgId | null>(null);
	const [editingCategoryId, setEditingCategoryId] = createSignal<VndrCtgId | null>(null);
	const [editingVendorId, setEditingVendorId] = createSignal<VndrId | null>(null);

	const editingCategory = createMemo(() => (categories() ?? []).find((c) => c.id === editingCategoryId()));
	const editingVendor = createMemo(() => (vendors() ?? []).find((v) => v.id === editingVendorId()));

	const onAdded = () => {
		setAddingCategory(false);
		setAddingVendorForCtgId(null);
		void refetchAll();
	};
	const onEdited = () => {
		setEditingCategoryId(null);
		setEditingVendorId(null);
		void refetchAll();
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

				{/* All four are modals (fixed overlays), rendered once here rather than per-row, matching
				    AccountListPage's approach. */}
				<Show when={addingCategory()}>
					<NewVendorCategoryRow
						categories={categories() ?? []}
						onAdded={onAdded}
						onCancel={() => setAddingCategory(false)}
					/>
				</Show>
				<Show when={addingVendorForCtgId()}>
					{(ctgId) => (
						<NewVendorRow
							ctgId={ctgId()}
							categories={categories() ?? []}
							vendors={vendors() ?? []}
							accounts={accounts() ?? []}
							onAdded={onAdded}
							onCancel={() => setAddingVendorForCtgId(null)}
						/>
					)}
				</Show>
				<Show when={editingCategory()}>
					{(category) => (
						<EditableVendorCategoryRow
							category={category()}
							categories={categories() ?? []}
							onEdited={onEdited}
							onCancel={() => setEditingCategoryId(null)}
						/>
					)}
				</Show>
				<Show when={editingVendor()}>
					{(vendor) => (
						<EditableVendorRow
							vendor={vendor()}
							categories={categories() ?? []}
							vendors={vendors() ?? []}
							accounts={accounts() ?? []}
							onEdited={onEdited}
							onCancel={() => setEditingVendorId(null)}
						/>
					)}
				</Show>

				<Show when={!vendors.loading && !categories.loading} fallback={<p class="text-slate-500">Loading…</p>}>
					<div class="flex-1 overflow-auto rounded-lg bg-white shadow-lg">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="sticky top-0 z-10 bg-blue-100">
								<tr>
									<th class="w-10 px-2 py-3 text-center">
										<button
											type="button"
											class="rounded p-1 text-green-600 hover:bg-gray-200 hover:text-green-800"
											onClick={() => setAddingCategory(true)}
											aria-label="Add Vendor Category"
											title="Add category"
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
									<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
										Add
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
								<For each={groups()}>
									{(group) => (
										<VendorCategoryRow
											group={group}
											accounts={accounts() ?? []}
											onEditCategory={() => setEditingCategoryId(group.category.id)}
											onAddVendor={() => setAddingVendorForCtgId(group.category.id)}
											onEditVendor={(id) => setEditingVendorId(id)}
										/>
									)}
								</For>
							</tbody>
						</table>
						<Show when={groups().length === 0}>
							<p class="p-4 text-center text-gray-500">
								No vendor categories yet. Add one to get started.
							</p>
						</Show>
					</div>
				</Show>
			</main>
		</>
	);
}
