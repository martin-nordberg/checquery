import type { Database } from "bun:sqlite";

/**
 * Creates every table this store needs, in a fresh :memory: database. There is no migration system here (see
 * documentation/materialized-store.md §3): a MaterializedStore is rebuilt from nothing every time it's
 * constructed, so there is never old data to evolve in place -- just one fixed schema, always.
 */
export function createSchema(db: Database): void {
    db.run(`
        CREATE TABLE accounts (
            id          TEXT PRIMARY KEY,
            orig_id     TEXT NOT NULL,
            parent_id   TEXT REFERENCES accounts (id),
            acct_type   TEXT NOT NULL,
            name        TEXT NOT NULL,
            description TEXT NOT NULL,
            is_primary  INTEGER NOT NULL,
            is_deleted  INTEGER NOT NULL DEFAULT 0
        )
    `)
    db.run(`CREATE INDEX accounts_parent_id_idx ON accounts (parent_id)`)

    db.run(`
        CREATE TABLE vendors (
            id              TEXT PRIMARY KEY,
            orig_id         TEXT NOT NULL,
            name            TEXT NOT NULL,
            description     TEXT NOT NULL,
            default_acct_id TEXT REFERENCES accounts (id),
            is_active       INTEGER NOT NULL,
            is_deleted      INTEGER NOT NULL DEFAULT 0
        )
    `)

    db.run(`
        CREATE TABLE transactions (
            id           TEXT PRIMARY KEY,
            orig_id      TEXT NOT NULL,
            post_date    TEXT NOT NULL,
            cleared_date TEXT,
            code         TEXT NOT NULL,
            vndr_id      TEXT REFERENCES vendors (id),
            description  TEXT NOT NULL,
            needs_review INTEGER NOT NULL,
            is_deleted   INTEGER NOT NULL DEFAULT 0
        )
    `)
    db.run(`CREATE INDEX transactions_post_date_idx ON transactions (post_date)`)
    db.run(`CREATE INDEX transactions_vndr_id_idx ON transactions (vndr_id)`)

    db.run(`
        CREATE TABLE entries (
            id             INTEGER PRIMARY KEY,
            transaction_id TEXT NOT NULL REFERENCES transactions (id),
            ordinal        INTEGER NOT NULL,
            acct_id        TEXT NOT NULL REFERENCES accounts (id),
            debit_cents    INTEGER NOT NULL,
            credit_cents   INTEGER NOT NULL
        )
    `)
    db.run(`CREATE INDEX entries_transaction_id_idx ON entries (transaction_id)`)
    db.run(`CREATE INDEX entries_acct_id_idx ON entries (acct_id)`)

    db.run(`
        CREATE TABLE balance_assertions (
            id            TEXT PRIMARY KEY,
            orig_id       TEXT NOT NULL,
            acct_id        TEXT NOT NULL REFERENCES accounts (id),
            assertion_date TEXT NOT NULL,
            balance_cents  INTEGER NOT NULL,
            is_deleted     INTEGER NOT NULL DEFAULT 0
        )
    `)
    db.run(`CREATE INDEX balance_assertions_acct_id_idx ON balance_assertions (acct_id)`)

    db.run(`
        CREATE TABLE origins (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            ip_address TEXT NOT NULL
        )
    `)
}
