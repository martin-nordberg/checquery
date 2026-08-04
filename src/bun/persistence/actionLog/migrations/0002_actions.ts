import type { Database } from "bun:sqlite";
import { ACTION_TYPES } from "../../../../shared/domain/actions/ActionType";

export function up(db: Database): void {
    const actionTypeList = ACTION_TYPES.map((t) => `'${t}'`).join(', ')
    db.run(`
        CREATE TABLE actions (
            id                TEXT PRIMARY KEY,
            action_type       TEXT NOT NULL CHECK (action_type IN (${actionTypeList})),
            hlc               TEXT NOT NULL,
            iv                TEXT NOT NULL,
            encrypted_payload TEXT NOT NULL
        )
    `)
    db.run(`CREATE UNIQUE INDEX actions_hlc_idx ON actions (hlc)`)

    // Lookup tables: one per entity, mapping an action back to the single entity it directly acted on (not
    // populated by any other entity's actions -- see documentation/action-log-changes.md §2/§4).
    db.run(`
        CREATE TABLE account_actions (
            actn_id TEXT PRIMARY KEY REFERENCES actions (id),
            acct_id TEXT NOT NULL
        )
    `)
    db.run(`CREATE INDEX account_actions_acct_id_idx ON account_actions (acct_id)`)

    db.run(`
        CREATE TABLE account_category_actions (
            actn_id     TEXT PRIMARY KEY REFERENCES actions (id),
            acct_ctg_id TEXT NOT NULL
        )
    `)
    db.run(`CREATE INDEX account_category_actions_acct_ctg_id_idx ON account_category_actions (acct_ctg_id)`)

    db.run(`
        CREATE TABLE vendor_actions (
            actn_id TEXT PRIMARY KEY REFERENCES actions (id),
            vndr_id TEXT NOT NULL
        )
    `)
    db.run(`CREATE INDEX vendor_actions_vndr_id_idx ON vendor_actions (vndr_id)`)

    db.run(`
        CREATE TABLE vendor_category_actions (
            actn_id     TEXT PRIMARY KEY REFERENCES actions (id),
            vndr_ctg_id TEXT NOT NULL
        )
    `)
    db.run(`CREATE INDEX vendor_category_actions_vndr_ctg_id_idx ON vendor_category_actions (vndr_ctg_id)`)

    db.run(`
        CREATE TABLE transaction_actions (
            actn_id TEXT PRIMARY KEY REFERENCES actions (id),
            txn_id  TEXT NOT NULL
        )
    `)
    db.run(`CREATE INDEX transaction_actions_txn_id_idx ON transaction_actions (txn_id)`)

    db.run(`
        CREATE TABLE balance_assertion_actions (
            actn_id TEXT PRIMARY KEY REFERENCES actions (id),
            asrt_id TEXT NOT NULL
        )
    `)
    db.run(`CREATE INDEX balance_assertion_actions_asrt_id_idx ON balance_assertion_actions (asrt_id)`)

    db.run(`
        CREATE TABLE origin_actions (
            actn_id TEXT PRIMARY KEY REFERENCES actions (id),
            orig_id TEXT NOT NULL
        )
    `)
    db.run(`CREATE INDEX origin_actions_orig_id_idx ON origin_actions (orig_id)`)
}
