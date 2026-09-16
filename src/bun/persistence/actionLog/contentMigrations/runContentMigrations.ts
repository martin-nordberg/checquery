// TEMPORARY SCAFFOLDING -- see LegacyAction.ts. Delete along with the rest of contentMigrations/ once every
// real file has been confirmed upgraded (Phase 2 of remove-vendor-categories-implementation-plan.md).

import type { Database } from "bun:sqlite";
import { getMetaValue } from "../meta";
import type { LegacyAction } from "./LegacyAction";
import { removeVendorCategories } from "./0001_removeVendorCategories";

/**
 * The highest content_version this build knows about. A file whose stored content_version exceeds this was
 * upgraded by a newer app version and must not be opened -- mirrors migrations/runMigrations.ts's
 * latestKnownVersion, but for domain-event *content* rather than SQL DDL (see action-log.md's DDL-migrations
 * section for why the two are separate axes).
 */
export const CURRENT_CONTENT_VERSION = 2;

/** Reads a database's content_version, defaulting to 1 (the implicit baseline for every file that predates
 * this concept -- a missing key, not an error). */
export function readContentVersion(db: Database): number {
    const value = getMetaValue(db, "content_version");
    return value === null ? 1 : parseInt(value, 10);
}

/** Every registered content-migration step, oldest first. A future addition just appends another transform
 * here -- nothing else in this file (or in upgradeFileContent.ts) needs to change. */
const transforms: Array<(action: LegacyAction) => LegacyAction | null> = [removeVendorCategories];

/**
 * Applies every registered transform to one action, in order, short-circuiting once any step drops it.
 *
 * Deliberately applies the *entire* chain unconditionally rather than gating each step by "does this file's
 * starting content_version need this particular step" -- with a chain of idempotent, drop-or-strip-if-present
 * transforms (see each step's own doc comment), running a step against already-migrated data is always a
 * harmless no-op. That sidesteps needing per-step version-range bookkeeping for what is, in practice, always
 * a single hop straight to CURRENT_CONTENT_VERSION.
 */
export function applyContentMigrations(action: LegacyAction): LegacyAction | null {
    let current: LegacyAction | null = action;
    for (const transform of transforms) {
        if (current === null) return null;
        current = transform(current);
    }
    return current;
}
