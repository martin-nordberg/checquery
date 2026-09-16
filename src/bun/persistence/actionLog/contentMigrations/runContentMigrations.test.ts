import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { applyContentMigrations, CURRENT_CONTENT_VERSION, readContentVersion } from "./runContentMigrations";
import { setMetaValue } from "../meta";
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

describe("applyContentMigrations", () => {
    it("drops a vendor-category action via the registered transform chain", () => {
        expect(applyContentMigrations(action({ actionType: "create-vendor-category" }))).toBeNull();
    });

    it("strips ctgId from a vendor action via the registered transform chain", () => {
        const result = applyContentMigrations(action({ actionType: "create-vendor", payload: { id: "v1", ctgId: "c1" } }));
        expect(result!.payload).toEqual({ id: "v1" });
    });

    it("passes an unrelated action through unchanged", () => {
        const original = action({ actionType: "create-origin", payload: { id: "o1", name: "Jane" } });
        expect(applyContentMigrations(original)).toEqual(original);
    });
});

describe("readContentVersion", () => {
    it("defaults to 1 when the key is absent (a file predating the concept)", () => {
        const db = new Database(":memory:");
        db.run(`CREATE TABLE _checquery_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
        expect(readContentVersion(db)).toBe(1);
    });

    it("reads back a stored value", () => {
        const db = new Database(":memory:");
        db.run(`CREATE TABLE _checquery_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
        setMetaValue(db, "content_version", String(CURRENT_CONTENT_VERSION));
        expect(readContentVersion(db)).toBe(CURRENT_CONTENT_VERSION);
    });
});
