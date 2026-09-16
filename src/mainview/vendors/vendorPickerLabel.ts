import type { Vendor } from "../../shared/domain/vendors/Vendor";

/**
 * A vendor's display label for pickers: just its name, with " (Inactive)" appended for inactive vendors so
 * the register's vendor picker can keep listing (and letting the user re-select) a vendor that's since been
 * deactivated, rather than silently blanking the field on an old transaction.
 */
export function vendorPickerLabel(vendor: Vendor): string {
	return vendor.isActive ? (vendor.name as string) : `${vendor.name as string} (Inactive)`;
}
