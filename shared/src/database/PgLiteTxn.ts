import {type Transaction} from "@electric-sql/pglite";
import {z, ZodReadonly, ZodType} from "zod";
import type {HLClock} from "$shared/domain/core/HybridLogicalClock";


/**
 * Wrapper around the PGLite API for transactions. Adds a hybrid logical clock. Uses Zod for
 * returning fully typesafe result sets.
 */
export class PgLiteTxn {

    readonly hlc: HLClock
    #txn: Transaction

    constructor(txn: Transaction, hlc: HLClock) {
        this.#txn = txn
        this.hlc = hlc
    }

    /** Executes an optionally parameterized SQL query with no result needed. */
    async exec(sql: string, params?: any[]) {
        const result = await this.#txn.query(sql.replaceAll(/\$hlc/g, `'${this.hlc}'`), params)
        return result.affectedRows
    }

    /** Finds one record and parses it with the given Zod schema. */
    async findOne<T extends ZodType>(sql: string, params: any[], schema: ZodReadonly<T>) {
        const qryResult = await this.#txn.query(sql, params)

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
        const qryResult = await this.#txn.query(sql, params)

        const result: z.infer<typeof schema>[] = []
        for (let row of qryResult.rows) {
            result.push(schema.parse(dropNullFields(row)))
        }
        return result
    }

}

/** Removes all null fields from an object, leaving them undefined instead. */
function dropNullFields(rec: any) {
    if (rec == null) {
        return null
    }

    return Object.fromEntries(Object.entries(rec).filter(([_, v]) => (typeof v !== 'undefined') && (v !== null)))
}