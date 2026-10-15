import type { Database } from "bun:sqlite";

export function up(db: Database): void {
    db.run(`CREATE TABLE _checquery_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
}
