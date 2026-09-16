import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AesGcmCodec } from "../encryption/AesGcmCodec";
import { generateFileCryptoMaterial, verifyPassword, type KdfParams } from "../encryption/crypto";
import { getMetaValue, setMetaValue } from "../meta";
import { readContentVersion } from "./runContentMigrations";
import { upgradeFileContent } from "./upgradeFileContent";

/**
 * Builds a database matching the pre-removal action-log DDL shape by hand (raw SQL, not runMigrations, which
 * always produces the *current* schema) -- exactly what a real pre-existing .checquery file looked like
 * before vendor categories were removed. Deliberately doesn't create any of the per-entity lookup tables
 * (vendor_actions, vendor_category_actions, etc.) -- upgradeFileContent only ever reads the `actions` table
 * itself via readActions(), never the lookup tables, so they're irrelevant to this test.
 */
function buildOldShapeDb(path: string): Database {
    const db = new Database(path, { create: true });
    db.run(`CREATE TABLE _checquery_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    db.run(`
        CREATE TABLE actions (
            id                TEXT PRIMARY KEY,
            action_type       TEXT NOT NULL CHECK (action_type IN (
                'create-vendor', 'update-vendor', 'delete-vendor',
                'create-vendor-category', 'update-vendor-category', 'delete-vendor-category',
                'create-origin'
            )),
            hlc               TEXT NOT NULL,
            iv                TEXT NOT NULL,
            encrypted_payload TEXT NOT NULL
        )
    `);
    db.run(`CREATE UNIQUE INDEX actions_hlc_idx ON actions (hlc)`);
    setMetaValue(db, "schema_version", "2");
    return db;
}

let hlcCounter = 0;
function nextHlc(): string {
    hlcCounter++;
    return hlcCounter.toString(16).padStart(13, "0").toUpperCase() + "AAA";
}

/** Inserts one raw action row, encrypting its payload with the given codec -- standing in for what
 * ActionLog.appendAction would have done on the old (pre-removal) code path. */
function insertAction(db: Database, codec: AesGcmCodec, actnId: string, actionType: string, payload: object): string {
    const hlc = nextHlc();
    const fullPayload = { ...payload, hlc };
    const { iv, payload: encryptedPayload } = codec.encode(JSON.stringify(fullPayload));
    db.run(`INSERT INTO actions (id, action_type, hlc, iv, encrypted_payload) VALUES (?, ?, ?, ?, ?)`, [
        actnId,
        actionType,
        hlc,
        iv,
        encryptedPayload,
    ]);
    return hlc;
}

describe("upgradeFileContent", () => {
    it("rewrites an old-shape file, dropping vendor-category actions and stripping ctgId, and backs up the original", async () => {
        const dir = mkdtempSync(join(tmpdir(), "checquery-upgrade-test-"));
        const path = join(dir, "test.checquery");
        try {
            const password = "correct horse battery staple";
            const { material, key } = generateFileCryptoMaterial(password);
            const codec = new AesGcmCodec(key);
            const nodeId = "AAA";

            let db = buildOldShapeDb(path);
            setMetaValue(db, "file_id", "file123");
            setMetaValue(db, "created_at", "2024-01-01T00:00:00.000Z");
            setMetaValue(db, "node_id", nodeId);
            setMetaValue(db, "encrypted", "true");
            setMetaValue(db, "kdf_salt", material.kdfSalt);
            setMetaValue(db, "kdf_params", JSON.stringify(material.kdfParams));
            setMetaValue(db, "verify_iv", material.verifyIv);
            setMetaValue(db, "verify_ciphertext", material.verifyCiphertext);
            // content_version deliberately absent -- simulates a file that predates the concept (implicit v1).

            insertAction(db, codec, "actn001", "create-vendor-category", { id: "ctg1", name: "Utilities" });
            insertAction(db, codec, "actn002", "create-vendor-category", { id: "ctg2", name: "Groceries" });
            insertAction(db, codec, "actn003", "create-vendor", { id: "v1", name: "Acme", ctgId: "ctg1", isActive: true });
            insertAction(db, codec, "actn004", "update-vendor", { id: "v1", ctgId: "ctg2" });
            insertAction(db, codec, "actn005", "delete-vendor-category", { id: "ctg1" });
            insertAction(db, codec, "actn006", "create-origin", { id: "o1", name: "Jane", ipAddress: "1.2.3.4" });

            const result = await upgradeFileContent(path, db, codec, nodeId, 1);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            db = result.db;

            // Original preserved as a backup, byte-identical in row count to what was written.
            const backupPath = `${path}-v1`;
            expect(existsSync(backupPath)).toBe(true);
            const backupDb = new Database(backupPath, { create: false, readwrite: true });
            const backupCount = backupDb.query(`SELECT COUNT(*) as n FROM actions`).get() as { n: number };
            expect(backupCount.n).toBe(6);
            backupDb.close();

            // The live path now holds the rewritten file: 3 surviving actions (the two vendor-category creates
            // and the vendor-category delete are dropped), current content_version, identity/crypto meta
            // preserved verbatim.
            const liveCount = db.query(`SELECT COUNT(*) as n FROM actions`).get() as { n: number };
            expect(liveCount.n).toBe(3);
            expect(readContentVersion(db)).toBeGreaterThan(1);
            expect(getMetaValue(db, "file_id")).toBe("file123");
            expect(getMetaValue(db, "node_id")).toBe(nodeId);

            const rows = db.query(`SELECT action_type, iv, encrypted_payload FROM actions ORDER BY hlc ASC`).all() as Array<{
                action_type: string;
                iv: string;
                encrypted_payload: string;
            }>;
            expect(rows.map((r) => r.action_type)).toEqual(["create-vendor", "update-vendor", "create-origin"]);
            for (const row of rows) {
                expect(row.action_type).not.toContain("vendor-category");
                const decoded = JSON.parse(codec.decode(row.iv, row.encrypted_payload)) as Record<string, unknown>;
                expect(decoded.ctgId).toBeUndefined();
            }

            // The password still works against the rewritten file's (copied) crypto material.
            const kdfSalt = getMetaValue(db, "kdf_salt")!;
            const kdfParams = JSON.parse(getMetaValue(db, "kdf_params")!) as KdfParams;
            const verifyIv = getMetaValue(db, "verify_iv")!;
            const verifyCiphertext = getMetaValue(db, "verify_ciphertext")!;
            expect(verifyPassword(password, { kdfSalt, kdfParams, verifyIv, verifyCiphertext })).not.toBeNull();

            db.close();
        } finally {
            try { rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
        }
    });

    it("refuses to overwrite an existing backup rather than silently clobbering it", async () => {
        const dir = mkdtempSync(join(tmpdir(), "checquery-upgrade-test-"));
        const path = join(dir, "test.checquery");
        try {
            const { key } = generateFileCryptoMaterial("pw");
            const codec = new AesGcmCodec(key);
            const nodeId = "AAA";

            const db = buildOldShapeDb(path);
            insertAction(db, codec, "actn001", "create-origin", { id: "o1", name: "Jane", ipAddress: "1.2.3.4" });

            // Simulate a previous, partially-completed upgrade attempt having already left a backup behind.
            const backupPath = `${path}-v1`;
            new Database(backupPath, { create: true }).close();

            const result = await upgradeFileContent(path, db, codec, nodeId, 1);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(result.error).toContain(backupPath);

            // Original left completely untouched on disk (upgradeFileContent closes the handle it was given
            // on every exit path, per its documented contract -- reopen fresh to inspect what's actually there).
            expect(existsSync(path)).toBe(true);
            const reopened = new Database(path, { create: false, readwrite: true });
            const stillCount = reopened.query(`SELECT COUNT(*) as n FROM actions`).get() as { n: number };
            expect(stillCount.n).toBe(1);
            reopened.close();
        } finally {
            try { rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
        }
    });
});
