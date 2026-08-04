import type { VendorCategory } from "../../shared/domain/vendorCategories/VendorCategory";
import type { VndrCtgId } from "../../shared/domain/vendorCategories/VndrCtgId";

/**
 * Checks whether `name` collides with an existing vendor category -- globally, since categories are flat
 * (per vendor-categories.md: "Vendor category names must be unique"). Independent of
 * `hasVendorNameConflict`: a vendor and a category may share a name, since the doc never says they share a
 * namespace with each other.
 *
 * Comparison is case-sensitive, matching nameSchema. `excludeId` is the category being renamed, if any.
 */
export function hasVendorCategoryNameConflict(
	categories: readonly VendorCategory[],
	name: string,
	excludeId?: VndrCtgId,
): boolean {
	const trimmedName = name.trim();
	return categories.some((category) => category.id !== excludeId && (category.name as string) === trimmedName);
}
