import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { createSchema } from './schema'

function tableNames(db: Database): string[] {
    return (db.query(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as { name: string }[])
        .map((row) => row.name)
}

function columnNames(db: Database, table: string): string[] {
    return (db.query(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((row) => row.name)
}

function indexNames(db: Database): string[] {
    return (db.query(`SELECT name FROM sqlite_master WHERE type = 'index'`).all() as { name: string }[])
        .map((row) => row.name)
        .filter((name) => !name.startsWith('sqlite_autoindex_'))
}

describe('createSchema', () => {
    it('creates all six tables', () => {
        const db = new Database(':memory:')
        createSchema(db)
        expect(tableNames(db).sort()).toEqual(
            ['accounts', 'balance_assertions', 'entries', 'origins', 'transactions', 'vendors'].sort(),
        )
    })

    it('creates accounts with the expected columns', () => {
        const db = new Database(':memory:')
        createSchema(db)
        expect(columnNames(db, 'accounts')).toEqual([
            'id', 'orig_id', 'parent_id', 'acct_type', 'name', 'description', 'is_primary', 'is_deleted',
        ])
    })

    it('creates vendors with the expected columns', () => {
        const db = new Database(':memory:')
        createSchema(db)
        expect(columnNames(db, 'vendors')).toEqual([
            'id', 'orig_id', 'name', 'description', 'default_acct_id', 'is_active', 'is_deleted',
        ])
    })

    it('creates transactions with the expected columns', () => {
        const db = new Database(':memory:')
        createSchema(db)
        expect(columnNames(db, 'transactions')).toEqual([
            'id', 'orig_id', 'post_date', 'cleared_date', 'code', 'vndr_id', 'description', 'needs_review', 'is_deleted',
        ])
    })

    it('creates entries with the expected columns', () => {
        const db = new Database(':memory:')
        createSchema(db)
        expect(columnNames(db, 'entries')).toEqual([
            'id', 'transaction_id', 'ordinal', 'acct_id', 'debit_cents', 'credit_cents',
        ])
    })

    it('creates balance_assertions with the expected columns', () => {
        const db = new Database(':memory:')
        createSchema(db)
        expect(columnNames(db, 'balance_assertions')).toEqual([
            'id', 'orig_id', 'acct_id', 'cleared_date', 'balance_cents', 'is_deleted',
        ])
    })

    it('creates origins with the expected columns (no orig_id, no is_deleted)', () => {
        const db = new Database(':memory:')
        createSchema(db)
        expect(columnNames(db, 'origins')).toEqual(['id', 'name', 'ip_address'])
    })

    it('creates the expected indexes', () => {
        const db = new Database(':memory:')
        createSchema(db)
        expect(indexNames(db).sort()).toEqual(
            [
                'accounts_parent_id_idx',
                'transactions_post_date_idx',
                'transactions_vndr_id_idx',
                'entries_transaction_id_idx',
                'entries_acct_id_idx',
                'balance_assertions_acct_id_idx',
            ].sort(),
        )
    })

    it('rejects a duplicate primary key on accounts', () => {
        const db = new Database(':memory:')
        createSchema(db)
        db.run(`INSERT INTO accounts (id, orig_id, acct_type, name, description, is_primary) VALUES ('a', 'o', 'ASSET', 'n', '', 0)`)
        expect(() =>
            db.run(`INSERT INTO accounts (id, orig_id, acct_type, name, description, is_primary) VALUES ('a', 'o', 'ASSET', 'n', '', 0)`),
        ).toThrow()
    })
})
