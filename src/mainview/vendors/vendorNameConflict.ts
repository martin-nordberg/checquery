import type { Vendor } from "../../shared/domain/vendors/Vendor";
import type { VndrId } from "../../shared/domain/vendors/VndrId";

/**
 * Checks whether `name` collides with an existing vendor -- globally, not scoped by category (per
 * vendor-categories.md: "Vendor names must be unique across all categories, not just within a parent
 * category"). A client-side pre-check, matching the existing isVendorInUse-before-delete UI-guard
 * convention, rather than a server-side or schema-level constraint.
 *
 * Comparison is case-sensitive, matching nameSchema (which doesn't normalize case). `excludeId` is the
 * vendor being renamed, if any, so renaming a vendor to the name it already has isn't flagged as a conflict
 * with itself.
 */
export function hasVendorNameConflict(vendors: readonly Vendor[], name: string, excludeId?: VndrId): boolean {
	const trimmedName = name.trim();
	return vendors.some((vendor) => vendor.id !== excludeId && (vendor.name as string) === trimmedName);
}
