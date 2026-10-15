import type { Database } from "bun:sqlite";

/** True if the _checquery_meta table exists in the given database. */
export function metaTableExists(db: Database): boolean {
    const row = db
        .query(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_checquery_meta'`)
        .get()
    return row !== null
}

/** Reads a value from _checquery_meta, or null if the table or key is absent. */
export function getMetaValue(db: Database, key: string): string | null {
    if (!metaTableExists(db)) return null
    const row = db
        .query(`SELECT value FROM _checquery_meta WHERE key = ?`)
        .get(key) as { value: string } | null
    return row?.value ?? null
}

/** Reads every key/value pair from _checquery_meta, ordered by key. */
export function getAllMetaEntries(db: Database): Array<{ key: string; value: string }> {
    return db.query(`SELECT key, value FROM _checquery_meta ORDER BY key`).all() as Array<{ key: string; value: string }>
}

/** Inserts or updates a value in _checquery_meta. */
export function setMetaValue(db: Database, key: string, value: string): void {
    db.run(
        `INSERT INTO _checquery_meta (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
        [key, value],
    )
}
