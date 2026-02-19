import {describe, expect, it} from 'bun:test'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {genStmtId} from "$shared/domain/statements/StmtId";
import type {Statement} from "$shared/domain/statements/Statement";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {genAcctId} from "$shared/domain/accounts/AcctId";
import type {Account} from "$shared/domain/accounts/Account";

describe('Statement Repo', () => {
    it('Should create, find, update, and delete a statement', async () => {
        const db = await createPgLiteDb("EEF")
        await runChecqueryPgDdl(db)

        const arepo = new AccountRepo(db)

        const aid = genAcctId()
        const acct0 : Account = {
            id: aid,
            name: "Sample",
            acctNumber: "123-456",
            acctType: "ASSET",
            description: "An example account",
        }

        await arepo.createAccount(acct0)

        const repo = new StatementRepo(db)

        const id = genStmtId()
        const stmt0 : Statement = {
            id: id,
            beginDate: "2010-01-01",
            endDate: "2010-01-31",
            beginningBalance: "$23,456.78",
            endingBalance: "$23,456.79",
            isReconciled: false,
            account: "Sample",
            transactions: []
        }

        await repo.createStatement(stmt0)

        const stmt2 = await repo.findStatementById(id)

        expect(stmt2).toMatchObject(stmt0)

        const stmt3 = await repo.updateStatement({
            id,
            beginningBalance: "$12,456.78",
            endingBalance: "$12,456.79",
        })

        expect(stmt3).toMatchObject({
            ...stmt0,
            beginningBalance: "$12,456.78",
            endingBalance: "$12,456.79",
        })

        const stmts = await repo.findStatementsAll()

        expect(stmts).toContainValue(stmt3!)

        await repo.deleteStatement(id)

        const stmt5 = await repo.findStatementById(id)

        expect(stmt5).toBeNull()
    })

})