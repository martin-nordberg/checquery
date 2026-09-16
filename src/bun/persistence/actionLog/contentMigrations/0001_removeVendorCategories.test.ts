import { describe, expect, it } from "bun:test";
import { removeVendorCategories } from "./0001_removeVendorCategories";
import type { LegacyAction } from "./LegacyAction";

function action(overrides: Partial<LegacyAction>): LegacyAction {
    return {
        id: "actn00000000000000000000001",
        actionType: "create-vendor",
        hlc: "0000000000000AAA",
        payload: {},
        ...overrides,
    };
}

describe("removeVendorCategories", () => {
    it("drops create-vendor-category actions entirely", () => {
        expect(removeVendorCategories(action({ actionType: "create-vendor-category", payload: { id: "x", name: "Utilities" } }))).toBeNull();
    });

    it("drops update-vendor-category actions entirely", () => {
        expect(removeVendorCategories(action({ actionType: "update-vendor-category", payload: { id: "x", name: "Rebranded" } }))).toBeNull();
    });

    it("drops delete-vendor-category actions entirely", () => {
        expect(removeVendorCategories(action({ actionType: "delete-vendor-category", payload: { id: "x" } }))).toBeNull();
    });

    it("strips ctgId from a create-vendor payload, keeping the action and its other fields", () => {
        const result = removeVendorCategories(
            action({ actionType: "create-vendor", payload: { id: "v1", name: "Acme", ctgId: "c1", isActive: true } }),
        );
        expect(result).not.toBeNull();
        expect(result!.payload).toEqual({ id: "v1", name: "Acme", isActive: true });
    });

    it("strips ctgId from an update-vendor payload", () => {
        const result = removeVendorCategories(action({ actionType: "update-vendor", payload: { id: "v1", ctgId: "c2" } }));
        expect(result!.payload).toEqual({ id: "v1" });
    });

    it("leaves a create-vendor payload with no ctgId unchanged (idempotent)", () => {
        const result = removeVendorCategories(action({ actionType: "create-vendor", payload: { id: "v1", name: "Acme" } }));
        expect(result!.payload).toEqual({ id: "v1", name: "Acme" });
    });

    it("passes every other action type through unchanged", () => {
        const original = action({ actionType: "create-account", payload: { id: "a1", name: "Checking" } });
        expect(removeVendorCategories(original)).toEqual(original);
    });

    it("preserves hlc and id on a kept action", () => {
        const original = action({ id: "actnXYZ", hlc: "00000000000FFAAA", actionType: "create-vendor", payload: { id: "v1" } });
        const result = removeVendorCategories(original);
        expect(result!.id).toBe("actnXYZ");
        expect(result!.hlc).toBe("00000000000FFAAA");
    });
});
