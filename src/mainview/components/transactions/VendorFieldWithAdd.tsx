import { createMemo, createSignal, Show } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import VendorPicker from "../vendors/VendorPicker";
import NewVendorRow from "../vendors/NewVendorRow";

type VendorFieldWithAddProps = {
	vendors: Vendor[];
	vendorCategories: VendorCategory[];
	accounts: Account[];
	value: string;
	onChange: (vndrId: string) => void;
	/** Solid's createResource refetch, passed straight through from TransactionLog -- used to find and
	 * auto-select a freshly-created vendor by its (globally unique) name after refetching. */
	refetchVendors: (info?: unknown) => Vendor[] | Promise<Vendor[] | undefined> | null | undefined;
};

/**
 * A vendor picker plus a "+" icon that opens NewVendorRow to create-and-select a vendor inline, shared by
 * NewTransactionRow and EditableTransactionRow (see transactions-register-implementation-plan.md §0). Only
 * one register row is ever active at a time, so this modal is rendered locally here rather than lifted to
 * TransactionLog the way the account tree lifts its create/edit modals.
 */
export default function VendorFieldWithAdd(props: VendorFieldWithAddProps) {
	const [addingVendor, setAddingVendor] = createSignal(false);

	const firstCategory = createMemo(() =>
		props.vendorCategories.slice().sort((a, b) => (a.name as string).localeCompare(b.name as string))[0],
	);

	const handleAdded = async (name: string) => {
		const updated = (await props.refetchVendors()) ?? props.vendors;
		setAddingVendor(false);
		const created = updated.find((vendor) => (vendor.name as string) === name);
		if (created) props.onChange(created.id);
	};

	return (
		<div class="flex items-end gap-1">
			<label class="flex flex-1 flex-col gap-1 text-xs font-medium text-gray-500">
				Vendor
				<VendorPicker vendors={props.vendors} categories={props.vendorCategories} value={props.value} onChange={props.onChange} />
			</label>
			<button
				type="button"
				class="rounded p-1.5 text-green-600 hover:bg-gray-200 disabled:opacity-50"
				disabled={!firstCategory()}
				title={firstCategory() ? "Add a new vendor" : "Create a vendor category first"}
				aria-label="Add a new vendor"
				onClick={() => setAddingVendor(true)}
			>
				+
			</button>
			<Show when={addingVendor() && firstCategory()}>
				{(category) => (
					<NewVendorRow
						ctgId={category().id}
						categories={props.vendorCategories}
						vendors={props.vendors}
						accounts={props.accounts}
						onAdded={(name) => void handleAdded(name)}
						onCancel={() => setAddingVendor(false)}
					/>
				)}
			</Show>
		</div>
	);
}
