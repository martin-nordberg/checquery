import type { Vendor } from "../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../shared/domain/vendorCategories/VendorCategory";

/**
 * "<Category name> : <Vendor name>", with " (Inactive)" appended for inactive vendors so the register's
 * vendor picker can keep listing (and letting the user re-select) a vendor that's since been deactivated,
 * rather than silently blanking the field on an old transaction. A missing category (shouldn't happen --
 * ctgId is required) falls back to just the vendor name.
 */
export function vendorPickerLabel(vendor: Vendor, categories: readonly VendorCategory[]): string {
	const category = categories.find((category) => category.id === vendor.ctgId);
	const base = category ? `${category.name} : ${vendor.name}` : (vendor.name as string);
	return vendor.isActive ? base : `${base} (Inactive)`;
}
