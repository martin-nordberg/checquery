import {Database, Statement, type Changes} from 'bun:sqlite';
import type {z, ZodReadonly, ZodType} from "zod";

/**
 * Wrapper around Bun's SQLite API.
 */
export class ChecquerySqlDb {

    readonly db

    /** Cached prepared queries. */
    readonly queriesByKey: Map<string,Statement>

    constructor() {
        this.db = new Database(':memory:')
        this.db.run("PRAGMA foreign_keys = ON;")

        this.queriesByKey = new Map()
    }

    /** Executes a SQL query without caching a prepared statement. */
    exec(sql: string, bindings: any) {
        const query = this.db.query(sql)
        query.run(bindings)
    }

    /** Finds one record and parses it with the given Zod schema. */
    findOne<T extends ZodType>(queryKey: string, sql: () => string, bindings: any, schema: ZodReadonly<T>) {
        let query = this.#prepareQuery(queryKey, sql)
        console.log({queryKey, bindings})
        const rec = query.get(bindings)
        return rec == null ? null : schema.parse(dropNullFields(rec))
    }

    /** Finds many records and parses them with the given Zod schema. */
    findMany<T extends ZodType>(queryKey: string, sql: () => string, bindings: any, schema: ZodReadonly<T>) {
        let query = this.#prepareQuery(queryKey, sql)
        console.log({queryKey, bindings})
        const recs = query.all(bindings)

        const result: z.infer<typeof schema>[] = []
        for (let rec of recs) {
            result.push(schema.parse(dropNullFields(rec)))
        }
        return result
    }

    /** Runs a sequence of data migrations. */
    migrate(migrations: ((db: ChecquerySqlDb) => void)[]) {
        // TODO: skip already completed steps
        migrations.forEach(migrate => {
            migrate(this)
        })
    }

    /** Executes a SQL query that does not return record results. */
    run(queryKey: string, sql: () => string, bindings: any): Changes {
        let query = this.#prepareQuery(queryKey, sql)
        console.log({queryKey, bindings})
        const txn = this.db.transaction( () =>
            query.run(bindings)
        )
        try {
            return txn()
        } catch (error) {
            console.error("Transaction failed.", {error})
            throw error
        }
    }

    /** Returns a prepared query from cache or caches it first time through. */
    #prepareQuery(queryKey: string, sql: () => string) {
        let query = this.queriesByKey.get(queryKey)
        if (!query) {
            const sql0 = sql()
            console.log({queryKey, sql:sql0})
            query = this.db.query(sql0)
            this.queriesByKey.set(queryKey, query)
        }
        return query
    }

}

/** Removes all null fields from an object, leaving them undefined instead. */
const dropNullFields = (rec: any) => {
    if (rec == null) {
        return null
    }

    return Object.fromEntries(Object.entries(rec).filter(([_, v]) => (typeof v !== 'undefined') && (v !== null)))
}