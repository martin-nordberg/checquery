import {Database, Statement, type Changes} from 'bun:sqlite';
import {acctTypeCodes, acctTypeText} from "$shared/domain/core/AcctType";


export class ChecquerySqlDb {

    readonly db

    /** Cached prepared queries. */
    readonly queriesByKey: Map<string,Statement>

    constructor() {
        this.db = new Database(':memory:')
        this.db.exec("PRAGMA foreign_keys = ON;")

        this.queriesByKey = new Map()

        this.#initDdl()
    }

    all(queryKey: string, sql: () => string, bindings: any) {
        let query = this.#prepareQuery(queryKey, sql)
        console.log({queryKey, bindings})
        return query.all(bindings)
    }

    get(queryKey: string, sql: () => string, bindings: any) {
        let query = this.#prepareQuery(queryKey, sql)
        console.log({queryKey, bindings})
        return query.get(bindings)
    }

    run(queryKey: string, sql: () => string, bindings: any): Changes {
        let query = this.#prepareQuery(queryKey, sql)
        console.log({queryKey, bindings})
        return query.run(bindings)
    }

    #initDdl() {
        let query = this.db.query(
            `CREATE TABLE AcctType
             (
                 code       TEXT(30) NOT NULL,
                 text       TEXT(100),
                 CONSTRAINT AcctType_PK PRIMARY KEY (code)
             );`
        )
        query.run()

        acctTypeCodes.forEach(code => {
            query = this.db.query(
                `INSERT INTO AcctType (code, text) VALUES ($code, $text);`,

            )
            query.run({
                $code: code,
                $text: acctTypeText(code)
            })
        })

        query = this.db.query(
            `CREATE TABLE Account
             (
                 id          TEXT(28) NOT NULL,
                 name        TEXT(100) UNIQUE NOT NULL,
                 acctNumber  TEXT(50) UNIQUE NOT NULL,
                 acctType    TEXT(30) NOT NULL REFERENCES AcctType(code),
                 summary     TEXT(200),
                 CONSTRAINT Account_PK PRIMARY KEY (id)
             );`
        )
        query.run()

    }

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

