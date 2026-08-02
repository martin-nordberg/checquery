import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { latestKnownVersion, readSchemaVersion, runMigrations } from './runMigrations'

function tableNames(db: Database): string[] {
    return (db.query(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as { name: string }[])
        .map((row) => row.name)
}

function columnNames(db: Database, table: string): string[] {
    return (db.query(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((row) => row.name)
}

describe('readSchemaVersion', () => {
    it('is 0 for a completely empty database', () => {
        const db = new Database(':memory:')
        expect(readSchemaVersion(db)).toBe(0)
    })
})

describe('runMigrations', () => {
    it('brings a fresh database to the latest schema_version', () => {
        const db = new Database(':memory:')
        runMigrations(db)
        expect(readSchemaVersion(db)).toBe(latestKnownVersion)
    })

    it('creates _checquery_meta and actions', () => {
        const db = new Database(':memory:')
        runMigrations(db)
        const names = tableNames(db)
        expect(names).toContain('_checquery_meta')
        expect(names).toContain('actions')
    })

    it('creates actions with the expected columns', () => {
        const db = new Database(':memory:')
        runMigrations(db)
        const columns = columnNames(db, 'actions')
        expect(columns).toEqual(['id', 'action_type', 'hlc', 'iv', 'encrypted_payload'])
    })

    it('rejects an action_type outside the known vocabulary', () => {
        const db = new Database(':memory:')
        runMigrations(db)
        expect(() =>
            db.run(`INSERT INTO actions (action_type, hlc, iv, encrypted_payload) VALUES (?, ?, ?, ?)`, [
                'not-a-real-action', '0000000000000000', 'iv', 'payload',
            ]),
        ).toThrow()
    })

    it('enforces a unique hlc', () => {
        const db = new Database(':memory:')
        runMigrations(db)
        db.run(`INSERT INTO actions (action_type, hlc, iv, encrypted_payload) VALUES (?, ?, ?, ?)`, [
            'create-origin', '0000000000000001', 'iv', 'payload',
        ])
        expect(() =>
            db.run(`INSERT INTO actions (action_type, hlc, iv, encrypted_payload) VALUES (?, ?, ?, ?)`, [
                'create-origin', '0000000000000001', 'iv2', 'payload2',
            ]),
        ).toThrow()
    })

    it('is idempotent: calling it again is a no-op', () => {
        const db = new Database(':memory:')
        runMigrations(db)
        expect(() => runMigrations(db)).not.toThrow()
        expect(readSchemaVersion(db)).toBe(latestKnownVersion)
    })

    it('leaves an unrelated pre-existing schema_version key alone as the migration checkpoint', () => {
        // A file at an already-known version shouldn't re-run migrations below it.
        const db = new Database(':memory:')
        runMigrations(db)
        db.run(`INSERT INTO _checquery_meta (key, value) VALUES ('unrelated', 'x')`)
        runMigrations(db)
        const row = db.query(`SELECT value FROM _checquery_meta WHERE key = 'unrelated'`).get() as { value: string }
        expect(row.value).toBe('x')
    })
})
