// TEMPORARY SCAFFOLDING -- see LegacyAction.ts. Delete along with the rest of contentMigrations/ once every
// real file has been confirmed upgraded (Phase 2 of remove-vendor-categories-implementation-plan.md).

import type { LegacyAction } from "./LegacyAction";

/**
 * Drops every vendor-category action outright, and strips the `ctgId` field a vendor's create/update actions
 * used to carry. Deliberately has no import of any vendor-category or Vendor domain type -- it operates on
 * raw decoded actions, so it keeps working regardless of what the current domain schemas look like.
 *
 * Idempotent by construction (safe to re-apply to already-migrated data): a vendor-category action type
 * never recurs once dropped, and stripping a `ctgId` key that's already absent is a no-op. This matters
 * because runContentMigrations.ts always applies every registered transform, not just the ones "between" a
 * file's specific starting version and the current one -- see its own comment for why.
 */
export function removeVendorCategories(action: LegacyAction): LegacyAction | null {
    if (
        action.actionType === "create-vendor-category" ||
        action.actionType === "update-vendor-category" ||
        action.actionType === "delete-vendor-category"
    ) {
        return null;
    }

    if (action.actionType === "create-vendor" || action.actionType === "update-vendor") {
        const { ctgId: _ctgId, ...rest } = action.payload as Record<string, unknown>;
        return { ...action, payload: rest };
    }

    return action;
}
