import { createSignal, For, Show } from "solid-js";
import type { VendorCategoryGroup } from "../../vendorCategories/groupVendorsByCategory";
import type { VndrId } from "../../../shared/domain/vendors/VndrId";
import type { Account } from "../../../shared/domain/accounts/Account";
import VendorRow from "./VendorRow";

type VendorCategoryRowProps = {
	group: VendorCategoryGroup;
	accounts: Account[];
	onEditCategory: () => void;
	onAddVendor: () => void;
	onEditVendor: (id: VndrId) => void;
};

/**
 * One category row (branch) followed, when expanded, by its vendor rows (always leaves). Unlike
 * AccountTreeRow, there's only ever one add-link here -- "+ Add vendor" -- since vendor categories never
 * nest (see documentation/vendor-categories-implementation-plan.md §7); there's no "+ Add category" on a
 * category row at all, only at the page header.
 */
export default function VendorCategoryRow(props: VendorCategoryRowProps) {
	const [expanded, setExpanded] = createSignal(true);
	const hasVendors = () => props.group.vendors.length > 0;

	return (
		<>
			<tr class="group hover:bg-gray-50">
				<td class="px-2 py-2 text-center">
					<button
						type="button"
						class="rounded p-1 text-blue-600 hover:bg-gray-200 hover:text-blue-800"
						onClick={props.onEditCategory}
						aria-label={`Edit ${props.group.category.name}`}
						title="Edit category"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
							/>
						</svg>
					</button>
				</td>
				<td class="px-4 py-2 text-sm text-gray-900">
					<div class="flex items-center gap-2">
						<button
							type="button"
							class="w-4 shrink-0 text-slate-400 hover:text-slate-600"
							classList={{ invisible: !hasVendors() }}
							disabled={!hasVendors()}
							onClick={() => setExpanded((v) => !v)}
							aria-label={expanded() ? "Collapse" : "Expand"}
						>
							{expanded() ? "▾" : "▸"}
						</button>
						<span class="font-semibold text-slate-700">{props.group.category.name}</span>
					</div>
				</td>
				<td class="px-4 py-2 text-sm" />
				<td class="px-4 py-2 text-sm text-gray-500">{props.group.category.description}</td>
				<td class="px-4 py-2 text-sm" />
				<td class="px-4 py-2 text-sm">
					<button
						type="button"
						class="text-xs text-blue-600 opacity-0 hover:underline group-hover:opacity-100"
						onClick={props.onAddVendor}
					>
						+ Add vendor
					</button>
				</td>
			</tr>
			<Show when={hasVendors() && expanded()}>
				<For each={props.group.vendors}>
					{(vendor) => <VendorRow vendor={vendor} accounts={props.accounts} onEdit={() => props.onEditVendor(vendor.id)} />}
				</For>
			</Show>
		</>
	);
}
