import {describe, expect, it} from 'bun:test'
import {type Account} from "$shared/domain/accounts/Account";
import {AccountSqlService} from "../../../src/sqlservices/accounts/AccountSqlSvc";
import {genAcctId} from "$shared/domain/accounts/AcctId";
import {ChecquerySqlDb} from "../../../src/sqldb/ChecquerySqlDb";
import {runChecqueryDdl} from "../../../src/sqldb/checqueryDdl";

describe('Account SQL Services', () => {
    it('Should create, find, update, and delete an account', async () => {
        const db = new ChecquerySqlDb()
        runChecqueryDdl(db)
        const svc = new AccountSqlService(db)
        const id = genAcctId()
        const acct0 : Account = {
            id: id,
            name: "Sample",
            acctNumber: "123-456",
            acctType: "ASSET",
            summary: "An example account",
        }

        await svc.createAccount(acct0)

        const acct2 = await svc.findAccountById(id)

        expect(acct2).toMatchObject(acct0)

        const acct3 = await svc.updateAccount({
            id,
            name: "Zample"
        })

        expect(acct3).toMatchObject({
            ...acct0,
            name: "Zample"
        })

        const accts = await svc.findAccountsAll()

        expect(accts).toContainValue(acct3!)

        await svc.deleteAccount(id)

        const acct4 = await svc.findAccountById(id)

        expect(acct4).toBeNull()
    })

})