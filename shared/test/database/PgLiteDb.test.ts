import {describe, it, expect} from 'bun:test'
import {createPgLiteDb} from "../../src/database/PgLiteDb";
import {runChecqueryPgDdl} from "../../src/database/CheckqueryPgDdl";
import {z} from "zod";

describe('PGLite Database', () => {
    it('Should initialize a Checquery database', async () => {
        const db = await createPgLiteDb()
        await runChecqueryPgDdl(db)

        const tableNames = ['Account', 'Entry', 'Statement', 'Transaxtion', 'Vendor']
        for (let tableName of tableNames) {
            const r1 = await db.findOne(`SELECT count(*) as c FROM ${tableName}`, [], z.object({c: z.number()}).readonly())
            expect(r1).toEqual({c: 0})
        }

        const r2 = await db.findMany('SELECT code FROM AcctType ORDER BY code', [], z.object({code: z.string()}).readonly())
        expect(r2.length).toEqual(5)
        expect(r2[0].code).toEqual('ASSET')
        expect(r2[1].code).toEqual('EQUITY')
        expect(r2[2].code).toEqual('EXPENSE')
        expect(r2[3].code).toEqual('INCOME')
        expect(r2[4].code).toEqual('LIABILITY')
    })
})