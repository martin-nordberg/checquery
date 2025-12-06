import {Database, Statement, type Changes} from 'bun:sqlite';


export class ChecquerySqlDb {

    readonly db

    /** Cached prepared queries. */
    readonly queriesByKey: Map<string,Statement>

    constructor() {
        this.db = new Database(':memory:')
        this.queriesByKey = new Map()

        this.#initDdl()
    }

    all(queryKey: string, sql: () => string, bindings: any) {
        let query = this.#prepareQuery(queryKey, sql)
        return query.all(bindings)
    }

    get(queryKey: string, sql: () => string, bindings: any) {
        let query = this.#prepareQuery(queryKey, sql)
        return query.get(bindings)
    }

    run(queryKey: string, sql: () => string, bindings: any): Changes {
        let query = this.#prepareQuery(queryKey, sql)
        return query.run(bindings)
    }

    #initDdl() {
        let query = this.db.query(
            `CREATE TABLE Account
             (
                 id          TEXT(28) NOT NULL,
                 name        TEXT(100) UNIQUE NOT NULL,
                 acctNumber  TEXT(50) UNIQUE NOT NULL,
                 summary     TEXT(200),
                 CONSTRAINT Account_PK PRIMARY KEY (id)
             );`
        )
        query.run()
    }

    #prepareQuery(queryKey: string, sql: () => string) {
        let query = this.queriesByKey.get(queryKey)
        if (!query) {
            query = this.db.query(sql())
            this.queriesByKey.set(queryKey, query)
        }
        return query
    }

}

