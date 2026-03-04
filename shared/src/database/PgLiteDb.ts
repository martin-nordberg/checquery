import {PGlite} from "@electric-sql/pglite";
import {live, type LiveNamespace} from "@electric-sql/pglite/live";
import {PgLiteTxn} from "$shared/database/PgLiteTxn";
import {advanceHLClock, getHLClock, type HLClock, mergeHLClock} from "$shared/domain/core/HybridLogicalClock";


/**
 * Wrapper around the PGLite API. Forces everything into transactions or live queries.
 * Adds a hybrid logical clock for use in transactions.
 */
export class PgLiteDb {

    #db: PGlite & { live: LiveNamespace }

    #hlc: HLClock

    constructor(db: PGlite & { live: LiveNamespace }, nodeId: string) {
        this.#db = db
        this.#hlc = getHLClock(nodeId)
    }

    async close() {
        await this.#db.close()
    }

    async transaction<T>(callback: (txn: PgLiteTxn) => Promise<T>): Promise<T> {
        this.#hlc = advanceHLClock(this.#hlc)
        return this.#db.transaction((tx) => callback(new PgLiteTxn(tx, this.#hlc)))
    }

    async transactionx<T>(externalHlc: HLClock|undefined, callback: (txn: PgLiteTxn) => Promise<T>): Promise<T> {
        if (externalHlc) {
            this.#hlc = mergeHLClock(this.#hlc, externalHlc)
            return this.#db.transaction((tx) => callback(new PgLiteTxn(tx, externalHlc)))
        }

        return this.transaction(callback)
    }

}

/** Constructs a new PGLite database with given node ID for clock purposes. */
export async function createPgLiteDb(nodeId: string) {
    const db = await PGlite.create({
            extensions: {
                live
            }
        }
    )

    return new PgLiteDb(db, nodeId)
}
