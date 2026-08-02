import type { Database } from "bun:sqlite";
import { ACTION_TYPES } from "../ActionType";

export function up(db: Database): void {
    const actionTypeList = ACTION_TYPES.map((t) => `'${t}'`).join(', ')
    db.run(`
        CREATE TABLE actions (
            id                INTEGER PRIMARY KEY,
            action_type       TEXT NOT NULL CHECK (action_type IN (${actionTypeList})),
            hlc               TEXT NOT NULL,
            iv                TEXT NOT NULL,
            encrypted_payload TEXT NOT NULL
        )
    `)
    db.run(`CREATE UNIQUE INDEX actions_hlc_idx ON actions (hlc)`)
}
