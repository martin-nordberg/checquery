import type { Vendor } from "../../shared/domain/vendors/Vendor";

export type VendorStatusFilter = "active" | "inactive" | "both";

/** Filters vendors by the selected status radio, then sorts alphabetically by name. */
export function filterAndSortVendors(vendors: Vendor[], statusFilter: VendorStatusFilter): Vendor[] {
	return vendors
		.filter((vendor) => {
			if (statusFilter === "active") return vendor.isActive;
			if (statusFilter === "inactive") return !vendor.isActive;
			return true;
		})
		.sort((a, b) => (a.name as string).localeCompare(b.name as string));
}
