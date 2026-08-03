import { Show } from "solid-js";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { Account } from "../../../shared/domain/accounts/Account";
import { defaultAccountName } from "../../vendors/defaultAccountName";

type VendorRowProps = {
	vendor: Vendor;
	accounts: Account[];
	onEdit: () => void;
};

/** One flat vendor row -- no recursion, no context, unlike AccountTreeRow. */
export default function VendorRow(props: VendorRowProps) {
	return (
		<tr class="hover:bg-gray-50">
			<td class="px-2 py-2 text-center">
				<button
					type="button"
					class="rounded p-1 text-blue-600 hover:bg-gray-200 hover:text-blue-800"
					onClick={props.onEdit}
					aria-label={`Edit ${props.vendor.name}`}
					title="Edit vendor"
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
			<td class="px-4 py-2 text-sm text-gray-900">{props.vendor.name}</td>
			<td class="px-4 py-2 text-sm text-gray-500">
				{defaultAccountName(props.accounts, props.vendor.defaultAcctId)}
			</td>
			<td class="px-4 py-2 text-sm text-gray-500">{props.vendor.description}</td>
			<td class="px-4 py-2 text-sm">
				<Show when={props.vendor.isActive} fallback={<span class="text-gray-400">Inactive</span>}>
					<span class="text-green-600">Active</span>
				</Show>
			</td>
		</tr>
	);
}
