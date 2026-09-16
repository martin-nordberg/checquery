// TEMPORARY SCAFFOLDING -- see LegacyAction.ts. Delete along with the rest of contentMigrations/ once every
// real file has been confirmed upgraded (Phase 2 of remove-vendor-categories-implementation-plan.md).

import { Database } from "bun:sqlite";
import { existsSync, renameSync, rmSync } from "node:fs";
import { ActionLog } from "../ActionLog";
import type { PayloadCodec } from "../encryption/PayloadCodec";
import { getMetaValue, setMetaValue } from "../meta";
import { runMigrations } from "../migrations/runMigrations";
import type { ActionType } from "../../../../shared/domain/actions/ActionType";
import type { HLClock } from "../../../../shared/domain/core/HybridLogicalClock";
import { applyContentMigrations, CURRENT_CONTENT_VERSION } from "./runContentMigrations";

/** Per-file identity/crypto meta keys copied verbatim from the old file into the rewritten one -- same
 * password, same HLC node, same file identity; only the action history and the version markers change. */
const metaKeysToCopy = [
    "file_id",
    "created_at",
    "node_id",
    "encrypted",
    "kdf_salt",
    "kdf_params",
    "verify_iv",
    "verify_ciphertext",
] as const;

export type UpgradeResult = { ok: true; db: Database } | { ok: false; error: string };

/**
 * Rewrites `path`'s ActionLog to drop vendor-category actions and ctgId fields (see
 * tasks/done/remove-vendor-categories-implementation-plan.md §2), leaving the original untouched at
 * `<path>-v<fromVersion>` as a backup. Build-then-swap, not rename-then-build: nothing at `path` is touched
 * until a fully verified replacement already exists at a temp path.
 *
 * `db` must already be past password verification (so `codec` is a working key), still open, and on the
 * current DDL schema (0002_actions.ts) -- exactly the state `openExistingFile` is in right before it would
 * otherwise construct the live ActionLog.
 *
 * **Handle contract**: this function always closes the `db` handle it's given, on every exit path, success or
 * failure alike -- the caller must not use or close it again afterward. On success, the returned `db` is a
 * fresh handle on the (now-upgraded) file at the original `path`. On failure, `path` itself is left completely
 * untouched on disk (only the now-closed in-process handle is gone).
 */
export async function upgradeFileContent(
    path: string,
    db: Database,
    codec: PayloadCodec,
    nodeId: string,
    fromVersion: number,
): Promise<UpgradeResult> {
    const backupPath = `${path}-v${fromVersion}`;
    if (existsSync(backupPath)) {
        db.close();
        return {
            ok: false,
            error:
                `A previous upgrade attempt already left a backup at:\n${backupPath}\n` +
                `Move or delete it before reopening this file.`,
        };
    }

    const tempPath = `${path}.upgrading-tmp`;
    if (existsSync(tempPath)) rmSync(tempPath); // leftover from a prior failed attempt -- disposable, not a backup

    let tempDb: Database | undefined;
    let dbClosed = false;
    try {
        tempDb = new Database(tempPath, { create: true });
        runMigrations(tempDb); // current DDL: no vendor-category CHECK values, no vendor_category_actions table

        for (const key of metaKeysToCopy) {
            const value = getMetaValue(db, key);
            if (value !== null) setMetaValue(tempDb, key, value);
        }
        setMetaValue(tempDb, "content_version", String(CURRENT_CONTENT_VERSION));

        const sourceLog = new ActionLog(db, codec, nodeId);
        const destLog = new ActionLog(tempDb, codec, nodeId);

        let keptCount = 0;
        for (const sourceAction of sourceLog.readActions()) {
            const kept = applyContentMigrations(sourceAction);
            if (kept === null) continue;
            keptCount++;
            await destLog.appendAction(kept.actionType as ActionType, kept.payload as { id: string; hlc?: HLClock });
        }

        tempDb.close();
        tempDb = undefined;

        // Verify before touching the original: reopen the rewritten file fresh and confirm every row present
        // decrypts and decodes cleanly, and that the count matches what was actually written.
        const verifyDb = new Database(tempPath, { create: false, readwrite: true });
        let verifiedCount = 0;
        try {
            const verifyLog = new ActionLog(verifyDb, codec, nodeId);
            for (const _ of verifyLog.readActions()) verifiedCount++;
        } finally {
            verifyDb.close();
        }
        if (verifiedCount !== keptCount) {
            rmSync(tempPath);
            db.close();
            dbClosed = true;
            return {
                ok: false,
                error: `Upgrade verification failed: expected ${keptCount} actions in the rewritten file, found ${verifiedCount}.`,
            };
        }

        // Only now touch the original. A crash between these two renames is the one residual risk this
        // design accepts: the original would be safely at backupPath with the verified replacement sitting
        // at tempPath, recoverable by hand, but not automatically -- acceptable for a single-user local file.
        db.close();
        dbClosed = true;
        renameSync(path, backupPath);
        renameSync(tempPath, path);

        return { ok: true, db: new Database(path, { create: false, readwrite: true }) };
    } catch (err) {
        tempDb?.close();
        try {
            if (existsSync(tempPath)) rmSync(tempPath);
        } catch {
            // best-effort cleanup only
        }
        if (!dbClosed) db.close();
        return { ok: false, error: `Failed to upgrade file:\n${(err as Error).message}` };
    }
}
