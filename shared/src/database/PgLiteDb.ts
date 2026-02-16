import {PGlite} from "@electric-sql/pglite";
import {live, type LiveNamespace} from "@electric-sql/pglite/live";
import {z, ZodReadonly, ZodType} from "zod";


/**
 * Wrapper around the PGLite API.
 */
export class PgLiteDb {

    #db: PGlite & { live: LiveNamespace }

    constructor(db: PGlite & { live: LiveNamespace }) {
        this.#db = db
    }

    /** Executes an optionally parameterized SQL query with no result needed. */
    async exec(sql: string, params?: any[]) {
        const result = await this.#db.query(sql, params)
        return result.affectedRows
    }

    /** Finds one record and parses it with the given Zod schema. */
    async findOne<T extends ZodType>(sql: string, params: any[], schema: ZodReadonly<T>) {
        const qryResult = await this.#db.query(sql, params)

        if (qryResult.rows.length == 0) {
            return null
        }
        if (qryResult.rows.length > 1) {
            throw new Error("Expected a single result row.")
        }

        return schema.parse(dropNullFields(qryResult.rows[0]))
    }

    /** Finds many records and parses them with the given Zod schema. */
    async findMany<T extends ZodType>(sql: string, params: any[], schema: ZodReadonly<T>) {
        const qryResult = await this.#db.query(sql, params)

        const result: z.infer<typeof schema>[] = []
        for (let row of qryResult.rows) {
            result.push(schema.parse(dropNullFields(row)))
        }
        return result
    }

}


export async function createPgLiteDb() {
    const db = await PGlite.create({
            extensions: {
                live
            }
        }
    )

    return new PgLiteDb(db)
}


/** Removes all null fields from an object, leaving them undefined instead. */
function dropNullFields(rec: any)  {
    if (rec == null) {
        return null
    }

    return Object.fromEntries(Object.entries(rec).filter(([_, v]) => (typeof v !== 'undefined') && (v !== null)))
}