import type { Database } from "bun:sqlite";
import { getMetaValue, metaTableExists, setMetaValue } from "../meta";
import { up as up0001 } from "./0001_meta";
import { up as up0002 } from "./0002_actions";

type Migration = { version: number; up: (db: Database) => void }

const migrations: Migration[] = [
    { version: 1, up: up0001 },
    { version: 2, up: up0002 },
]

/** The highest schema_version this build knows how to run migrations up to. A file whose stored
 * schema_version exceeds this was created by a newer app version and must not be opened. */
export const latestKnownVersion: number = migrations[migrations.length - 1]!.version

/** Reads the database's current schema_version, or 0 if _checquery_meta doesn't exist yet or has no such key. */
export function readSchemaVersion(db: Database): number {
    if (!metaTableExists(db)) return 0
    const value = getMetaValue(db, 'schema_version')
    return value === null ? 0 : parseInt(value, 10)
}

/**
 * Runs every migration numbered higher than the database's current schema_version, in order, each inside its
 * own transaction, updating schema_version after each one commits. Idempotent: calling it again with nothing
 * pending is a no-op. If a migration throws, the database is left at its last successfully-applied version.
 */
export function runMigrations(db: Database): void {
    const currentVersion = readSchemaVersion(db)
    for (const migration of migrations) {
        if (migration.version > currentVersion) {
            db.transaction(() => {
                migration.up(db)
                setMetaValue(db, 'schema_version', migration.version.toString())
            })()
        }
    }
}
