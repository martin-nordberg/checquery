import type { Vendor } from "../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../shared/domain/vendorCategories/VendorCategory";

export type VendorCategoryGroup = { category: VendorCategory; vendors: Vendor[] };

/**
 * Groups vendors under their category, sorted alphabetically by name -- both categories among themselves,
 * and vendors within each group. Deliberately not a tree: vendor categories never nest (see
 * documentation/vendor-categories-implementation-plan.md §6), so there is exactly one level, always, and a
 * plain grouping function is all that's needed -- no recursive node type, no descendants/cycle-prevention
 * helper (a category can't reference another category at all, so a cycle is structurally impossible).
 *
 * A category with zero vendors still produces a group with an empty `vendors` array -- categories always
 * render in the UI regardless of how many (if any) vendors currently belong to them.
 */
export function groupVendorsByCategory(
	categories: readonly VendorCategory[],
	vendors: readonly Vendor[],
): VendorCategoryGroup[] {
	const vendorsByCtgId = new Map<string, Vendor[]>();
	for (const vendor of vendors) {
		const siblings = vendorsByCtgId.get(vendor.ctgId);
		if (siblings) {
			siblings.push(vendor);
		} else {
			vendorsByCtgId.set(vendor.ctgId, [vendor]);
		}
	}

	return categories
		.slice()
		.sort((a, b) => (a.name as string).localeCompare(b.name as string))
		.map((category) => ({
			category,
			vendors: (vendorsByCtgId.get(category.id) ?? [])
				.slice()
				.sort((a, b) => (a.name as string).localeCompare(b.name as string)),
		}));
}
