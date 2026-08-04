import { createMemo } from "solid-js";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import { vendorPickerLabel } from "../../vendors/vendorPickerLabel";
import AccountPicker from "../accounts/AccountPicker";

type VendorPickerProps = {
	vendors: Vendor[];
	categories: VendorCategory[];
	value: string;
	onChange: (id: string) => void;
};

/**
 * Picks a vendor for a transaction, labeled `"<Category> : <Name>"` (` (Inactive)` appended for inactive
 * ones) per transactions-register-implementation-plan.md §0/§2c. Lists every vendor regardless of status --
 * unlike the Vendor List page's Active/Inactive/Both filter, a register must stay able to display and
 * re-edit old transactions against a vendor that's since been deactivated.
 */
export default function VendorPicker(props: VendorPickerProps) {
	const options = createMemo(() => [
		{ id: "", label: "(none)" },
		...props.vendors
			.map((vendor) => ({ id: vendor.id as string, label: vendorPickerLabel(vendor, props.categories) }))
			.sort((a, b) => a.label.localeCompare(b.label)),
	]);

	return <AccountPicker options={options()} value={props.value} onChange={props.onChange} />;
}
